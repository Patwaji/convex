import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

function ensureCloudinaryConfigured(): void {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    const error = new Error('Cloudinary is not configured on the server') as any;
    error.statusCode = 500;
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw error;
  }
}

export async function uploadEventCoverImage(dataUri: string) {
  ensureCloudinaryConfigured();

  return cloudinary.uploader.upload(dataUri, {
    folder: 'convex/events',
    resource_type: 'image',
  });
}

export async function uploadUserAvatarImage(dataUri: string, userId: string) {
  ensureCloudinaryConfigured();

  return cloudinary.uploader.upload(dataUri, {
    folder: 'convex/users/avatars',
    public_id: userId,
    overwrite: true,
    resource_type: 'image',
  });
}
