import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { verifyToken } from '../auth/auth.middleware';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { User } from './user.model';
import { Request, Response } from 'express';
import { uploadUserAvatarImage } from '../../shared/utils/cloudinary';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  dateOfBirth: z.string().optional(),
  hobbies: z.array(z.string()).optional(),
}).strict();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET /api/users/me - Get authenticated user's full profile
router.get(
  '/me',
  verifyToken,
  asyncWrapper(async (req: Request, res: Response) => {
    const user = await User.findById(req.user!._id)
      .select('name avatar role email gender dateOfBirth hobbies joinedEvents createdEvents createdAt updatedAt')
      .populate('joinedEvents', 'title category date status')
      .populate('createdEvents', 'title category date status');

    if (!user) {
      ApiResponse.error(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    ApiResponse.success(res, user);
  })
);

// PATCH /api/users/me - Update authenticated user's profile
router.patch(
  '/me',
  verifyToken,
  asyncWrapper(async (req: Request, res: Response) => {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      ApiResponse.error(res, 400, 'INVALID_DATA', parseResult.error.errors[0]?.message || 'Invalid data');
      return;
    }

    const { name, gender, dateOfBirth, hobbies } = parseResult.data;
    const user = await User.findById(req.user!._id);

    if (!user) {
      ApiResponse.error(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    if (name) user.name = name;
    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (hobbies) user.hobbies = hobbies;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('name avatar role email gender dateOfBirth hobbies joinedEvents createdEvents createdAt updatedAt')
      .populate('joinedEvents', 'title category date status')
      .populate('createdEvents', 'title category date status');

    ApiResponse.success(res, updatedUser, 'Profile updated successfully');
  })
);

// PATCH /api/users/me/avatar - Update authenticated user's avatar
router.patch(
  '/me/avatar',
  verifyToken,
  upload.single('avatar'),
  asyncWrapper(async (req: Request, res: Response) => {
    if (!req.file) {
      ApiResponse.error(res, 400, 'AVATAR_REQUIRED', 'Avatar image file is required');
      return;
    }

    if (!req.file.mimetype.startsWith('image/')) {
      ApiResponse.error(res, 400, 'INVALID_IMAGE_TYPE', 'Only image files are allowed');
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      ApiResponse.error(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    const base64 = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;
    const uploaded = await uploadUserAvatarImage(dataUri, user._id.toString());

    user.avatar = uploaded.secure_url;
    await user.save();

    const profile = await User.findById(user._id)
      .select('name avatar role email joinedEvents createdEvents createdAt updatedAt')
      .populate('joinedEvents', 'title category date status')
      .populate('createdEvents', 'title category date status');

    ApiResponse.success(res, profile, 'Profile photo updated successfully');
  })
);

// GET /api/users/:id — Get public user profile
router.get(
  '/:id',
  asyncWrapper(async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id)
      .select('name avatar role createdAt')
      .populate('createdEvents', 'title category date status')
      .populate('joinedEvents', 'title category date status');

    if (!user) {
      ApiResponse.error(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    const publicProfile = {
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      eventsCreated: user.createdEvents?.length || 0,
      eventsJoined: user.joinedEvents?.length || 0,
      recentEvents: user.createdEvents?.slice(0, 5),
    };

    ApiResponse.success(res, publicProfile);
  })
);

// GET /api/users/me/export — Export user data (GDPR)
router.get(
  '/me/export',
  verifyToken,
  asyncWrapper(async (req: Request, res: Response) => {
    const user = await User.findById(req.user!._id)
      .populate('joinedEvents')
      .populate('createdEvents');

    if (!user) {
      ApiResponse.error(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    const exportData = {
      profile: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        hobbies: user.hobbies,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      events: {
        joined: user.joinedEvents,
        created: user.createdEvents,
      },
      exportedAt: new Date().toISOString(),
    };

    ApiResponse.success(res, exportData, 'User data exported successfully');
  })
);

// DELETE /api/users/me — Delete own account
router.delete(
  '/me',
  verifyToken,
  asyncWrapper(async (req: Request, res: Response) => {
    const user = await User.findById(req.user!._id);

    if (!user) {
      ApiResponse.error(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    await User.findByIdAndDelete(user._id);

    ApiResponse.success(res, null, 'Account deleted successfully');
  })
);

export default router;
