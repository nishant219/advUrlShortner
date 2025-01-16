import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/urlshortener',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    rateLimits: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
}; 