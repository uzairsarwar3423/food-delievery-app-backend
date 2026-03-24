const express = require('express');
const searchController = require('../../controllers/search.controller');
const { authenticate, optionalAuth } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const searchValidator = require('../../validators/search.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search and filter system for restaurants and menu items
 */

/**
 * @swagger
 * /search/restaurants:
 *   get:
 *     summary: Search for restaurants
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query term
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string of filters (category, minRating, cuisines, isOpen)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, rating, newest, delivery_fee]
 *         description: Sort criteria
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of matching restaurants
 */
router.get('/restaurants', optionalAuth, validate(searchValidator.searchRestaurants), searchController.searchRestaurants);

/**
 * @swagger
 * /search/menu-items:
 *   get:
 *     summary: Search for menu items
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string of filters (minPrice, maxPrice, isVegetarian)
 *     responses:
 *       200:
 *         description: List of matching menu items
 */
router.get('/menu-items', validate(searchValidator.searchMenuItems), searchController.searchMenuItems);

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Get autocomplete suggestions
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of suggestions
 */
router.get('/suggestions', validate(searchValidator.getSuggestions), searchController.getSuggestions);

/**
 * @swagger
 * /search/popular:
 *   get:
 *     summary: Get popular searches and trending restaurants
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Popular searches and trending restaurants
 */
router.get('/popular', searchController.getPopularSearches);

/**
 * @swagger
 * /search/save:
 *   post:
 *     summary: Save a search term to user history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - searchTerm
 *             properties:
 *               searchTerm:
 *                 type: string
 *     responses:
 *       201:
 *         description: Search saved
 */
router.post('/save', authenticate, validate(searchValidator.saveSearch), searchController.saveSearch);

/**
 * @swagger
 * /search/history:
 *   get:
 *     summary: Get user search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's search history
 */
router.get('/history', authenticate, searchController.getSearchHistory);

module.exports = router;
