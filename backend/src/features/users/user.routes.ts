import { Router } from 'express';
import { verifyToken } from '../auth/auth.middleware';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { User } from './user.model';
import { Request, Response } from 'express';

const router = Router();

// GET /api/users/me - Get authenticated user's full profile
router.get(
  '/me',
  verifyToken,
  asyncWrapper(async (req: Request, res: Response) => {
    const user = await User.findById(req.user!._id)
      .select('name avatar role email joinedEvents createdEvents createdAt updatedAt')
      .populate('joinedEvents', 'title category date status')
      .populate('createdEvents', 'title category date status');

    if (!user) {
      ApiResponse.error(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    ApiResponse.success(res, user);
  })
);

// GET /api/users/:id — Get public user profile
router.get(
  '/:id',
  asyncWrapper(async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id)
      .select('name avatar role createdAt');

    if (!user) {
      ApiResponse.error(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    ApiResponse.success(res, user);
  })
);

export default router;
