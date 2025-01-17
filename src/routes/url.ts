import express from 'express';
import { UrlController } from '../controllers/url';
import { authMiddleware } from '../middleware/auth';
import { createUrlLimiter } from '../middleware/rateLimit';

const router = express.Router();

router.post(
  '/shorten',
  authMiddleware,
  createUrlLimiter,
  UrlController.createShortUrl
);

router.get(
  '/analytics/:alias',
  authMiddleware,
  UrlController.getUrlAnalytics
);

router.get(
  '/analytics/topic/:topic',
  authMiddleware,
  UrlController.getTopicAnalytics
);

router.get(
  '/analytics/overall',
  authMiddleware,
  UrlController.getOverallAnalytics
);

// Public redirect route
router.get('/:alias', UrlController.redirectUrl);

export default router;
