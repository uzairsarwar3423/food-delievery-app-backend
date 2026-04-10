/**
 * src/services/restaurant.service.js
 * Restaurant Business Logic
 */

const restaurantRepository = require('../repositories/restaurant.repository');
const cacheService = require('./cache.service');
const locationService = require('./location.service');
const uploadService = require('./upload.service');
const imageService = require('./image.service');
const ApiError = require('../utils/ApiError');
const { slugify, getPaginationParams, buildPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');

const RESTAURANT_LISTING_SELECT = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  coverImageUrl: true,
  status: true,
  isOpen: true,
  isFeatured: true,
  averageRating: true,
  totalReviews: true,
  cuisineTypes: true,
  estimatedDeliveryMin: true,
  estimatedDeliveryMax: true,
  deliveryFee: true,
  minimumOrderAmount: true,
  latitude: true,
  longitude: true,
  createdAt: true,
};

class RestaurantService {
  /**
     * Get all restaurants with filters and pagination
     */
  async getRestaurants(query) {
    const {
      page,
      limit,
      search,
      category,
      ownerId,
      status,
      cuisines,
      priceRange,
      rating,
      latitude,
      longitude,
      radius = 10,
      sortBy,
      isOpen,
    } = query;

    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);

    // Build Prisma filters
    const where = {
      status: status || 'APPROVED',
    };

    // Try cache first
    const cacheKey = cacheService.generateRestaurantKey(query);
    const cached = await cacheService.get(cacheKey);
    if (cached) { return cached; }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { cuisineTypes: { hasSome: [search] } },
      ];
    }

    if (category) {
      where.menuItems = {
        some: { categoryId: category },
      };
    }

    if (cuisines) {
      const cuisineArray = Array.isArray(cuisines) ? cuisines : [cuisines];
      where.cuisineTypes = { hasSome: cuisineArray };
    }

    if (rating) {
      where.averageRating = { gte: parseFloat(rating) };
    }

    if (isOpen === true || isOpen === 'true') {
      where.isOpen = true;
    }

    if (priceRange) {
      where.priceRange = parseInt(priceRange, 10);
    }

    // Sorting
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'rating') { orderBy = { averageRating: 'desc' }; }
    if (sortBy === 'popularity') { orderBy = { totalOrders: 'desc' }; }
    if (sortBy === 'deliveryTime') { orderBy = { estimatedDeliveryMin: 'asc' }; }
    if (sortBy === 'relevance' && search) {
      orderBy = { _relevance: { fields: ['name', 'description'], search, sort: 'desc' } };
    }

    // Fetch from Repository
    const { restaurants, total } = await restaurantRepository.findMany({
      skip,
      take,
      where,
      orderBy,
      select: RESTAURANT_LISTING_SELECT,
    });

    // Distance calculation if lat/long provided
    let results = restaurants;
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);

      results = restaurants.map((r) => {
        const distance = locationService.calculateDistance(
          userLat, userLon,
          parseFloat(r.latitude), parseFloat(r.longitude),
        );
        return { ...r, distance };
      });

      // Filter by radius if requested
      if (radius) {
        results = results.filter((r) => r.distance <= parseFloat(radius));
      }

      // Re-sort by distance if requested
      if (sortBy === 'distance') {
        results.sort((a, b) => a.distance - b.distance);
      }
    }

    // Optimize images
    results = results.map((r) => ({
      ...r,
      logoUrl: imageService.getOptimizedUrl(r.logoUrl, { width: 100, height: 100 }),
      coverImageUrl: imageService.getOptimizedUrl(r.coverImageUrl, { width: 800, height: 400 }),
    }));

    const pagination = buildPaginationMeta(total, currentPage, currentLimit);
    const responseData = { restaurants: results, pagination };

    // Cache for 10 minutes
    await cacheService.set(cacheKey, responseData, 600);

    return responseData;
  }

  /**
     * Get restaurant by ID
     */
  async getRestaurantById(id, userLocation = null) {
    // Cache per restaurant ID
    const cacheKey = `restaurant:details:${id}`;
    const cached = await cacheService.get(cacheKey);
    let restaurant = cached;

    if (!restaurant) {
      restaurant = await restaurantRepository.findById(id, {
        menuItems: {
          where: { isAvailable: true },
          include: { category: true },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { customer: { select: { firstName: true, avatarUrl: true } } },
        },
      });

      if (!restaurant) {
        throw new ApiError(404, 'Restaurant not found');
      }

      // Cache for 15 minutes
      await cacheService.set(cacheKey, restaurant, 900);
    }

    // Optimize images
    const optimizedRestaurant = {
      ...restaurant,
      logoUrl: imageService.getOptimizedUrl(restaurant.logoUrl, { width: 200, height: 200 }),
      coverImageUrl: imageService.getOptimizedUrl(restaurant.coverImageUrl, { width: 1200, height: 600 }),
      menuItems: restaurant.menuItems?.map((item) => ({
        ...item,
        imageUrl: imageService.getOptimizedUrl(item.imageUrl, { width: 300, height: 300 }),
      })),
    };

    let distance = null;
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      distance = locationService.calculateDistance(
        parseFloat(userLocation.latitude),
        parseFloat(userLocation.longitude),
        parseFloat(restaurant.latitude),
        parseFloat(restaurant.longitude),
      );
    }

    return { ...optimizedRestaurant, distance };
  }

  /**
   * Get restaurant profile by owner ID
   */
  async getRestaurantProfile(ownerId) {
    const restaurant = await restaurantRepository.findByOwnerId(ownerId, {
      menuItems: {
        include: { category: true },
      },
    });

    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found for this user');
    }

    // Optimize images
    return {
      ...restaurant,
      logoUrl: imageService.getOptimizedUrl(restaurant.logoUrl, { width: 200, height: 200 }),
      coverImageUrl: imageService.getOptimizedUrl(restaurant.coverImageUrl, { width: 1200, height: 600 }),
    };
  }

  /**
     * Get nearby restaurants
     */
  async getNearbyRestaurants(lat, lon, radius = 5) {
    // We'll use the repository's raw query if available, or fetch all approved and filter
    // For now, let's use the repository method
    try {
      const restaurants = await restaurantRepository.findNearbyRaw(
        parseFloat(lat),
        parseFloat(lon),
        parseFloat(radius),
      );
      return restaurants;
    } catch (err) {
      logger.error('Error fetching nearby restaurants raw:', err);
      // Fallback: fetch all and filter in JS
      const { restaurants } = await restaurantRepository.findMany({
        where: { status: 'APPROVED' },
        take: 100,
      });

      return restaurants
        .map((r) => ({
          ...r,
          distance: locationService.calculateDistance(
            parseFloat(lat), parseFloat(lon),
            parseFloat(r.latitude), parseFloat(r.longitude),
          ),
        }))
        .filter((r) => r.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }
  }

  /**
     * Get featured restaurants
     */
  async getFeaturedRestaurants() {
    const cacheKey = 'restaurants:featured';
    const cached = await cacheService.get(cacheKey);
    if (cached) { return cached; }

    const { restaurants } = await restaurantRepository.findMany({
      where: {
        isFeatured: true,
        status: 'APPROVED',
      },
      orderBy: { averageRating: 'desc' },
      take: 10,
      include: {
        select: RESTAURANT_LISTING_SELECT,
      },
    });

    // Cache for 30 minutes
    await cacheService.set(cacheKey, restaurants, 1800);

    // Optimize images
    const optimized = restaurants.map((r) => ({
      ...r,
      logoUrl: imageService.getOptimizedUrl(r.logoUrl, { width: 150, height: 150 }),
      coverImageUrl: imageService.getOptimizedUrl(r.coverImageUrl, { width: 600, height: 300 }),
    }));

    return optimized;
  }

  /**
     * Create restaurant
     */
  async createRestaurant(ownerId, restaurantData, files = {}) {
    const { name } = restaurantData;

    // Generate slug
    let slug = slugify(name);
    // Check if slug exists
    const existing = await restaurantRepository.findBySlug(slug);
    if (existing) {
      slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    const data = {
      ...restaurantData,
      ownerId,
      slug,
      status: 'PENDING_APPROVAL',
      isOpen: false,
      isFeatured: false,
      // Convert coordinates
      latitude: parseFloat(restaurantData.latitude),
      longitude: parseFloat(restaurantData.longitude),
      deliveryRadius: parseFloat(restaurantData.deliveryRadius || 10),
      minimumOrderAmount: parseFloat(restaurantData.minimumOrderAmount || 0),
      deliveryFee: parseFloat(restaurantData.deliveryFee || 0),
      estimatedDeliveryMin: parseInt(restaurantData.estimatedDeliveryMin || 30, 10),
      estimatedDeliveryMax: parseInt(restaurantData.estimatedDeliveryMax || 60, 10),
      priceRange: parseInt(restaurantData.priceRange || 1, 10),
      cuisineTypes: Array.isArray(restaurantData.cuisineTypes)
        ? restaurantData.cuisineTypes
        : (restaurantData.cuisineTypes ? [restaurantData.cuisineTypes] : []),
    };

    // Handle logo/banner uploads
    if (files.logo) {
      const result = await uploadService.uploadImage(files.logo[0].path, 'restaurants/logos');
      data.logoUrl = result.secure_url;
    } else if (data.logo && typeof data.logo === 'string') {
      if (data.logo.startsWith('data:image')) {
        const result = await uploadService.uploadImage(data.logo, 'restaurants/logos');
        data.logoUrl = result.secure_url;
      } else if (data.logo.startsWith('http')) {
        data.logoUrl = data.logo;
      }
    }

    if (files.banner) {
      const result = await uploadService.uploadImage(files.banner[0].path, 'restaurants/banners');
      data.coverImageUrl = result.secure_url;
    } else if (data.banner && typeof data.banner === 'string') {
      if (data.banner.startsWith('data:image')) {
        const result = await uploadService.uploadImage(data.banner, 'restaurants/banners');
        data.coverImageUrl = result.secure_url;
      } else if (data.banner.startsWith('http')) {
        data.coverImageUrl = data.banner;
      }
    }

    delete data.logo;
    delete data.banner;

    const restaurant = await restaurantRepository.create(data);

    // Invalidate cache
    await cacheService.clearRestaurantCache();

    // TODO: Send notification to admin (logic would go here)
    logger.info(`New restaurant created: ${restaurant.id}, pending approval`);

    return restaurant;
  }

  /**
     * Update restaurant
     */
  async updateRestaurant(id, ownerId, updateData, files = {}, isAdmin = false) {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    // Authorization check
    if (!isAdmin && restaurant.ownerId !== ownerId) {
      throw new ApiError(403, 'Not authorized to update this restaurant');
    }

    const data = { ...updateData };

    // Handle base64 images or String URLs passed in req.body.
    // If frontend sends JSON with data URIs instead of FormData, process them.
    if (!files.logo && data.logo && typeof data.logo === 'string') {
      if (data.logo.startsWith('data:image')) {
        const result = await uploadService.uploadImage(data.logo, 'restaurants/logos');
        data.logoUrl = result.secure_url;
      } else if (data.logo.startsWith('http')) {
        data.logoUrl = data.logo;
      }
    }

    if (!files.banner && data.banner && typeof data.banner === 'string') {
      if (data.banner.startsWith('data:image')) {
        const result = await uploadService.uploadImage(data.banner, 'restaurants/banners');
        data.coverImageUrl = result.secure_url;
      } else if (data.banner.startsWith('http')) {
        data.coverImageUrl = data.banner;
      }
    }

    // Strip frontend-only file descriptor fields — Prisma has no `logo`/`banner` columns.
    // Actual file uploads are handled below via `files` (multer). If the frontend sends
    // logo/banner as objects (e.g. { path, relativePath }), they must be removed here to
    // prevent an invalid Prisma invocation error.
    delete data.logo;
    delete data.banner;

    // Type conversions if present
    if (data.latitude) { data.latitude = parseFloat(data.latitude); }
    if (data.longitude) { data.longitude = parseFloat(data.longitude); }
    if (data.deliveryRadius) { data.deliveryRadius = parseFloat(data.deliveryRadius); }
    if (data.minimumOrderAmount) { data.minimumOrderAmount = parseFloat(data.minimumOrderAmount); }
    if (data.deliveryFee) { data.deliveryFee = parseFloat(data.deliveryFee); }
    if (data.estimatedDeliveryMin) { data.estimatedDeliveryMin = parseInt(data.estimatedDeliveryMin, 10); }
    if (data.estimatedDeliveryMax) { data.estimatedDeliveryMax = parseInt(data.estimatedDeliveryMax, 10); }
    if (data.priceRange) { data.priceRange = parseInt(data.priceRange, 10); }

    if (data.cuisineTypes) {
      if (!Array.isArray(data.cuisineTypes)) {
        data.cuisineTypes = [data.cuisineTypes];
      }
      // Flatten to prevent nesting and filter empty values
      data.cuisineTypes = [...new Set(data.cuisineTypes.flat(Infinity).filter(Boolean).map(t => String(t).trim()))];
    }

    // Handle logo/banner updates
    if (files.logo) {
      // Delete old logo if exists
      if (restaurant.logoUrl) {
        try {
          const publicId = uploadService.getPublicIdFromUrl(restaurant.logoUrl);
          await uploadService.deleteImage(publicId);
        } catch (err) {
          logger.error('Error deleting old logo from Cloudinary:', err);
        }
      }
      const result = await uploadService.uploadImage(files.logo[0].path, 'restaurants/logos');
      data.logoUrl = result.secure_url;
    }

    if (files.banner) {
      // Delete old banner if exists
      if (restaurant.coverImageUrl) {
        try {
          const publicId = uploadService.getPublicIdFromUrl(restaurant.coverImageUrl);
          await uploadService.deleteImage(publicId);
        } catch (err) {
          logger.error('Error deleting old banner from Cloudinary:', err);
        }
      }
      const result = await uploadService.uploadImage(files.banner[0].path, 'restaurants/banners');
      data.coverImageUrl = result.secure_url;
    }

    const updated = await restaurantRepository.update(id, data);

    // Invalidate cache
    await cacheService.clearRestaurantCache();

    return updated;
  }

  /**
     * Update restaurant profile for owner
     */
  async updateRestaurantProfile(ownerId, updateData, files = {}) {
    const restaurant = await restaurantRepository.findByOwnerId(ownerId);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found for this user');
    }

    // Reuse updateRestaurant logic
    return this.updateRestaurant(restaurant.id, ownerId, updateData, files, false);
  }

  /**
     * Delete restaurant
     */
  async deleteRestaurant(id, ownerId, isAdmin = false) {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    if (!isAdmin && restaurant.ownerId !== ownerId) {
      throw new ApiError(403, 'Not authorized to delete this restaurant');
    }

    // Check for active orders
    const hasOrders = await restaurantRepository.hasActiveOrders(id);
    if (hasOrders) {
      throw new ApiError(400, 'Cannot delete restaurant with active orders');
    }

    // Requirement: Set isActive = false or hard delete.
    // We'll use our repository delete (which sets status to CLOSED)
    await restaurantRepository.delete(id);

    // Invalidate cache
    await cacheService.clearRestaurantCache();

    return { message: 'Restaurant deleted successfully' };
  }

  /**
     * Toggle restaurant status (open/closed)
     */
  async updateStatus(id, ownerId, isOpen) {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    if (restaurant.ownerId !== ownerId) {
      throw new ApiError(403, 'Not authorized');
    }

    const updated = await restaurantRepository.update(id, { isOpen });

    // Invalidate cache
    await cacheService.clearRestaurantCache();

    // TODO: Emit WebSocket event

    return { isOpen: updated.isOpen };
  }

  /**
     * Add images to restaurant
     */
  async addImages(id, ownerId, files) {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    if (restaurant.ownerId !== ownerId) {
      throw new ApiError(403, 'Not authorized');
    }

    const imageUrls = [];
    for (const file of files) {
      const result = await uploadService.uploadImage(file.path, 'restaurants/gallery');
      imageUrls.push(result.secure_url);
    }

    // Update coverImages array
    const updatedCoverImages = [...(restaurant.coverImages || []), ...imageUrls];
    await restaurantRepository.update(id, { coverImages: updatedCoverImages });

    return imageUrls;
  }

  /**
     * Search restaurants
     */
  async searchRestaurants(q, filters = {}) {
    const { skip, take } = getPaginationParams(filters.page, filters.limit);

    const where = {
      status: 'APPROVED',
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { cuisineTypes: { hasSome: [q] } },
      ],
    };

    // Apply additional filters
    if (filters.category) {
      where.menuItems = { some: { categoryId: filters.category } };
    }

    const { restaurants } = await restaurantRepository.findMany({
      skip,
      take,
      where,
      orderBy: { _relevance: { fields: ['name', 'description'], search: q, sort: 'desc' } },
    }).catch(() => {
      // Fallback if full-text search _relevance is not supported/configured
      return restaurantRepository.findMany({ skip, take, where });
    });

    return restaurants;
  }
}

module.exports = new RestaurantService();
