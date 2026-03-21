/**
 * src/services/restaurant.service.js
 * Restaurant Business Logic
 */

const restaurantRepository = require('../repositories/restaurant.repository');
const cacheService = require('./cache.service');
const locationService = require('./location.service');
const uploadService = require('./upload.service');
const ApiError = require('../utils/ApiError');
const { slugify, getPaginationParams, buildPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');

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

    // Sorting
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'rating') {orderBy = { averageRating: 'desc' };}
    if (sortBy === 'popularity') {orderBy = { totalOrders: 'desc' };}
    if (sortBy === 'deliveryTime') {orderBy = { estimatedDeliveryMin: 'asc' };}

    // Fetch from Repository
    const { restaurants, total } = await restaurantRepository.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        owner: {
          select: { firstName: true, lastName: true },
        },
      },
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

    const pagination = buildPaginationMeta(total, currentPage, currentLimit);

    return { restaurants: results, pagination };
  }

  /**
     * Get restaurant by ID
     */
  async getRestaurantById(id, userLocation = null) {
    const restaurant = await restaurantRepository.findById(id, {
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

    let distance = null;
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      distance = locationService.calculateDistance(
        parseFloat(userLocation.latitude),
        parseFloat(userLocation.longitude),
        parseFloat(restaurant.latitude),
        parseFloat(restaurant.longitude),
      );
    }

    return { ...restaurant, distance };
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
    const { restaurants } = await restaurantRepository.findMany({
      where: {
        isFeatured: true,
        status: 'APPROVED',
      },
      orderBy: { averageRating: 'desc' },
      take: 10,
    });
    return restaurants;
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
      cuisineTypes: Array.isArray(restaurantData.cuisineTypes)
        ? restaurantData.cuisineTypes
        : (restaurantData.cuisineTypes ? [restaurantData.cuisineTypes] : []),
    };

    // Handle logo/banner uploads
    if (files.logo) {
      const result = await uploadService.uploadImage(files.logo[0].path, 'restaurants/logos');
      data.logoUrl = result.secure_url;
    }
    if (files.banner) {
      const result = await uploadService.uploadImage(files.banner[0].path, 'restaurants/banners');
      data.coverImageUrl = result.secure_url;
    }

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
  async updateRestaurant(id, ownerId, updateData, isAdmin = false) {
    const restaurant = await restaurantRepository.findById(id);
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    // Authorization check
    if (!isAdmin && restaurant.ownerId !== ownerId) {
      throw new ApiError(403, 'Not authorized to update this restaurant');
    }

    const data = { ...updateData };

    // Type conversions if present
    if (data.latitude) {data.latitude = parseFloat(data.latitude);}
    if (data.longitude) {data.longitude = parseFloat(data.longitude);}
    if (data.deliveryRadius) {data.deliveryRadius = parseFloat(data.deliveryRadius);}
    if (data.minimumOrderAmount) {data.minimumOrderAmount = parseFloat(data.minimumOrderAmount);}
    if (data.deliveryFee) {data.deliveryFee = parseFloat(data.deliveryFee);}

    const updated = await restaurantRepository.update(id, data);

    // Invalidate cache
    await cacheService.clearRestaurantCache();

    return updated;
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
