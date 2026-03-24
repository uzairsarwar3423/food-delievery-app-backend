const { prisma } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');
const logger = require('../config/logger');

class SearchService {
    /**
     * Search for restaurants with filters, sorting and pagination
     */
    async searchRestaurants(q, filters = {}, sort = 'relevance', page = 1, limit = 10) {
        const cacheKey = `search:restaurants:${q}:${JSON.stringify(filters)}:${sort}:${page}:${limit}`;
        const cachedData = await cacheGet(cacheKey);
        if (cachedData) return cachedData;

        const skip = (page - 1) * limit;
        let where = {
            status: 'APPROVED',
        };

        // Full-text search
        if (q) {
            const searchTerms = q.trim().split(/\s+/).join(' & ');
            where.OR = [
                { name: { search: searchTerms } },
                { description: { search: searchTerms } },
                { cuisineTypes: { hasSome: q.split(/\s+/) } }
            ];
        }

        // Apply filters
        if (filters.category) {
            where.menuItems = {
                some: {
                    category: {
                        name: {
                            equals: filters.category,
                            mode: 'insensitive'
                        }
                    }
                }
            };
        }

        if (filters.minRating) {
            where.averageRating = { gte: parseFloat(filters.minRating) };
        }

        if (filters.priceLevel) {
            // Assuming price level can be mapped to minimumOrderAmount or similar
            // or if we have a specific field. Let's use deliveryFee or minimumOrderAmount as proxy if needed
            // Actually let's just filter by cuisineTypes if requested
        }

        if (filters.cuisines && Array.isArray(filters.cuisines)) {
            where.cuisineTypes = { hasSome: filters.cuisines };
        }

        if (filters.isOpen !== undefined) {
            where.isOpen = filters.isOpen === 'true' || filters.isOpen === true;
        }

        // Sorting
        let orderBy = {};
        if (sort === 'rating') {
            orderBy = { averageRating: 'desc' };
        } else if (sort === 'newest') {
            orderBy = { createdAt: 'desc' };
        } else if (sort === 'delivery_fee') {
            orderBy = { deliveryFee: 'asc' };
        } else {
            // Default: relevance (handled by search) or totalOrders
            orderBy = { totalOrders: 'desc' };
        }

        const [restaurants, totalResults] = await Promise.all([
            prisma.restaurant.findMany({
                where,
                orderBy,
                skip,
                take: parseInt(limit),
                include: {
                    _count: {
                        select: { menuItems: true, reviews: true }
                    }
                }
            }),
            prisma.restaurant.count({ where })
        ]);

        const result = {
            restaurants,
            totalResults,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalResults / limit)
            }
        };

        // Cache for 10 minutes
        await cacheSet(cacheKey, result, 600);
        return result;
    }

    /**
     * Search for menu items
     */
    async searchMenuItems(q, restaurantId, filters = {}) {
        const cacheKey = `search:menu-items:${q}:${restaurantId}:${JSON.stringify(filters)}`;
        const cachedData = await cacheGet(cacheKey);
        if (cachedData) return cachedData;

        let where = {
            isAvailable: true,
        };

        if (restaurantId) {
            where.restaurantId = restaurantId;
        }

        if (q) {
            const searchTerms = q.trim().split(/\s+/).join(' & ');
            where.OR = [
                { name: { search: searchTerms } },
                { description: { search: searchTerms } },
                { tags: { hasSome: q.split(/\s+/) } }
            ];
        }

        // Apply filters
        if (filters.minPrice) {
            where.price = { gte: parseFloat(filters.minPrice) };
        }
        if (filters.maxPrice) {
            where.price = { lte: parseFloat(filters.maxPrice) };
        }
        if (filters.isVegetarian !== undefined) {
            where.isVegetarian = filters.isVegetarian === 'true' || filters.isVegetarian === true;
        }

        const menuItems = await prisma.menuItem.findMany({
            where,
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                        averageRating: true
                    }
                },
                category: true
            },
            orderBy: { totalOrders: 'desc' },
            take: 50
        });

        const result = {
            menuItems,
            totalResults: menuItems.length
        };

        // Cache for 10 minutes
        await cacheSet(cacheKey, result, 600);
        return result;
    }

    /**
     * Get search suggestions
     */
    async getSuggestions(q) {
        if (!q || q.length < 2) return { suggestions: [] };

        const cacheKey = `search:suggestions:${q}`;
        const cachedData = await cacheGet(cacheKey);
        if (cachedData) return cachedData;

        // Search in restaurants, cuisines, and menu items
        const [restaurants, menuItems] = await Promise.all([
            prisma.restaurant.findMany({
                where: {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { cuisineTypes: { hasSome: [q] } }
                    ],
                    status: 'APPROVED'
                },
                select: { name: true },
                take: 5
            }),
            prisma.menuItem.findMany({
                where: {
                    name: { contains: q, mode: 'insensitive' },
                    isAvailable: true
                },
                select: { name: true },
                take: 5
            })
        ]);

        const suggestions = [
            ...new Set([
                ...restaurants.map(r => r.name),
                ...menuItems.map(m => m.name)
            ])
        ].slice(0, 10);

        const result = { suggestions };

        // Cache for 5 minutes
        await cacheSet(cacheKey, result, 300);
        return result;
    }

    /**
     * Get popular searches and trending restaurants
     */
    async getPopularSearches() {
        const cacheKey = 'search:popular';
        const cachedData = await cacheGet(cacheKey);
        if (cachedData) return cachedData;

        // Get top 10 most frequent search terms from history
        const popularSearchesRaw = await prisma.searchHistory.groupBy({
            by: ['searchTerm'],
            _count: {
                searchTerm: true
            },
            orderBy: {
                _count: {
                    searchTerm: 'desc'
                }
            },
            take: 10
        });

        const popularSearches = popularSearchesRaw.map(s => s.searchTerm);

        // Get top 5 trending restaurants (most orders in recent time or highest rating)
        const trending = await prisma.restaurant.findMany({
            where: { status: 'APPROVED' },
            orderBy: [
                { totalOrders: 'desc' },
                { averageRating: 'desc' }
            ],
            take: 5,
            select: {
                id: true,
                name: true,
                logoUrl: true,
                averageRating: true,
                cuisineTypes: true
            }
        });

        const result = {
            popularSearches: popularSearches.length > 0 ? popularSearches : ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Indian'],
            trending
        };

        // Cache for 1 hour
        await cacheSet(cacheKey, result, 3600);
        return result;
    }

    /**
     * Save search history
     */
    async saveSearchHistory(userId, searchTerm) {
        if (!searchTerm) return;

        // Save search
        await prisma.searchHistory.create({
            data: {
                userId,
                searchTerm: searchTerm.trim()
            }
        });

        // Limit to last 10 searches for this user
        const history = await prisma.searchHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true }
        });

        if (history.length > 10) {
            const idsToDelete = history.slice(10).map(h => h.id);
            await prisma.searchHistory.deleteMany({
                where: {
                    id: { in: idsToDelete }
                }
            });
        }
    }

    /**
     * Get user search history
     */
    async getSearchHistory(userId) {
        const history = await prisma.searchHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                searchTerm: true,
                createdAt: true
            }
        });

        return {
            searchHistory: history.map(h => h.searchTerm)
        };
    }
}

module.exports = new SearchService();
