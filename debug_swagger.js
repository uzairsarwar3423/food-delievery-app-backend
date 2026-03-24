const swaggerJSDoc = require('swagger-jsdoc');
const fs = require('fs');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Food Delivery API Documentation',
            version: '1.0.0',
        },
        servers: [
            {
                url: 'http://localhost:5000',
            },
        ],
    },
    apis: ['./src/docs/*.yaml'],
};

const swaggerSpec = swaggerJSDoc(options);
fs.writeFileSync('swagger-debug.json', JSON.stringify(swaggerSpec, null, 2));
console.log('Swagger spec written to swagger-debug.json');
console.log('Path keys:', Object.keys(swaggerSpec.paths));
