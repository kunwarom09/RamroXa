import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from '../docs/openapiSpec.js';

export const router = express.Router();

// Raw JSON spec
router.get('/spec.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(openapiSpec);
});

// Swagger UI Explorer
router.use('/', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'Zylo API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true
  }
}));

export default router;
