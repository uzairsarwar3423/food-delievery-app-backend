// =============================================================
// src/app.js — Express Application Setup
// =============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const ApiError = require('./utils/ApiError');

// ─── Routes (imported incrementally as built) ─────────────────
// const authRoutes = require('./modules/auth/auth.routes');
// const userRoutes = require('./modules/users/user.routes');
// etc.

const app = express();

// ─── Security Middleware ──────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);

// ─── CORS ─────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080,http://localhost:8081').split(',');

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new ApiError(403, `CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

// ─── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Request Logger (Custom) ───────────────────────────────────
const { requestLogger } = require('./middlewares/logger.middleware');
app.use(requestLogger);

// ─── Compression ──────────────────────────────────────────────
app.use(compression());

// ─── HTTP Logging ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
      skip: (req) => req.url === '/health',
    }),
  );
}

// ─── Trust Proxy (for rate limiting behind reverse proxy) ─────
app.set('trust proxy', 1);

// ─── Global Rate Limiter ──────────────────────────────────────
app.use('/api/', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: process.env.APP_NAME || 'Food Delivery API',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ─── API Documentation (Swagger) ──────────────────────────────
const setupSwagger = require('./config/swagger');
setupSwagger(app);

// ─── API Routes ───────────────────────────────────────────────
const routes = require('./routes/index');
app.use('/api', routes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
