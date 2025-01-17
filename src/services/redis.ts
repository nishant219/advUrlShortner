import Redis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redisUrl);
    
    this.client.on('error', (error) => {
      logger.error('Redis Error:', error);
    });
  }

  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    try {
      if (expireSeconds) {
        await this.client.setex(key, expireSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis Set Error:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis Get Error:', error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis Delete Error:', error);
      throw error;
    }
  }
}

export const redisService = new RedisService();