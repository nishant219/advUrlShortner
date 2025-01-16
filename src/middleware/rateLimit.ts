import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const createUrlLimiter = rateLimit({
  windowMs: config.rateLimits.windowMs,
  max: config.rateLimits.max,
  message: 'Too many URL creations from this IP, please try again later'
});