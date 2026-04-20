import express from 'express';
import cors from 'cors';
import { errorHandler } from './shared/middleware/errorHandler';
import { generalLimiter } from './shared/middleware/rateLimiter';
import { env } from './shared/config/env';
import authRoutes from './features/auth/auth.routes';
import eventRoutes from './features/events/event.routes';
import adminRoutes from './features/admin/admin.routes';
import userRoutes from './features/users/user.routes';
import notificationRoutes from './features/notifications/notification.routes';
import notificationActions from './features/notifications/notification.actions';

const app = express();

const allowAllOrigins = env.CORS_ORIGINS.includes('*');
const allowedOrigins = new Set(env.CORS_ORIGINS);

app.set('trust proxy', 1);

// ─── Global Middleware ──────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowAllOrigins || !origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// ─── Health Check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', notificationActions); // For submit-info action

// ─── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ─── Error Handler (must be last) ──────────────────────────
app.use(errorHandler);

export default app;
