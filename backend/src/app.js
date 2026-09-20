import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import configRoutes from './routes/config.routes.js';
import sourcesRoutes from './routes/sources.routes.js';
import offersRoutes from './routes/offers.routes.js';
import matchesRoutes from './routes/matches.routes.js';
import cvRoutes from './routes/cv.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { AI_MODE } from './services/openai.service.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/', (req, res) => {
    res.json({
      name: 'Buscador Inteligente de Convocatorias API',
      version: '0.1.0',
      status: 'ok',
      ai_mode: AI_MODE,
      endpoints: '/api',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/sources', sourcesRoutes);
  app.use('/api/offers', offersRoutes);
  app.use('/api/matches', matchesRoutes);
  app.use('/api/cv-adaptations', cvRoutes);
  app.use('/api/webhook', webhookRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
  });

  app.use(errorHandler);

  return app;
}