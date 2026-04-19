import jwt from 'jsonwebtoken';
import { env } from '../../shared/config/env';
import { User, IUser } from '../users/user.model';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

/**
 * Generate JWT access + refresh token pair.
 */
function generateTokens(userId: string, role: string): TokenPair {
  const accessToken = jwt.sign(
    { userId, role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { userId, role },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

/**
 * Register a new user.
 */
export async function signup(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const error = new Error('A user with this email already exists') as any;
    error.statusCode = 409;
    error.code = 'DUPLICATE_EMAIL';
    throw error;
  }

  // Create user (password hashed by pre-save hook)
  const user = await User.create({ name, email, password });

  // Generate tokens
  const tokens = generateTokens(user._id.toString(), user.role);

  // Store refresh token in DB for rotation validation
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return { ...tokens, user };
}

/**
 * Authenticate an existing user.
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  // Find user with password field explicitly selected
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    const error = new Error('Invalid email or password') as any;
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password') as any;
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Generate tokens
  const tokens = generateTokens(user._id.toString(), user.role);

  // Store new refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return { ...tokens, user };
}

/**
 * Rotate tokens using a valid refresh token.
 */
export async function refreshTokens(oldRefreshToken: string): Promise<TokenPair> {
  // Verify the refresh token
  let decoded: { userId: string; role: string };
  try {
    decoded = jwt.verify(oldRefreshToken, env.JWT_REFRESH_SECRET) as {
      userId: string;
      role: string;
    };
  } catch {
    const error = new Error('Invalid or expired refresh token') as any;
    error.statusCode = 401;
    error.code = 'INVALID_REFRESH_TOKEN';
    throw error;
  }

  // Find user and verify stored refresh token matches
  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== oldRefreshToken) {
    // Token reuse detected — invalidate all tokens for security
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    const error = new Error('Refresh token has been revoked') as any;
    error.statusCode = 401;
    error.code = 'TOKEN_REVOKED';
    throw error;
  }

  // Generate new token pair (rotation)
  const tokens = generateTokens(user._id.toString(), user.role);
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return tokens;
}

/**
 * Invalidate refresh token on logout.
 */
export async function logout(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
}

/**
 * Get current user profile.
 */
export async function getProfile(userId: string): Promise<IUser> {
  const user = await User.findById(userId)
    .populate('joinedEvents', 'title category date status')
    .populate('createdEvents', 'title category date status');

  if (!user) {
    const error = new Error('User not found') as any;
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return user;
}
