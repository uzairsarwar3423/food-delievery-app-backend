const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Food Delivery API Documentation',
      version: '1.0.0',
      description: 'Scalable food delivery backend REST API built with Node.js, Express, PostgreSQL, Prisma, Redis',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  // Documentation files to parse
  apis: [
    './src/docs/health.yaml',
    './src/docs/auth.yaml',
    './src/docs/user.yaml',
    './src/docs/restaurant.yaml',
    './src/docs/menu.yaml',
    './src/docs/order.yaml',
    './src/docs/cart.yaml',
    './src/docs/payment.yaml',
    './src/docs/category.yaml',
    './src/docs/rider.yaml',
    './src/docs/review.yaml',
    './src/docs/admin.yaml',
    './src/docs/search.yaml',
    './src/docs/earnings_payout.yaml',
    './src/docs/schemas.yaml'
  ],
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Food Delivery API Docs',
  }));
};

module.exports = setupSwagger;
