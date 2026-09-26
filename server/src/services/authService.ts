import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { config } from '../config';
import { AppError } from '../utils/errors';

export interface RegisterInput {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

export interface LoginInput {
  email?: string;
  password?: string;
}

export interface VerifyOtpInput {
  email?: string;
  otp?: string;
}

export interface ResetPasswordInput {
  email?: string;
  otp?: string;
  resetToken?: string;
  newPassword?: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt?: Date;
}

export class AuthService {
  /**
   * Generates a standard JWT for authenticated sessions.
   */
  private static generateToken(userId: string, role: string): string {
    return jwt.sign(
      { userId, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );
  }

  /**
   * Sanitizes a User database record by stripping sensitive security credentials.
   */
  private static sanitizeUser(user: any): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Registers a new user account.
   * Public registration is restricted to STAFF.
   */
  static async register(data: RegisterInput) {
    const { name, email, password, role } = data;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Name is required', 400);
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new AppError('A valid email address is required', 400);
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      throw new AppError('Password is required and must be at least 6 characters', 400);
    }

    // Role elevation protection: public registration cannot create MANAGER accounts
    if (role) {
      const normalizedRole = role.toUpperCase();
      if (!['STAFF', 'MANAGER'].includes(normalizedRole)) {
        throw new AppError("Invalid role. Supported roles are 'STAFF' and 'MANAGER'", 400);
      }
      if (normalizedRole === 'MANAGER') {
        throw new AppError('Public registration cannot create MANAGER accounts. Default role is STAFF.', 400);
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new AppError('Email is already registered', 400);
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'STAFF',
      },
    });

    const token = AuthService.generateToken(user.id, user.role);

    return {
      token,
      user: AuthService.sanitizeUser(user),
    };
  }

  /**
   * Authenticates user credentials and issues a JWT token.
   */
  static async login(data: LoginInput) {
    const { email, password } = data;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new AppError('Email and password are required', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = AuthService.generateToken(user.id, user.role);

    return {
      token,
      user: AuthService.sanitizeUser(user),
    };
  }

  /**
   * Retrieves profile information for the authenticated user.
   */
  static async getCurrentUser(userId: string) {
    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return AuthService.sanitizeUser(user);
  }

  /**
   * Requests a password reset OTP.
   * Generates a cryptographically secure 6-digit OTP with a 10-minute expiration.
   * Returns a generic message to prevent account enumeration.
   */
  static async forgotPassword(email: string) {
    if (!email || typeof email !== 'string') {
      throw new AppError('Email is required', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Cryptographically secure 6-digit number
      const otp = crypto.randomInt(100000, 1000000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode: otp,
          otpExpiresAt,
        },
      });
    }

    // Generic response to prevent user enumeration
    return {
      message: 'If the account exists, a password reset OTP has been issued.',
    };
  }

  /**
   * Verifies the 6-digit OTP code and issues a short-lived reset authorization token.
   */
  static async verifyOtp(data: VerifyOtpInput) {
    const { email, otp } = data;

    if (!email || !otp || typeof email !== 'string' || typeof otp !== 'string') {
      throw new AppError('Email and OTP are required', 400);
    }

    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new AppError('OTP must be exactly 6 digits', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    if (new Date() > user.otpExpiresAt) {
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    if (user.otpCode !== cleanOtp) {
      throw new AppError('Invalid OTP', 400);
    }

    // Issue short-lived password reset token (10 minutes)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password-reset' },
      config.jwt.secret,
      { expiresIn: '10m' }
    );

    return {
      message: 'OTP verified successfully',
      resetToken,
      email: user.email,
    };
  }

  /**
   * Resets the user's password using either verified resetToken or (email + valid OTP).
   * Atomically updates passwordHash and invalidates OTP fields to prevent reuse.
   */
  static async resetPassword(data: ResetPasswordInput) {
    const { email, otp, resetToken, newPassword } = data;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }

    let targetUserId: string | null = null;

    // Option 1: Verification via signed resetToken
    if (resetToken) {
      try {
        const decoded = jwt.verify(resetToken, config.jwt.secret) as {
          userId: string;
          email: string;
          purpose: string;
        };
        if (decoded.purpose !== 'password-reset') {
          throw new AppError('Invalid password reset token', 400);
        }
        targetUserId = decoded.userId;
      } catch {
        throw new AppError('Invalid or expired reset token', 400);
      }
    }

    // Option 2: Verification via email and raw OTP
    if (!targetUserId && email && otp) {
      const cleanOtp = otp.trim();
      if (!/^\d{6}$/.test(cleanOtp)) {
        throw new AppError('OTP must be exactly 6 digits', 400);
      }
      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (!user || !user.otpCode || !user.otpExpiresAt) {
        throw new AppError('Invalid or expired OTP', 400);
      }
      if (new Date() > user.otpExpiresAt) {
        throw new AppError('OTP has expired', 400);
      }
      if (user.otpCode !== cleanOtp) {
        throw new AppError('Invalid OTP', 400);
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new AppError('Reset authorization is required (either valid resetToken or email + OTP)', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check single-use invariant: if otpCode is already null, it was already consumed
    if (!user.otpCode) {
      throw new AppError('Password reset authorization has already been used or expired', 400);
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atomically invalidate OTP and update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    return {
      message: 'Password reset successful. You can now login with your new password.',
    };
  }
}
