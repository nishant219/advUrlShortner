// src/services/url.ts
import { URL } from '../models/URL';
import { Analytics } from '../models/Analytics';
import { UrlGenerator } from '../utils/urlGenerator';
import { redisService } from './redis';
import { CreateShortUrlRequest, UrlAnalyticsResponse } from '../types/requests';
import { config } from '../config';
import logger from '../utils/logger';
import { IURL } from '../types/index';

export class UrlService {

  static async createShortUrl(userId: string, data: CreateShortUrlRequest): Promise<IURL> {
    const { longUrl, customAlias, topic } = data;

    if (!UrlGenerator.isValidUrl(longUrl)) {
      throw new Error('Invalid URL provided');
    }

    let alias = customAlias;
    if (!alias) {
      do {
        alias = UrlGenerator.generateAlias();
      } while (await URL.findOne({ alias }));
    } else {
      if (await URL.findOne({ alias })) {
        throw new Error('Custom alias already exists');
      }
    }
    const shortUrl = `${config.baseUrl}/${alias}`;
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
    await redisService.set(`url:${alias}`, longUrl, 86400); // Cache for 24 hours
    logger.info('Short URL created', { userId, alias, topic });
    return url;
  }

  static async getLongUrl(alias: string): Promise<string | null> {
    // check in cache first
    const cachedUrl = await redisService.get(`url:${alias}`);
    if (cachedUrl) {
      return cachedUrl;
    }
    // If not in cache, get from DB
    const url = await URL.findOne({ alias, active: true });
    if (!url) {
      return null;
    }
    // Update cache
    await redisService.set(`url:${alias}`, url.longUrl, 86400);
    // Increment clicks asynchronously
    URL.updateOne({ _id: url._id }, { $inc: { clicks: 1 } }).exec();
    logger.info('URL Clicked', { alias });
    return url.longUrl;
  }

  static async getUrlAnalytics(alias: string): Promise<UrlAnalyticsResponse> {
    const url = await URL.findOne({ alias });
    if (!url) {
      throw new Error('URL not found');
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const analytics = await Analytics.find({
      urlId: url._id,
      timestamp: { $gte: sevenDaysAgo }
    });

    const uniqueUsers = new Set(analytics.map(a => a.uniqueVisitorId)).size;
    // Get clicks by date for last 7 days
    const clicksByDate = await Analytics.aggregate([
      {
        $match: {
          urlId: url._id,
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
    // Get OS statistics
    const osStats = await Analytics.aggregate([
      {
        $match: { urlId: url._id }
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
    // Get device type statistics
    const deviceStats = await Analytics.aggregate([
      {
        $match: { urlId: url._id }
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

    return {
      totalClicks: url.clicks,
      uniqueUsers,
      clicksByDate,
      osType: osStats,
      deviceType: deviceStats
    };
  }

  static async getTopicAnalytics(userId: string, topic: string) {
    const urls = await URL.find({ userId, topic });
    const urlIds = urls.map(url => url._id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const analytics = await Analytics.find({
      urlId: { $in: urlIds },
      timestamp: { $gte: sevenDaysAgo }
    });

    const uniqueUsers = new Set(analytics.map(a => a.uniqueVisitorId)).size;
    const totalClicks = urls.reduce((sum, url) => sum + url.clicks, 0);

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

    const urlStats = await Promise.all(urls.map(async (url) => {
      const urlAnalytics = await Analytics.find({ urlId: url._id });
      const urlUniqueUsers = new Set(urlAnalytics.map(a => a.uniqueVisitorId)).size;

      return {
        shortUrl: url.shortUrl,
        totalClicks: url.clicks,
        uniqueUsers: urlUniqueUsers
      };
    }));

    return {
      totalClicks,
      uniqueUsers,
      clicksByDate,
      urls: urlStats
    };
  }

  static async getOverallAnalytics(userId: string) {
    const urls = await URL.find({ userId });
    const urlIds = urls.map(url => url._id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const analytics = await Analytics.find({
      urlId: { $in: urlIds },
      timestamp: { $gte: sevenDaysAgo }
    });

    const uniqueUsers = new Set(analytics.map(a => a.uniqueVisitorId)).size;
    const totalClicks = urls.reduce((sum, url) => sum + url.clicks, 0);
    const totalUrls = urls.length;

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

    const osStats = await Analytics.aggregate([
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

    const deviceStats = await Analytics.aggregate([
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

    return {
      totalUrls,
      totalClicks,
      uniqueUsers,
      clicksByDate,
      osType: osStats,
      deviceType: deviceStats
    };
  }
}