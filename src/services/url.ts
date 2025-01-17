// src/services/url.ts
import { URL } from '../models/URL';
import { Analytics } from '../models/Analytics';
import { UrlGenerator } from '../utils/urlGenerator';
import { redisService } from './redis';
import { CreateShortUrlRequest, UrlAnalyticsResponse } from '../types/requests';
import { config } from '../config';
import logger from '../utils/logger';
import { IURL } from '../types';

export class UrlService {
  
  static async createShortUrl(userId: string, data: CreateShortUrlRequest): Promise<IURL> {
    const { longUrl, customAlias, topic } = data;

    // Validate URL
    if (!UrlGenerator.isValidUrl(longUrl)) {
      throw new Error('Invalid URL provided');
    }

    // Handle custom alias or generate new one
    let alias: string;
    if (customAlias) {
      if (!UrlGenerator.isValidCustomAlias(customAlias)) {
        throw new Error('Invalid custom alias format');
      }
      const existingUrl = await URL.findOne({ alias: customAlias });
      if (existingUrl) {
        throw new Error('Custom alias already exists');
      }
      alias = customAlias;
    } else {
      // Generate and check for collisions
      let attempts = 0;
      const maxAttempts = 5;
      do {
        alias = UrlGenerator.generateAlias(longUrl);
        const existingUrl = await URL.findOne({ alias });
        if (!existingUrl) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique alias');
      }
    }

    const shortUrl = `${config.baseUrl}/${alias}`;

    // Create URL document
    const url = new URL({
      userId,
      longUrl,
      shortUrl,
      alias,
      topic,
      clicks: 0,
      active: true
    });

    await url.save();

    // Cache the URL
    await redisService.cacheUrl(alias, longUrl);

    logger.info('Short URL created', { userId, alias, topic });
    return url;
  }

  static async getLongUrl(alias: string): Promise<string | null> {
    // Check cache first
    const cachedUrl = await redisService.getCachedUrl(alias);
    if (cachedUrl) {
      // Increment clicks asynchronously
      this.incrementClicks(alias).catch(err => 
        logger.error('Error incrementing clicks', { alias, error: err })
      );
      return cachedUrl;
    }

    // If not in cache, get from DB
    const url = await URL.findOne({ alias, active: true });
    if (!url) {
      return null;
    }

    // Update cache
    await redisService.cacheUrl(alias, url.longUrl);

    // Increment clicks asynchronously
    this.incrementClicks(alias).catch(err => 
      logger.error('Error incrementing clicks', { alias, error: err })
    );

    return url.longUrl;
  }

  private static async incrementClicks(alias: string): Promise<void> {
    await URL.updateOne({ alias }, { $inc: { clicks: 1 } });
  }

  static async getUrlAnalytics(alias: string): Promise<UrlAnalyticsResponse> {
    // Check cache first
    const cachedAnalytics = await redisService.getCachedAnalytics(`url:${alias}`);
    if (cachedAnalytics) {
      return cachedAnalytics;
    }

    const url = await URL.findOne({ alias });
    if (!url) {
      throw new Error('URL not found');
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Parallel queries for better performance
    const [analytics, clicksByDate, osStats, deviceStats] = await Promise.all([
      Analytics.find({
        urlId: alias,
        timestamp: { $gte: sevenDaysAgo }
      }),
      this.getClicksByDate(alias, sevenDaysAgo),
      this.getOsStats(alias),
      this.getDeviceStats(alias)
    ]);

    const uniqueUsers = new Set(analytics.map(a => a.uniqueVisitorId)).size;

    const result = {
      totalClicks: url.clicks,
      uniqueUsers,
      clicksByDate,
      osType: osStats,
      deviceType: deviceStats
    };

    // Cache the results
    await redisService.cacheAnalytics(`url:${alias}`, result);

    return result;
  }

  private static async getClicksByDate(alias: string, fromDate: Date) {
    return Analytics.aggregate([
      {
        $match: {
          urlId: alias,
          timestamp: { $gte: fromDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          clicks: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          clicks: 1
        }
      },
      { $sort: { date: 1 } }
    ]);
  }

  private static async getOsStats(alias: string) {
    return Analytics.aggregate([
      {
        $match: { urlId: alias }
      },
      {
        $group: {
          _id: '$osType',
          uniqueClicks: { $sum: 1 },
          uniqueUsers: { $addToSet: '$uniqueVisitorId' }
        }
      },
      {
        $project: {
          _id: 0,
          osName: '$_id',
          uniqueClicks: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);
  }

  private static async getDeviceStats(alias: string) {
    return Analytics.aggregate([
      {
        $match: { urlId: alias }
      },
      {
        $group: {
          _id: '$deviceType',
          uniqueClicks: { $sum: 1 },
          uniqueUsers: { $addToSet: '$uniqueVisitorId' }
        }
      },
      {
        $project: {
          _id: 0,
          deviceName: '$_id',
          uniqueClicks: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);
  }

  static async getTopicAnalytics(topic: string): Promise<any> {
    // Check cache first
    const cachedAnalytics = await redisService.getCachedAnalytics(`topic:${topic}`);
    if (cachedAnalytics) {
      return cachedAnalytics;
    }

    const urls = await URL.find({ topic });
    if (!urls.length) {
      return {
        totalClicks: 0,
        uniqueUsers: 0,
        clicksByDate: [],
        urls: []
      };
    }

    const urlIds = urls.map(url => url.alias);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all analytics for these URLs
    const analytics = await Analytics.find({
      urlId: { $in: urlIds },
      timestamp: { $gte: sevenDaysAgo }
    });

    // Calculate unique users across all URLs
    const uniqueUsers = new Set(analytics.map(a => a.uniqueVisitorId)).size;

    // Calculate total clicks
    const totalClicks = urls.reduce((sum, url) => sum + url.clicks, 0);

    // Get clicks by date for all URLs
    const clicksByDate = await Analytics.aggregate([
      {
        $match: {
          urlId: { $in: urlIds },
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          clicks: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          clicks: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Get per-URL statistics
    const urlStats = await Promise.all(
      urls.map(async (url) => {
        const urlAnalytics = analytics.filter(a => a.urlId === url.alias);
        const uniqueUrlUsers = new Set(urlAnalytics.map(a => a.uniqueVisitorId)).size;

        return {
          shortUrl: url.shortUrl,
          totalClicks: url.clicks,
          uniqueUsers: uniqueUrlUsers
        };
      })
    );

    const result = {
      totalClicks,
      uniqueUsers,
      clicksByDate,
      urls: urlStats
    };

    // Cache the results
    await redisService.cacheAnalytics(`topic:${topic}`, result);

    return result;
  }

  static async getOverallAnalytics(userId: string): Promise<any> {
    // Check cache first
    const cachedAnalytics = await redisService.getCachedAnalytics(`overall:${userId}`);
    if (cachedAnalytics) {
      return cachedAnalytics;
    }

    const urls = await URL.find({ userId });
    const urlIds = urls.map(url => url.alias);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Parallel queries for better performance
    const [analytics, clicksByDate, osStats, deviceStats] = await Promise.all([
      Analytics.find({
        urlId: { $in: urlIds },
        timestamp: { $gte: sevenDaysAgo }
      }),
      this.getOverallClicksByDate(urlIds, sevenDaysAgo),
      this.getOverallOsStats(urlIds),
      this.getOverallDeviceStats(urlIds)
    ]);

    const uniqueUsers = new Set(analytics.map(a => a.uniqueVisitorId)).size;
    const totalClicks = urls.reduce((sum, url) => sum + url.clicks, 0);

    const result = {
      totalUrls: urls.length,
      totalClicks,
      uniqueUsers,
      clicksByDate,
      osType: osStats,
      deviceType: deviceStats
    };

    // Cache the results
    await redisService.cacheAnalytics(`overall:${userId}`, result);

    return result;
  }

  private static async getOverallClicksByDate(urlIds: string[], fromDate: Date) {
    return Analytics.aggregate([
      {
        $match: {
          urlId: { $in: urlIds },
          timestamp: { $gte: fromDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          clicks: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          clicks: 1
        }
      },
      { $sort: { date: 1 } }
    ]);
  }

  private static async getOverallOsStats(urlIds: string[]) {
    return Analytics.aggregate([
      {
        $match: { urlId: { $in: urlIds } }
      },
      {
        $group: {
          _id: '$osType',
          uniqueClicks: { $sum: 1 },
          uniqueUsers: { $addToSet: '$uniqueVisitorId' }
        }
      },
      {
        $project: {
          _id: 0,
          osName: '$_id',
          uniqueClicks: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);
  }

  private static async getOverallDeviceStats(urlIds: string[]) {
    return Analytics.aggregate([
      {
        $match: { urlId: { $in: urlIds } }
      },
      {
        $group: {
          _id: '$deviceType',
          uniqueClicks: { $sum: 1 },
          uniqueUsers: { $addToSet: '$uniqueVisitorId' }
        }
      },
      {
        $project: {
          _id: 0,
          deviceName: '$_id',
          uniqueClicks: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);
  }
}