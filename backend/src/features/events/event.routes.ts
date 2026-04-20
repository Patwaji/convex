import { Router } from 'express';
import * as eventController from './event.controller';
import { verifyToken } from '../auth/auth.middleware';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';

const router = Router();

// ─── Public Routes ──────────────────────────────────────────
// GET /api/events — list approved events (paginated, filterable)
router.get('/', asyncWrapper(eventController.listEvents));

// GET /api/events/nearby — geo search
router.get('/nearby', asyncWrapper(eventController.getNearbyEvents));

// ─── Authenticated Routes ───────────────────────────────────
// GET /api/events/mine — events created by current user
router.get('/mine', verifyToken, asyncWrapper(eventController.getMyCreatedEvents));

// GET /api/events/joined — events current user has joined
router.get('/joined', verifyToken, asyncWrapper(eventController.getMyJoinedEvents));

// GET /api/events/:id — single event detail
router.get('/:id', asyncWrapper(eventController.getEventById));

// POST /api/events — create event (auth required)
router.post('/', verifyToken, asyncWrapper(eventController.createEvent));

// POST /api/events/:id/join — join event (auth required)
router.post('/:id/join', verifyToken, asyncWrapper(eventController.joinEvent));

// POST /api/events/:id/leave — leave event (auth required)
router.post('/:id/leave', verifyToken, asyncWrapper(eventController.leaveEvent));

// POST /api/events/:id/report — report event (auth required)
router.post('/:id/report', verifyToken, asyncWrapper(eventController.reportEvent));

export default router;
