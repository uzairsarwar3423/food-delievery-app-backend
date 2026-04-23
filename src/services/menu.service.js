/**
 * src/services/menu.service.js
 * Menu Business Logic
 */

const menuRepository = require('../repositories/menu.repository');
const restaurantRepository = require('../repositories/restaurant.repository');
const cacheService = require('./cache.service');
const uploadService = require('./upload.service');
const imageService = require('./image.service');
const ApiError = require('../utils/ApiError');
const { slugify } = require('../utils/helpers');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const logger = require('../config/logger');
const { prisma } = require('../config/database');
const { addBackgroundTask } = require('../jobs/backgroundQueue');

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

        // Group by category and optimize images
        const groupedMenu = items.reduce((acc, item) => {
            const categoryName = item.category ? item.category.name : 'Uncategorized';
            if (!acc[categoryName]) {
                acc[categoryName] = [];
            }
            // Optimize image URL
            const optimizedItem = {
                ...item,
                imageUrl: imageService.getOptimizedUrl(item.imageUrl, { width: 300, height: 300 }),
            };
            acc[categoryName].push(optimizedItem);
            return acc;
        }, {});

        // Cache for 30 mins
        await cacheService.set(cacheKey, groupedMenu, 1800);

        return groupedMenu;
    }

    /**
       * Get menu item by ID
       * Cached for 1 hour — invalidated on any update/delete/availability change.
       */
    async getMenuItem(id) {
        const cacheKey = `menu:item:${id}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const item = await menuRepository.findById(id);
        if (!item) {
            throw new ApiError(404, 'Menu item not found');
        }
        // Optimize image URL
        item.imageUrl = imageService.getOptimizedUrl(item.imageUrl, { width: 600, height: 600 });

        await cacheService.set(cacheKey, item, 3600); // 1 hour
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

        const updateData = {};

        // Mapping and casting allowed fields
        if (data.name !== undefined) {
            updateData.name = data.name;
            if (data.name !== existingItem.name) {
                updateData.slug = slugify(data.name);
                const duplicate = await menuRepository.findBySlug(existingItem.restaurantId, updateData.slug);
                if (duplicate && duplicate.id !== id) {
                    updateData.slug = `${updateData.slug}-${Math.floor(Math.random() * 1000)}`;
                }
            }
        }

        if (data.description !== undefined) updateData.description = data.description;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

        if (data.price !== undefined) updateData.price = parseFloat(data.price);
        if (data.discountPrice !== undefined) {
            updateData.discountedPrice = parseFloat(data.discountPrice);
        } else if (data.discountedPrice !== undefined) {
            updateData.discountedPrice = parseFloat(data.discountedPrice);
        }

        if (data.preparationTime !== undefined) updateData.preparationTime = parseInt(data.preparationTime, 10);
        if (data.spiceLevel !== undefined) updateData.spiceLevel = parseInt(data.spiceLevel, 10);
        if (data.calories !== undefined) updateData.calories = data.calories ? parseInt(data.calories, 10) : null;
        if (data.sortOrder !== undefined) updateData.sortOrder = parseInt(data.sortOrder, 10);

        if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable === 'true' || data.isAvailable === true;
        if (data.isVegetarian !== undefined) updateData.isVegetarian = data.isVegetarian === 'true' || data.isVegetarian === true;
        if (data.isVegan !== undefined) updateData.isVegan = data.isVegan === 'true' || data.isVegan === true;
        if (data.isGlutenFree !== undefined) updateData.isGlutenFree = data.isGlutenFree === 'true' || data.isGlutenFree === true;

        if (data.allergens !== undefined) {
            updateData.allergens = Array.isArray(data.allergens) ? data.allergens : (data.allergens ? [data.allergens] : []);
        }
        if (data.tags !== undefined) {
            updateData.tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);
        }

        if (data.customizations !== undefined) {
            updateData.customizations = typeof data.customizations === 'string' ? JSON.parse(data.customizations) : data.customizations;
        }
        if (data.nutritionInfo !== undefined) {
            updateData.nutritionInfo = typeof data.nutritionInfo === 'string' ? JSON.parse(data.nutritionInfo) : data.nutritionInfo;
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

        // Clear menu listing cache AND the specific item key
        await cacheService.clearMenuCache(item.restaurantId);
        await cacheService.del(`menu:item:${id}`);

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

        // Clear menu listing cache AND the specific item key
        await cacheService.clearMenuCache(item.restaurantId);
        await cacheService.del(`menu:item:${id}`);

        // Notify users if becoming unavailable (Offloaded to background)
        if (!isAvailable) {
            await addBackgroundTask('CLEANUP_UNAVAILABLE_ITEM', {
                menuItemId: id,
                restaurantId: item.restaurantId,
                itemName: item.name,
                restaurantName: item.restaurant.name
            });
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

        // Clear menu listing cache AND the specific item key
        await cacheService.clearMenuCache(item.restaurantId);
        await cacheService.del(`menu:item:${id}`);

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

        // Offload to background task for performance
        await addBackgroundTask('IMPORT_MENU', {
            restaurantId,
            filePath,
        });

        return {
            message: 'Import started in background. Results will be available shortly.',
            status: 'processing'
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

        // Clear menu listing cache AND the specific item key
        await cacheService.clearMenuCache(item.restaurantId);
        await cacheService.del(`menu:item:${id}`);

        return { imageUrl: updated.imageUrl };
    }
}

module.exports = new MenuService();
