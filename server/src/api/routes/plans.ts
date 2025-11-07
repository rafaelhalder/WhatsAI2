/**
 * Plans and Usage Routes
 * Task 3.5: Sistema de Limites e Quotas
 * 
 * API endpoints for plan management and usage tracking
 */

import { Router, Request, Response } from 'express';
import { PlansService } from '../../services/plans-service';
import {
  upgradePlanSchema,
  downgradePlanSchema,
  usageQuerySchema,
  planComparisonQuerySchema,
  checkActionSchema,
} from '../../schemas/plans-schemas';
import { PlanType } from '../../constants/plans';

const router = Router();

/**
 * GET /api/plans
 * Get all available plans with pricing and features
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = planComparisonQuerySchema.parse(req.query);
    const plans = PlansService.getAllPlans();

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Error getting plans:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar planos',
      message: errorMessage,
    });
  }
});

/**
 * GET /api/plans/current
 * Get user's current plan and limits
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
      });
    }

    const planInfo = await PlansService.getUserPlan(userId);
    const planConfig = PlansService.getPlanConfig(planInfo.plan);

    return res.json({
      success: true,
      data: {
        ...planInfo,
        config: planConfig,
      },
    });
  } catch (error) {
    console.error('Error getting current plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar plano atual',
      message: errorMessage,
    });
  }
});

/**
 * GET /api/plans/usage
 * Get user's current usage and limits
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
      });
    }

    const query = usageQuerySchema.parse(req.query);
    const usage = await PlansService.getUserUsage(userId);

    return res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    console.error('Error getting usage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar uso',
      message: errorMessage,
    });
  }
});

/**
 * POST /api/plans/check-action
 * Check if user can perform a specific action
 */
router.post('/check-action', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
      });
    }

    const { action } = checkActionSchema.parse(req.body);
    const result = await PlansService.canPerformAction(userId, action);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors,
      });
    }

    console.error('Error checking action:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao verificar ação',
    });
  }
});

/**
 * POST /api/plans/upgrade
 * Upgrade user's plan
 */
router.post('/upgrade', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
      });
    }

    const { plan } = upgradePlanSchema.parse(req.body);

    await PlansService.upgradePlan(userId, plan as PlanType);

    const updatedPlan = await PlansService.getUserPlan(userId);
    const planConfig = PlansService.getPlanConfig(updatedPlan.plan);

    return res.json({
      success: true,
      message: `Plano atualizado para ${planConfig.displayName} com sucesso!`,
      data: {
        ...updatedPlan,
        config: planConfig,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors,
      });
    }

    if (error.message?.includes('Não é possível fazer upgrade')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Error upgrading plan:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao fazer upgrade do plano',
    });
  }
});

/**
 * POST /api/plans/downgrade
 * Downgrade user's plan
 */
router.post('/downgrade', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
      });
    }

    const { plan } = downgradePlanSchema.parse(req.body);

    await PlansService.downgradePlan(userId, plan as PlanType);

    const updatedPlan = await PlansService.getUserPlan(userId);
    const planConfig = PlansService.getPlanConfig(updatedPlan.plan);

    return res.json({
      success: true,
      message: `Plano alterado para ${planConfig.displayName}`,
      data: {
        ...updatedPlan,
        config: planConfig,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors,
      });
    }

    if (error.message?.includes('Não é possível fazer downgrade')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Error downgrading plan:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao alterar plano',
    });
  }
});

/**
 * GET /api/plans/comparison
 * Get plan comparison table (for frontend)
 */
router.get('/comparison', async (req: Request, res: Response) => {
  try {
    const plans = PlansService.getPlanComparison();

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Error getting plan comparison:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar comparação de planos',
    });
  }
});

export default router;
