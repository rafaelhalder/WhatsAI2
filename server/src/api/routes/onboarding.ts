import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth-middleware';
import { prisma } from '../../database/prisma';

const router = Router();

/**
 * POST /api/onboarding/complete
 * Mark onboarding as completed for the authenticated user
 */
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 5, // Completed
      },
    });

    return res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
      },
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
    });
  }
});

/**
 * PUT /api/onboarding/step
 * Update current onboarding step
 */
router.put('/step', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { step } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (typeof step !== 'number' || step < 0 || step > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid step number. Must be between 0 and 5',
      });
    }

    const updateData: any = {
      onboardingStep: step,
    };

    // Auto-complete if step reaches 5
    if (step === 5) {
      updateData.onboardingCompleted = true;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return res.json({
      success: true,
      message: 'Onboarding step updated',
      data: {
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
      },
    });
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update onboarding step',
    });
  }
});

/**
 * GET /api/onboarding/status
 * Get current onboarding status
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get onboarding status',
    });
  }
});

/**
 * POST /api/onboarding/skip
 * Skip onboarding (mark as completed but with step 0)
 */
router.post('/skip', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 0, // Skipped
      },
    });

    return res.json({
      success: true,
      message: 'Onboarding skipped',
      data: {
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
      },
    });
  } catch (error) {
    console.error('Error skipping onboarding:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to skip onboarding',
    });
  }
});

export default router;
