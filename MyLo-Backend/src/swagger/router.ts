import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../swagger/config';

const swaggerRouter = Router();

// Serve swagger documentation
swaggerRouter.use('/docs', swaggerUi.serve);
swaggerRouter.get(
  '/docs',
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Menyalo API Documentation',
  }),
);

// Serve swagger JSON
swaggerRouter.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export { swaggerRouter };
