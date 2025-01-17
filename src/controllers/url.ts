import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UrlService } from '../services/url';
import { Analytics } from '../models/Analytics';
import { UAParser } from 'ua-parser-js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import geoip from 'geoip-lite';
import { validationResult } from 'express-validator';

export class UrlController {

  static async createShortUrl(req: AuthRequest|any, res: Response|any) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req?.user?._id;
      const url = await UrlService.createShortUrl(userId, req.body);
      
      logger.info('Short URL created', {
        userId,
        alias: url.alias,
        topic: url.topic
      });

      res.status(201).json({
        shortUrl: url.shortUrl,
        longUrl: url.longUrl,
        alias: url.alias,
        topic: url.topic,
        createdAt: url.createdAt
      });
    } catch (error: any) {
      logger.error('Create Short URL Error:', error);
      
      if (error.message === 'Invalid URL provided' || 
          error.message === 'Invalid custom alias format' ||
          error.message === 'Custom alias already exists') {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to create short URL' });
    }
  }

  static async redirectUrl(req: Request|any, res: Response|any) {
    try {
      const { alias } = req.params;
      const longUrl = await UrlService.getLongUrl(alias);
      if (!longUrl) {
        return res.status(404).json({ error: 'URL not found' });
      }
      // Parse user agent
      const parser = new UAParser();
      parser.setUA(req.headers['user-agent']);      
      const os = parser.getOS();
      const device = parser.getDevice();
      // Get geolocation data
      const ip = req.ip.replace('::ffff:', '');  // To Remove IPv6 prefix
      const geo = geoip.lookup(ip);
      // Create analytics entry
      const analytics = new Analytics({
        urlId: alias,
        userAgent: req.headers['user-agent'],
        ipAddress: ip,
        geoLocation: geo ? {
          country: geo.country,
          city: geo.city,
          latitude: geo.ll[0],
          longitude: geo.ll[1]
        } : undefined,
        osType: os.name || 'Unknown',
        deviceType: device.type || 'desktop',
        uniqueVisitorId: req.cookies.visitorId || uuidv4()
      });
      // Set visitor cookie if not exists
      if (!req.cookies.visitorId) {
        res.cookie('visitorId', analytics.uniqueVisitorId, {
          maxAge: 365 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
      // Save analytics asynchronously
      analytics.save().catch(err => {
        logger.error('Analytics Save Error:', err);
      });

      logger.info('URL Redirect', {
        alias,
        os: os.name,
        device: device.type,
        country: geo?.country
      });

      res.redirect(longUrl);
    } catch (error) {
      logger.error('Redirect URL Error:', error);
      res.status(500).json({ error: 'Failed to redirect' });
    }
  }

  static async getUrlAnalytics(req: AuthRequest|any, res: Response|any) {
    try {
      const { alias } = req.params;
      const analytics = await UrlService.getUrlAnalytics(alias);
      
      logger.info('URL Analytics Retrieved', {
        alias,
        userId: req.user!._id
      });

      res.status(200).json(analytics);
    } catch (error: any) {
      logger.error('Get URL Analytics Error:', error);
      
      if (error.message === 'URL not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }

  static async getTopicAnalytics(req: AuthRequest|any, res: Response|any) {
    try {
      const { topic } = req.params;
      const analytics = await UrlService.getTopicAnalytics(topic);
      
      logger.info('Topic Analytics Retrieved', {
        topic,
        userId: req.user!._id
      });

      res.status(200).json(analytics);
    } catch (error: any) {
      logger.error('Get Topic Analytics Error:', error);
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }

  static async getOverallAnalytics(req: AuthRequest|any, res: Response|any) {
    try {
      const userId = req.user!._id;
      const analytics = await UrlService.getOverallAnalytics(userId);
      
      logger.info('Overall Analytics Retrieved', {
        userId: req.user!._id
      });

      res.status(200).json(analytics);
    } catch (error: any) {
      logger.error('Get Overall Analytics Error:', error);
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }

}