import Redis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

export class RedisService {
  private static instance: RedisService;
  private client: Redis;
  
  private readonly CACHE_TTL = {
    URL: 86400, // 24 hours
    ANALYTICS: 300, // 5 minutes
    USER: 3600, // 1 hour
    RATE_LIMIT: 900 // 15 minutes
  };

  private constructor() {
    
    this.client = new Redis(config.redisUrl, {
      password: config.redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.client.on('error', (error) => {
      logger.error('Redis Error:', error);
    });

    this.client.on('connect', () => {
      logger.info('---> Connected to Redis');
    });
    
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  // URL Caching Methods
  async cacheUrl(alias: string, longUrl: string): Promise<void> {
    const key = `url:${alias}`;
    await this.set(key, longUrl, this.CACHE_TTL.URL);
  }

  async getCachedUrl(alias: string): Promise<string | null> {
    const key = `url:${alias}`;
    return this.get(key);
  }

  // Analytics Caching Methods
  async cacheAnalytics(key: string, data: any): Promise<void> {
    await this.set(
      `analytics:${key}`,
      JSON.stringify(data),
      this.CACHE_TTL.ANALYTICS
    );
  }

  async getCachedAnalytics(key: string): Promise<any | null> {
    const data = await this.get(`analytics:${key}`);
    return data ? JSON.parse(data) : null;
  }

  // Rate Limiting Methods
  async incrementRateLimit(ip: string, endpoint: string): Promise<number> {
    const key = `ratelimit:${endpoint}:${ip}`;
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, this.CACHE_TTL.RATE_LIMIT);
    }
    return count;
  }

  async getRateLimit(ip: string, endpoint: string): Promise<number> {
    const key = `ratelimit:${endpoint}:${ip}`;
    const count = await this.get(key);
    return count ? parseInt(count) : 0;
  }

  // Base Redis Operations
  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    try {
      if (expireSeconds) {
        await this.client.setex(key, expireSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis Set Error:', { key, error });
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis Get Error:', { key, error });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis Delete Error:', { key, error });
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis Expire Error:', { key, error });
      throw error;
    }
  }

  // Batch Operations
  async mset(keyValues: Record<string, string>, expireSeconds?: number): Promise<void> {
    try {
      const pipeline = this.client.pipeline();
      Object.entries(keyValues).forEach(([key, value]) => {
        if (expireSeconds) {
          pipeline.setex(key, expireSeconds, value);
        } else {
          pipeline.set(key, value);
        }
      });
      await pipeline.exec();
    } catch (error) {
      logger.error('Redis Batch Set Error:', error);
      throw error;
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.client.mget(keys);
    } catch (error) {
      logger.error('Redis Batch Get Error:', error);
      throw error;
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const redisService = RedisService.getInstance();