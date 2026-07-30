import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'MenyaLo API',
    version: '1.0.0',
    description: 'API documentation for Menyalo application',
    contact: {
      name: 'Development Team 12',
      email: 'dev@menyalo.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5001/api/v1',
      description: 'Development server',
    },
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Alternative development server',
    },
    {
      url: 'https://menyalo-backend.onrender.com/api/v1', // Added /api/v1
      description: 'Production server on Render',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/swagger/paths/*.yaml', './src/swagger/schemas/*.yaml'],
};

export const swaggerSpec = swaggerJsdoc(options);
