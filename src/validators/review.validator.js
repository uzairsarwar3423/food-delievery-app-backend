/**
 * src/validators/review.validator.js
 * Review Validation Schemas
 */

const Joi = require('joi');

const createReview = {
    params: Joi.object().keys({
        restaurantId: Joi.string().required().guid({ version: 'uuidv4' }),
    }),
    body: Joi.object().keys({
        orderId: Joi.string().required().guid({ version: 'uuidv4' }),
        rating: Joi.number().required().min(1).max(5),
        foodRating: Joi.number().min(1).max(5),
        serviceRating: Joi.number().min(1).max(5), // for future use or internal
        deliveryRating: Joi.number().min(1).max(5),
        comment: Joi.string().allow('', null).max(1000),
        images: Joi.array().items(Joi.string().uri()),
    }),
};

const updateReview = {
    params: Joi.object().keys({
        id: Joi.string().required().guid({ version: 'uuidv4' }),
    }),
    body: Joi.object().keys({
        rating: Joi.number().min(1).max(5),
        foodRating: Joi.number().min(1).max(5),
        deliveryRating: Joi.number().min(1).max(5),
        comment: Joi.string().allow('', null).max(1000),
        images: Joi.array().items(Joi.string().uri()),
    }).min(1),
};

const getRestaurantReviews = {
    params: Joi.object().keys({
        restaurantId: Joi.string().required().guid({ version: 'uuidv4' }),
    }),
    query: Joi.object().keys({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100),
        sort: Joi.string().valid('recent', 'helpful', 'rating_high', 'rating_low'),
    }),
};

const addReply = {
    params: Joi.object().keys({
        id: Joi.string().required().guid({ version: 'uuidv4' }),
    }),
    body: Joi.object().keys({
        reply: Joi.string().required().min(1).max(1000),
    }),
};

const flagReview = {
    params: Joi.object().keys({
        id: Joi.string().required().guid({ version: 'uuidv4' }),
    }),
    body: Joi.object().keys({
        reason: Joi.string().required().min(5).max(500),
    }),
};

const reviewIdParam = {
    params: Joi.object().keys({
        id: Joi.string().required().guid({ version: 'uuidv4' }),
    }),
};

module.exports = {
    createReview,
    updateReview,
    getRestaurantReviews,
    addReply,
    flagReview,
    reviewIdParam,
};
