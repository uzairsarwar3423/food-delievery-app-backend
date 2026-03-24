const searchService = require('../services/search.service');
const logger = require('../config/logger');

class SearchController {
    /**
     * GET /api/v1/search/restaurants
     */
    async searchRestaurants(req, res) {
        try {
            const { q, filters, sort, page = 1, limit = 10 } = req.query;

            const parsedFilters = filters ? JSON.parse(filters) : {};

            const result = await searchService.searchRestaurants(q, parsedFilters, sort, page, limit);

            // Save search term for logged-in users or globally for popularity
            if (req.user && q) {
                await searchService.saveSearchHistory(req.user.id, q);
            } else if (q) {
                // Save globally for analytics/popular searches
                await searchService.saveSearchHistory(null, q);
            }

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error searching restaurants:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while searching restaurants'
            });
        }
    }

    /**
     * GET /api/v1/search/menu-items
     */
    async searchMenuItems(req, res) {
        try {
            const { q, restaurantId, filters } = req.query;

            const parsedFilters = filters ? JSON.parse(filters) : {};

            const result = await searchService.searchMenuItems(q, restaurantId, parsedFilters);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error searching menu items:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while searching menu items'
            });
        }
    }

    /**
     * GET /api/v1/search/suggestions
     */
    async getSuggestions(req, res) {
        try {
            const { q } = req.query;
            const result = await searchService.getSuggestions(q);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error getting search suggestions:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while getting suggestions'
            });
        }
    }

    /**
     * GET /api/v1/search/popular
     */
    async getPopularSearches(req, res) {
        try {
            const result = await searchService.getPopularSearches();

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error fetching popular searches:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching popular searches'
            });
        }
    }

    /**
     * POST /api/v1/search/save
     */
    async saveSearch(req, res) {
        try {
            const { searchTerm } = req.body;
            if (!searchTerm) {
                return res.status(400).json({
                    success: false,
                    message: 'Search term is required'
                });
            }

            await searchService.saveSearchHistory(req.user.id, searchTerm);

            res.status(201).json({
                success: true,
                message: 'Search history saved'
            });
        } catch (error) {
            logger.error('Error saving search history:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * GET /api/v1/search/history
     */
    async getSearchHistory(req, res) {
        try {
            const result = await searchService.getSearchHistory(req.user.id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error fetching search history:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = new SearchController();
