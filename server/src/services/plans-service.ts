/**
 * Plans Service
 * Task 3.5: Sistema de Limites e Quotas
 * 
 * Manages user plans, limits, and usage tracking
 */

import { PrismaClient } from '@prisma/client';
import { 
  PlanType, 
  PlanConfig, 
  PlanLimits,
  PLANS,
  getAllPlans,
  getPlanConfig,
  getDefaultLimits,
  isUnlimited,
  checkLimit,
  getLimitPercentage,
  canUpgradeToPlan,
  canDowngradeToPlan,
  isValidPlan
} from '../constants/plans';

const prisma = new PrismaClient();

// Types
export interface UsageStats {
  messages_today: number;
  last_reset: string; // ISO date string
  campaigns_this_month?: number | undefined;
  storage_used_gb?: number | undefined;
}

export interface UsageResponse {
  plan: string;
  planDisplayName: string;
  limits: PlanLimits;
  usage: {
    instances: { current: number; limit: number; percentage: number };
    messages_today: { current: number; limit: number; percentage: number };
    templates: { current: number; limit: number; percentage: number };
    campaigns_this_month?: { current: number; limit: number; percentage: number };
  };
  canCreateInstance: boolean;
  canSendMessage: boolean;
  canCreateTemplate: boolean;
  canCreateCampaign: boolean;
}

export class PlansService {
  /**
   * Get all available plans
   */
  static getAllPlans(): PlanConfig[] {
    return getAllPlans();
  }

  /**
   * Get plan configuration by type
   */
  static getPlanConfig(planType: PlanType): PlanConfig {
    return getPlanConfig(planType);
  }

  /**
   * Get user's current plan and limits
   */
  static async getUserPlan(userId: string): Promise<{ plan: PlanType; limits: PlanLimits }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, planLimits: true },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const planType = user.plan as PlanType;
      
      // Safe JSON parsing with fallback
      let limits: PlanLimits;
      try {
        limits = typeof user.planLimits === 'string' 
          ? JSON.parse(user.planLimits) 
          : user.planLimits as unknown as PlanLimits;
      } catch (error) {
        console.error('Error parsing planLimits in getUserPlan, using defaults:', error);
        limits = getDefaultLimits(planType);
      }

      return { plan: planType, limits };
    } catch (error) {
      console.error('Error in getUserPlan:', error);
      throw error;
    }
  }

  /**
   * Get user's usage statistics
   */
  static async getUserUsage(userId: string): Promise<UsageResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          plan: true,
          planLimits: true,
          usageStats: true,
          _count: {
            select: {
              instances: true,
              messageTemplates: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const planType = user.plan as PlanType;
      const planConfig = getPlanConfig(planType);
      
      // Parse JSON fields safely
      let limits: PlanLimits;
      let usageStats: UsageStats;
      
      try {
        limits = typeof user.planLimits === 'string' 
          ? JSON.parse(user.planLimits) 
          : user.planLimits as unknown as PlanLimits;
      } catch (error) {
        console.error('Error parsing planLimits, using defaults:', error);
        limits = getDefaultLimits(planType);
      }
      
      try {
        usageStats = typeof user.usageStats === 'string'
          ? JSON.parse(user.usageStats)
          : user.usageStats as unknown as UsageStats;
      } catch (error) {
        console.error('Error parsing usageStats, using defaults:', error);
        usageStats = {
          messages_today: 0,
          last_reset: new Date().toISOString(),
        };
      }

      // Check if usage needs to be reset
      const shouldReset = await this.shouldResetUsage(usageStats);
      if (shouldReset) {
        // Reset usage stats
        usageStats = {
          messages_today: 0,
          last_reset: new Date().toISOString(),
          campaigns_this_month: usageStats.campaigns_this_month || 0,
          storage_used_gb: usageStats.storage_used_gb || 0,
        };
        
        // Save to database
        await prisma.user.update({
          where: { id: userId },
          data: { usageStats: usageStats as any },
        });
      }

      // Count campaigns this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const campaignsThisMonth = await prisma.campaign.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      });

      // Calculate usage percentages
      const instancesUsage = {
        current: user._count.instances,
        limit: limits.instances,
        percentage: getLimitPercentage(user._count.instances, limits.instances),
      };

      const messagesTodayUsage = {
        current: usageStats.messages_today || 0,
        limit: limits.messages_per_day,
        percentage: getLimitPercentage(usageStats.messages_today || 0, limits.messages_per_day),
      };

      const templatesUsage = {
        current: user._count.messageTemplates,
        limit: limits.templates,
        percentage: getLimitPercentage(user._count.messageTemplates, limits.templates),
      };

      const campaignsUsage = limits.broadcasts_per_month
        ? {
            current: campaignsThisMonth,
            limit: limits.broadcasts_per_month,
            percentage: getLimitPercentage(campaignsThisMonth, limits.broadcasts_per_month),
          }
        : undefined;

      return {
        plan: planType,
        planDisplayName: planConfig.displayName,
        limits,
        usage: {
          instances: instancesUsage,
          messages_today: messagesTodayUsage,
          templates: templatesUsage,
          ...(campaignsUsage && { campaigns_this_month: campaignsUsage }),
        },
        canCreateInstance: checkLimit(instancesUsage.current, instancesUsage.limit),
        canSendMessage: checkLimit(messagesTodayUsage.current, messagesTodayUsage.limit),
        canCreateTemplate: checkLimit(templatesUsage.current, templatesUsage.limit),
        canCreateCampaign: limits.broadcasts && (campaignsUsage ? checkLimit(campaignsUsage.current, campaignsUsage.limit) : true),
      };
    } catch (error) {
      console.error('Error in getUserUsage:', error);
      throw error;
    }
  }

  /**
   * Check if user can perform action
   */
  static async canPerformAction(
    userId: string,
    action: 'create_instance' | 'send_message' | 'create_template' | 'create_campaign'
  ): Promise<{ allowed: boolean; reason?: string }> {
    const usage = await this.getUserUsage(userId);

    switch (action) {
      case 'create_instance':
        if (!usage.canCreateInstance) {
          return {
            allowed: false,
            reason: `Limite de instâncias atingido (${usage.usage.instances.current}/${usage.usage.instances.limit}). Faça upgrade do seu plano.`,
          };
        }
        break;

      case 'send_message':
        if (!usage.canSendMessage) {
          return {
            allowed: false,
            reason: `Limite diário de mensagens atingido (${usage.usage.messages_today.current}/${usage.usage.messages_today.limit}). Aguarde o reset ou faça upgrade.`,
          };
        }
        break;

      case 'create_template':
        if (!usage.canCreateTemplate) {
          return {
            allowed: false,
            reason: `Limite de templates atingido (${usage.usage.templates.current}/${usage.usage.templates.limit}). Faça upgrade do seu plano.`,
          };
        }
        break;

      case 'create_campaign':
        if (!usage.limits.broadcasts) {
          return {
            allowed: false,
            reason: 'Envio em massa não disponível no seu plano. Faça upgrade para STARTER, PRO ou BUSINESS.',
          };
        }
        if (!usage.canCreateCampaign && usage.usage.campaigns_this_month) {
          return {
            allowed: false,
            reason: `Limite de campanhas mensais atingido (${usage.usage.campaigns_this_month.current}/${usage.usage.campaigns_this_month.limit}). Aguarde o próximo mês ou faça upgrade.`,
          };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Increment message counter
   */
  static async incrementMessageCount(userId: string, count: number = 1): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usageStats: true },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const usageStats = user.usageStats as unknown as UsageStats;
    
    // Check if usage needs to be reset first
    const shouldReset = await this.shouldResetUsage(usageStats);
    
    if (shouldReset) {
      usageStats.messages_today = count;
      usageStats.last_reset = new Date().toISOString();
    } else {
      usageStats.messages_today = (usageStats.messages_today || 0) + count;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { usageStats: usageStats as any },
    });
  }

  /**
   * Reset daily usage if needed
   */
  static async checkAndResetDailyUsage(userId: string, usageStats: UsageStats): Promise<void> {
    try {
      const shouldReset = await this.shouldResetUsage(usageStats);

      if (shouldReset) {
        const newUsageStats: UsageStats = {
          messages_today: 0,
          last_reset: new Date().toISOString(),
          campaigns_this_month: usageStats.campaigns_this_month || 0,
          storage_used_gb: usageStats.storage_used_gb || 0,
        };

        await prisma.user.update({
          where: { id: userId },
          data: { usageStats: newUsageStats as any },
        });
      }
    } catch (error) {
      console.error('Error in checkAndResetDailyUsage:', error);
      // Don't throw, just log - usage reset is not critical
    }
  }

  /**
   * Check if usage should be reset (different day)
   */
  static async shouldResetUsage(usageStats: UsageStats): Promise<boolean> {
    try {
      if (!usageStats.last_reset) {
        return true; // No reset date, should reset
      }

      const lastReset = new Date(usageStats.last_reset);
      const now = new Date();

      // Check if date is valid
      if (isNaN(lastReset.getTime())) {
        return true; // Invalid date, should reset
      }

      // Reset if it's a different day
      return (
        lastReset.getFullYear() !== now.getFullYear() ||
        lastReset.getMonth() !== now.getMonth() ||
        lastReset.getDate() !== now.getDate()
      );
    } catch (error) {
      console.error('Error in shouldResetUsage:', error);
      return true; // On error, reset to be safe
    }
  }

  /**
   * Upgrade user plan
   */
  static async upgradePlan(userId: string, newPlan: PlanType): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const currentPlan = user.plan as PlanType;

    // Validate plan upgrade
    if (!canUpgradeToPlan(currentPlan, newPlan)) {
      throw new Error(`Não é possível fazer upgrade de ${currentPlan} para ${newPlan}`);
    }

    const newLimits = getDefaultLimits(newPlan);

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: newPlan,
        planLimits: newLimits as any,
      },
    });
  }

  /**
   * Downgrade user plan
   */
  static async downgradePlan(userId: string, newPlan: PlanType): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const currentPlan = user.plan as PlanType;

    // Validate plan downgrade
    if (!canDowngradeToPlan(currentPlan, newPlan)) {
      throw new Error(`Não é possível fazer downgrade de ${currentPlan} para ${newPlan}`);
    }

    const newLimits = getDefaultLimits(newPlan);

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: newPlan,
        planLimits: newLimits as any,
      },
    });
  }

  /**
   * Reset all users' daily usage (called by cron job)
   */
  static async resetAllDailyUsage(): Promise<{ resetCount: number }> {
    const users = await prisma.user.findMany({
      select: { id: true, usageStats: true },
    });

    let resetCount = 0;

    for (const user of users) {
      const usageStats = user.usageStats as unknown as UsageStats;
      const shouldReset = await this.shouldResetUsage(usageStats);

      if (shouldReset) {
        const newUsageStats: UsageStats = {
          messages_today: 0,
          last_reset: new Date().toISOString(),
          campaigns_this_month: usageStats.campaigns_this_month ?? undefined,
          storage_used_gb: usageStats.storage_used_gb ?? undefined,
        };

        await prisma.user.update({
          where: { id: user.id },
          data: { usageStats: newUsageStats as any },
        });

        resetCount++;
      }
    }

    return { resetCount };
  }

  /**
   * Get plan comparison
   */
  static getPlanComparison(): PlanConfig[] {
    return getAllPlans();
  }
}

export default PlansService;
