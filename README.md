# URL Shortener API

A production-ready URL shortener service with advanced analytics, built using Node.js, TypeScript, MongoDB, and Redis.
This service provides URL shortening capabilities with custom aliases, comprehensive analytics, and Google authentication.

## Features

- 🔐 User Authentication with Google Sign-In
- 🔗 URL Shortening with custom alias support
- 📊 Advanced Analytics tracking
  - Click tracking
  - Unique visitors
  - Device types
  - Operating systems
  - Geolocation data
- 🏷️ Topic-based URL organization
- 💨 Redis caching for improved performance
- ⚡ Rate limiting to prevent abuse
- 🐳 Docker support for easy deployment
- 📝 Swagger API documentation
- ✅ Comprehensive test coverage

## Tech Stack

- Node.js & TypeScript
- Express.js
- MongoDB with Mongoose
- Redis for caching
- Docker & Docker Compose
- Winston for logging
- JWT for authentication

## Prerequisites

- Node.js (v18 or higher)
- MongoDB
- Redis
- Docker & Docker Compose (for containerized deployment)
- Google Cloud Platform account (for authentication)


## Project Structure
```
url-shortener/
├── src/
│   ├── __tests__/          # Test files
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   ├── app.ts             # Express app setup
│   └── server.ts          # Server entry point
├── docs/                  # Documentation
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose config
└── package.json
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/nishant219/advUrlShortner
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/urlshortener
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-jwt-secret
BASE_URL=http://localhost:3000
```

## Development

Start the development server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Format code:
```bash
npm run format
```

Lint code:
```bash
npm run lint
```

## Docker Deployment

1. Build and start containers:
```bash
npm run docker:up
```

2. Stop containers:
```bash
npm run docker:down
```

## API Endpoints

### Authentication
```
POST /auth/google
- Authenticate user with Google ID token
```

### URL Operations
```
POST /api/shorten
- Create short URL
- Requires authentication
- Rate limited

GET /:alias
- Redirect to original URL
- Public endpoint

GET /api/analytics/:alias
- Get analytics for specific URL
- Requires authentication

GET /api/analytics/topic/:topic
- Get analytics for all URLs in a topic
- Requires authentication

GET /api/analytics/overall
- Get overall analytics for all URLs
- Requires authentication
```

## API Usage Examples

### Google Sign-In
```bash
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_GOOGLE_ID_TOKEN"
  }'
```

### Create Short URL
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "longUrl": "https://example.com",
    "customAlias": "my-link",
    "topic": "marketing"
  }'
```

### Get URL Analytics
```bash
curl -X GET http://localhost:3000/api/analytics/my-link \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Configure OAuth consent screen
6. Add authorized domains and redirect URIs

Required OAuth settings:
- Authorized JavaScript origins: `http://localhost:3000`
- Authorized redirect URIs: `http://localhost:3000/auth/google/callback`


## Monitoring & Logs

View application logs:
```bash
docker-compose logs -f app
```

Monitor containers:
```bash
docker-compose ps
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## Acknowledgments

- [Express.js](https://expressjs.com/)
- [Mongoose](https://mongoosejs.com/)
- [Redis](https://redis.io/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
