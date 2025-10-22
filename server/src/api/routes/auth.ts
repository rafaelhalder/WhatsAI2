import { Router } from 'express';
import { authController } from '@/api/controllers/auth-controller';
import { authMiddleware } from '@/api/middlewares/auth-middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 * Public route
 */
router.post('/register', (req, res) => authController.register(req, res));

/**
 * POST /api/auth/login
 * Login user
 * Public route
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * GET /api/auth/me
 * Get current user information
 * Protected route
 */
router.get('/me', authMiddleware, (req, res) => authController.me(req, res));

/**
 * PUT /api/auth/profile
 * Update user profile
 * Protected route
 */
router.put('/profile', authMiddleware, (req, res) => authController.updateProfile(req, res));

/**
 * POST /api/auth/change-password
 * Change user password
 * Protected route
 */
router.post('/change-password', authMiddleware, (req, res) => authController.changePassword(req, res));

export { router as authRoutes };
