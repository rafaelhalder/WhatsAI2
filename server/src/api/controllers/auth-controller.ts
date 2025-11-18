import { Request, Response } from 'express';
import { authService } from '@/services/auth-service';
import { z } from 'zod';
import { deleteAccount } from './auth/delete-account';

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format')
});

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);

      // Register user
      const result = await authService.register(validatedData);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message === 'User already exists with this email') {
          res.status(409).json({
            success: false,
            message: error.message
          });
          return;
        }

        res.status(500).json({
          success: false,
          message: 'Failed to register user',
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/auth/login
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);

      // Login user
      const result = await authService.login(validatedData);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message === 'Invalid credentials' || error.message === 'Account is disabled') {
          res.status(401).json({
            success: false,
            message: error.message
          });
          return;
        }

        res.status(500).json({
          success: false,
          message: 'Failed to login',
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user information
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      // User ID is attached by auth middleware
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Get user data
      const user = await authService.getUserById(userId);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/auth/change-password
   * Change user password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Validate request body
      const validatedData = changePasswordSchema.parse(req.body);

      // Change password
      const result = await authService.changePassword(
        userId,
        validatedData.currentPassword,
        validatedData.newPassword
      );

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message === 'Current password is incorrect') {
          res.status(401).json({
            success: false,
            message: error.message
          });
          return;
        }

        res.status(500).json({
          success: false,
          message: 'Failed to change password',
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/auth/profile
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Validate request body
      const validatedData = updateProfileSchema.parse(req.body);

      // Update profile
      const result = await authService.updateProfile(userId, validatedData);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message === 'Email already exists') {
          res.status(409).json({
            success: false,
            message: error.message
          });
          return;
        }

        res.status(500).json({
          success: false,
          message: 'Failed to update profile',
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  /**
   * DELETE /api/auth/delete-account
   * Delete user account
   */
  async deleteAccount(req: Request, res: Response): Promise<void> {
    return deleteAccount(req, res);
  }

  /**
   * POST /api/auth/onboarding/complete
   * Mark onboarding as completed
   */
  async completeOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Update user onboarding status
      const result = await authService.completeOnboarding(userId);

      res.status(200).json({
        success: true,
        message: 'Onboarding completed successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({
          success: false,
          message: 'Failed to complete onboarding',
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export const authController = new AuthController();
