/**
 * src/services/menu.service.js
 * Menu Business Logic
 */

const menuRepository = require('../repositories/menu.repository');
const restaurantRepository = require('../repositories/restaurant.repository');
const cacheService = require('./cache.service');
const uploadService = require('./upload.service');
const ApiError = require('../utils/ApiError');
const { slugify } = require('../utils/helpers');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const logger = require('../config/logger');
const { prisma } = require('../config/database');

class MenuService {
    /**
       * Get menu for a restaurant
       * Grouped by category
       */
    async getRestaurantMenu(restaurantId, query = {}) {
        const { category, isAvailable, search } = query;

        // Try to get from cache if no filters applied other than basic ones
        const cacheKey = cacheService.generateMenuKey(restaurantId, { category, isAvailable, search });
        const cachedMenu = await cacheService.get(cacheKey);

        if (cachedMenu) {
            return cachedMenu;
        }

        const items = await menuRepository.findByRestaurant(restaurantId, {
            categoryId: category,
            isAvailable,
            search,
        });

        // Group by category
        const groupedMenu = items.reduce((acc, item) => {
            const categoryName = item.category ? item.category.name : 'Uncategorized';
            if (!acc[categoryName]) {
                acc[categoryName] = [];
            }
            acc[categoryName].push(item);
            return acc;
        }, {});

        // Cache for 30 mins
        await cacheService.set(cacheKey, groupedMenu, 1800);

        return groupedMenu;
    }

    /**
       * Get menu item by ID
       */
    async getMenuItem(id) {
        const item = await menuRepository.findById(id);
        if (!item) {
            throw new ApiError(404, 'Menu item not found');
        }
        return item;
    }

    /**
       * Create menu item
       */
    async createMenuItem(restaurantId, ownerId, data, file = null) {
        // Verify ownership
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
            throw new ApiError(404, 'Restaurant not found');
        }
        if (restaurant.ownerId !== ownerId) {
            throw new ApiError(403, 'Not authorized to add menu to this restaurant');
        }

        // Generate slug
        let slug = slugify(data.name);
        // Check for duplicate slug in the same restaurant
        const existing = await menuRepository.findBySlug(restaurantId, slug);
        if (existing) {
            slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
        }

        const menuItemData = {
            ...data,
            restaurantId,
            slug,
            price: parseFloat(data.price),
            discountedPrice: data.discountPrice ? parseFloat(data.discountPrice) : null,
            preparationTime: parseInt(data.preparationTime || 15, 10),
            isAvailable: data.isAvailable !== undefined ? data.isAvailable === 'true' || data.isAvailable === true : true,
            isVegetarian: data.isVegetarian === 'true' || data.isVegetarian === true,
            isVegan: data.isVegan === 'true' || data.isVegan === true,
            calories: data.calories ? parseInt(data.calories, 10) : null,
            spiceLevel: data.spiceLevel ? parseInt(data.spiceLevel, 10) : 0,
            sortOrder: data.sortOrder ? parseInt(data.sortOrder, 10) : 0,
            allergens: Array.isArray(data.allergens) ? data.allergens : (data.allergens ? [data.allergens] : []),
            tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
            customizations: typeof data.customizations === 'string' ? JSON.parse(data.customizations) : data.customizations,
            nutritionInfo: typeof data.nutritionInfo === 'string' ? JSON.parse(data.nutritionInfo) : data.nutritionInfo,
        };

        // Remove discountPrice if present to avoid confusion with discountedPrice
        delete menuItemData.discountPrice;

        if (file) {
            const uploadResult = await uploadService.uploadImage(file.path, `restaurants/${restaurantId}/menu`);
            menuItemData.imageUrl = uploadResult.secure_url;
        }

        const menuItem = await menuRepository.create(menuItemData);

        // Clear cache
        await cacheService.clearMenuCache(restaurantId);

        return menuItem;
    }

    /**
       * Update menu item
       */
    async updateMenuItem(id, ownerId, data, file = null) {
        const existingItem = await menuRepository.findById(id);
        if (!existingItem) {
            throw new ApiError(404, 'Menu item not found');
        }

        if (existingItem.restaurant.ownerId !== ownerId) {
            throw new ApiError(403, 'Not authorized to update this menu item');
        }

        const updateData = { ...data };

        // Handle type conversions
        if (updateData.price) { updateData.price = parseFloat(updateData.price); }
        if (updateData.discountPrice) {
            updateData.discountedPrice = parseFloat(updateData.discountPrice);
            delete updateData.discountPrice;
        }
        if (updateData.preparationTime) { updateData.preparationTime = parseInt(updateData.preparationTime, 10); }
        if (updateData.isAvailable !== undefined) { updateData.isAvailable = updateData.isAvailable === 'true' || updateData.isAvailable === true; }

        if (updateData.name && updateData.name !== existingItem.name) {
            updateData.slug = slugify(updateData.name);
            const duplicate = await menuRepository.findBySlug(existingItem.restaurantId, updateData.slug);
            if (duplicate && duplicate.id !== id) {
                updateData.slug = `${updateData.slug}-${Math.floor(Math.random() * 1000)}`;
            }
        }

        if (file) {
            // Delete old image if exists
            if (existingItem.imageUrl) {
                const publicId = uploadService.getPublicIdFromUrl(existingItem.imageUrl);
                await uploadService.deleteImage(publicId);
            }
            const uploadResult = await uploadService.uploadImage(file.path, `restaurants/${existingItem.restaurantId}/menu`);
            updateData.imageUrl = uploadResult.secure_url;
        }

        const updatedItem = await menuRepository.update(id, updateData);

        // Clear cache
        await cacheService.clearMenuCache(existingItem.restaurantId);

        return updatedItem;
    }

    /**
       * Delete menu item
       */
    async deleteMenuItem(id, ownerId) {
        const item = await menuRepository.findById(id);
        if (!item) {
            throw new ApiError(404, 'Menu item not found');
        }

        if (item.restaurant.ownerId !== ownerId) {
            throw new ApiError(403, 'Not authorized to delete this menu item');
        }

        // Check if item is in any active orders
        const isBusy = await menuRepository.isInActiveCartsOrOrders(id);
        if (isBusy) {
            throw new ApiError(400, 'Cannot delete menu item associated with active carts or orders');
        }

        // Delete image from Cloudinary
        if (item.imageUrl) {
            const publicId = uploadService.getPublicIdFromUrl(item.imageUrl);
            await uploadService.deleteImage(publicId);
        }

        await menuRepository.delete(id);

        // Clear cache
        await cacheService.clearMenuCache(item.restaurantId);

        return { message: 'Menu item deleted successfully' };
    }

    /**
       * Update availability
       */
    async updateAvailability(id, ownerId, isAvailable) {
        const item = await menuRepository.findById(id);
        if (!item) {
            throw new ApiError(404, 'Menu item not found');
        }

        if (item.restaurant.ownerId !== ownerId) {
            throw new ApiError(403, 'Not authorized');
        }

        const updated = await menuRepository.update(id, { isAvailable });

        // Clear cache
        await cacheService.clearMenuCache(item.restaurantId);

        // Notify users if becoming unavailable
        if (!isAvailable) {
            const userIds = await menuRepository.getUsersWithItemInCart(id);
            if (userIds.length > 0) {
                // Bulk create notifications
                const notifications = userIds.map((userId) => ({
                    userId,
                    type: 'SYSTEM',
                    title: 'Item Unavailable',
                    body: `The item "${item.name}" from ${item.restaurant.name} is no longer available and has been removed from your cart.`,
                    data: { menuItemId: id, restaurantId: item.restaurantId },
                }));

                await prisma.notification.createMany({ data: notifications });

                // Remove from carts
                await prisma.cartItem.deleteMany({
                    where: { menuItemId: id },
                });
            }
        }

        return { isAvailable: updated.isAvailable };
    }

    /**
       * Bulk update availability
       */
    async bulkUpdateAvailability(ownerId, { menuItemIds, isAvailable }) {
        // Verify ownership for all items
        const items = await prisma.menuItem.findMany({
            where: { id: { in: menuItemIds } },
            include: { restaurant: true },
        });

        if (items.length !== menuItemIds.length) {
            throw new ApiError(400, 'Some menu items not found');
        }

        const restaurants = new Set(items.map((item) => item.restaurantId));

        for (const item of items) {
            if (item.restaurant.ownerId !== ownerId) {
                throw new ApiError(403, `Not authorized for item ${item.name}`);
            }
        }

        const result = await menuRepository.bulkUpdateAvailability(menuItemIds, isAvailable);

        // Clear cache for all involved restaurants
        for (const rId of restaurants) {
            await cacheService.clearMenuCache(rId);
        }

        return { updated: result.count };
    }

    /**
       * Update price
       */
    async updatePrice(id, ownerId, { price, discountPrice }) {
        const item = await menuRepository.findById(id);
        if (!item) {
            throw new ApiError(404, 'Menu item not found');
        }

        if (item.restaurant.ownerId !== ownerId) {
            throw new ApiError(403, 'Not authorized');
        }

        if (discountPrice && parseFloat(discountPrice) >= parseFloat(price)) {
            throw new ApiError(400, 'Discount price must be less than regular price');
        }

        const updated = await menuRepository.update(id, {
            price: parseFloat(price),
            discountedPrice: discountPrice ? parseFloat(discountPrice) : null,
        });

        // Clear cache
        await cacheService.clearMenuCache(item.restaurantId);

        return updated;
    }

    /**
       * Import menu from CSV
       */
    async importMenu(restaurantId, ownerId, filePath) {
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
            throw new ApiError(404, 'Restaurant not found');
        }
        if (restaurant.ownerId !== ownerId) {
            throw new ApiError(403, 'Not authorized');
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
        });

        const itemsToCreate = [];
        const errors = [];

        for (const [index, record] of records.entries()) {
            try {
                // Basic validation
                if (!record.name || !record.price || !record.categoryId) {
                    errors.push({ row: index + 1, error: 'Missing required fields (name, price, categoryId)' });
                    continue;
                }

                itemsToCreate.push({
                    restaurantId,
                    name: record.name,
                    slug: `${slugify(record.name)}-${Math.floor(Math.random() * 10000)}`,
                    description: record.description || null,
                    categoryId: record.categoryId,
                    price: parseFloat(record.price),
                    discountedPrice: record.discountPrice ? parseFloat(record.discountPrice) : null,
                    preparationTime: parseInt(record.preparationTime || 15, 10),
                    isAvailable: record.isAvailable !== 'false',
                    isVegetarian: record.isVegetarian === 'true',
                    isVegan: record.isVegan === 'true',
                    spiceLevel: parseInt(record.spiceLevel || 0, 10),
                    calories: record.calories ? parseInt(record.calories, 10) : null,
                    allergens: record.allergens ? record.allergens.split(',').map((s) => s.trim()) : [],
                    tags: record.tags ? record.tags.split(',').map((s) => s.trim()) : [],
                });
            } catch (err) {
                errors.push({ row: index + 1, error: err.message });
            }
        }

        if (itemsToCreate.length > 0) {
            await menuRepository.bulkCreate(itemsToCreate);
            await cacheService.clearMenuCache(restaurantId);
        }

        // Delete temp file
        fs.unlinkSync(filePath);

        return {
            imported: itemsToCreate.length,
            errors,
        };
    }

    /**
       * Update menu item image
       */
    async updateImage(id, ownerId, file) {
        const item = await menuRepository.findById(id);
        if (!item) {
            throw new ApiError(404, 'Menu item not found');
        }

        if (item.restaurant.ownerId !== ownerId) {
            throw new ApiError(403, 'Not authorized');
        }

        // Delete old image
        if (item.imageUrl) {
            const publicId = uploadService.getPublicIdFromUrl(item.imageUrl);
            await uploadService.deleteImage(publicId);
        }

        const uploadResult = await uploadService.uploadImage(file.path, `restaurants/${item.restaurantId}/menu`);
        const updated = await menuRepository.update(id, { imageUrl: uploadResult.secure_url });

        // Clear cache
        await cacheService.clearMenuCache(item.restaurantId);

        return { imageUrl: updated.imageUrl };
    }
}

module.exports = new MenuService();
