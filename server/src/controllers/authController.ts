import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AuthService } from '../services/authService';
import { asyncHandler } from '../utils/errors';

export class AuthController {
  /**
   * POST /api/auth/register
   * Create a new user account (defaults to STAFF)
   */
  static register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.register(req.body);
    res.status(201).json({
      message: 'Registration successful',
      token: result.token,
      user: result.user,
    });
  });

  /**
   * POST /api/auth/login
   * Authenticate email/password credentials and issue a JWT
   */
  static login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.login(req.body);
    res.status(200).json({
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  });

  /**
   * GET /api/auth/me
   * Retrieve authenticated user profile
   */
  static me = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await AuthService.getCurrentUser(req.userId!);
    res.status(200).json({
      message: 'Profile retrieved successfully',
      user,
      data: user,
    });
  });

  /**
   * POST /api/auth/forgot-password
   * Request a 6-digit password reset OTP
   */
  static forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.forgotPassword(req.body?.email);
    res.status(200).json(result);
  });

  /**
   * POST /api/auth/verify-otp
   * Validate OTP and issue temporary reset authorization
   */
  static verifyOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.verifyOtp(req.body);
    res.status(200).json(result);
  });

  /**
   * POST /api/auth/reset-password
   * Reset user password using verified authorization
   */
  static resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.resetPassword(req.body);
    res.status(200).json(result);
  });
}
