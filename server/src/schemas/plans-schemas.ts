/**
 * Plans and Usage Validation Schemas
 * Task 3.5: Sistema de Limites e Quotas
 */

import { z } from 'zod';

// Plan type enum
export const planTypeSchema = z.enum(['FREE', 'STARTER', 'PRO', 'BUSINESS'], {
  errorMap: () => ({ message: 'Plano inválido. Use: FREE, STARTER, PRO ou BUSINESS' }),
});

// Upgrade plan request
export const upgradePlanSchema = z.object({
  plan: planTypeSchema,
});

// Downgrade plan request
export const downgradePlanSchema = z.object({
  plan: planTypeSchema,
});

// Usage query parameters
export const usageQuerySchema = z.object({
  detailed: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

// Plan comparison query
export const planComparisonQuerySchema = z.object({
  currency: z.enum(['BRL', 'USD']).optional().default('BRL'),
});

// Check action limit
export const checkActionSchema = z.object({
  action: z.enum(['create_instance', 'send_message', 'create_template', 'create_campaign'], {
    errorMap: () => ({ 
      message: 'Ação inválida. Use: create_instance, send_message, create_template ou create_campaign' 
    }),
  }),
});

// Export types
export type UpgradePlanRequest = z.infer<typeof upgradePlanSchema>;
export type DowngradePlanRequest = z.infer<typeof downgradePlanSchema>;
export type UsageQuery = z.infer<typeof usageQuerySchema>;
export type PlanComparisonQuery = z.infer<typeof planComparisonQuerySchema>;
export type CheckActionRequest = z.infer<typeof checkActionSchema>;
