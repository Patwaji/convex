import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as eventController from './event.controller';
import { optionalAuth, verifyToken } from '../auth/auth.middleware';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';

const router = Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 8 * 1024 * 1024 },
});

// ─── Public Routes ──────────────────────────────────────────
// GET /api/events — list approved events (paginated, filterable)
router.get('/', asyncWrapper(eventController.listEvents));

// GET /api/events/nearby — geo search
router.get('/nearby', asyncWrapper(eventController.getNearbyEvents));

// GET /api/events/:id/similar — get similar events
router.get('/:id/similar', asyncWrapper(eventController.getSimilarEvents));

// ─── Authenticated Routes ───────────────────────────────────
// GET /api/events/mine — events created by current user
router.get('/mine', verifyToken, asyncWrapper(eventController.getMyCreatedEvents));

// GET /api/events/drafts — draft events created by current user
router.get('/drafts', verifyToken, asyncWrapper(eventController.getMyDraftEvents));

// GET /api/events/joined — events current user has joined
router.get('/joined', verifyToken, asyncWrapper(eventController.getMyJoinedEvents));

// GET /api/events/:id — single event detail
router.get('/:id', optionalAuth, asyncWrapper(eventController.getEventById));

// POST /api/events — create event (auth required)
router.post('/', verifyToken, asyncWrapper(eventController.createEvent));

// POST /api/events/upload-cover — upload event cover image (auth required)
router.post('/upload-cover', verifyToken, upload.single('image'), asyncWrapper(eventController.uploadCoverImage));

// POST /api/events/:id/join — join event (auth required)
router.post('/:id/join', verifyToken, asyncWrapper(eventController.joinEvent));

// POST /api/events/:id/leave — leave event (auth required)
router.post('/:id/leave', verifyToken, asyncWrapper(eventController.leaveEvent));

// POST /api/events/:id/report — report event (auth required)
router.post('/:id/report', verifyToken, asyncWrapper(eventController.reportEvent));

// POST /api/events/:id/request-delete — organizer requests admin-approved deletion
router.post('/:id/request-delete', verifyToken, asyncWrapper(eventController.requestDeleteEvent));

// POST /api/events/:id/verify-attendee — organizer verifies attendee by unique RSVP code
router.post('/:id/verify-attendee', verifyToken, asyncWrapper(eventController.verifyAttendee));

// POST /api/events/:id/submit — submit draft for approval
router.post('/:id/submit', verifyToken, asyncWrapper(eventController.submitDraft));

// PATCH /api/events/:id — update own draft event
router.patch('/:id', verifyToken, asyncWrapper(eventController.updateEvent));

// GET /api/events/:id/analytics — get event analytics (organizer only)
router.get('/:id/analytics', verifyToken, asyncWrapper(eventController.getEventAnalytics));

export default router;
