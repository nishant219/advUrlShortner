import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';

import { config } from './config';
import logger from './utils/logger';

import urlRoutes from './routes/url';
import authRoutes from './routes/auth';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', urlRoutes);
app.use('/api', authRoutes);

// Connect to MongoDB
mongoose.connect(config.mongoUri)
  .then(() => logger.info('---> Connected to MongoDB'))
  .catch((error) => logger.error('MongoDB connection error:', error));

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'UP' });
});

// 404 Error handling
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err: Error | any, req: express.Request | any, res: express.Response | any, next: express.NextFunction | any) => {
  logger.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;