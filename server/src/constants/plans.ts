/**
 * Plan Constants and Configuration
 * Task 3.5: Sistema de Limites e Quotas
 */

export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export interface PlanLimits {
  instances: number; // -1 = unlimited
  messages_per_day: number; // -1 = unlimited
  broadcasts: boolean;
  broadcasts_per_month?: number; // -1 = unlimited
  templates: number; // -1 = unlimited
  team_members: number; // -1 = unlimited
  storage_gb?: number; // -1 = unlimited
  api_access?: boolean;
  priority_support?: boolean;
  custom_domain?: boolean;
  whitelabel?: boolean;
}

export interface PlanConfig {
  name: string;
  displayName: string;
  description: string;
  price: number; // in cents (BRL)
  priceFormatted: string;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  limits: PlanLimits;
  popular?: boolean;
  stripePriceId?: string; // For Stripe integration (Phase 4)
}

export const PLANS: Record<PlanType, PlanConfig> = {
  [PlanType.FREE]: {
    name: 'FREE',
    displayName: 'Gratuito',
    description: 'Perfeito para testar a plataforma',
    price: 0,
    priceFormatted: 'R$ 0',
    currency: 'BRL',
    billingPeriod: 'monthly',
    features: [
      '1 instância WhatsApp',
      '100 mensagens por dia',
      '3 templates de mensagem',
      'Suporte por email',
      'Dashboard básico',
    ],
    limits: {
      instances: 1,
      messages_per_day: 100,
      broadcasts: false,
      templates: 3,
      team_members: 1,
      storage_gb: 1,
      api_access: false,
      priority_support: false,
      custom_domain: false,
      whitelabel: false,
    },
  },

  [PlanType.PRO]: {
    name: 'PRO',
    displayName: 'Profissional',
    description: 'Para empresas que querem escalar',
    price: 9700, // R$ 97.00
    priceFormatted: 'R$ 97',
    currency: 'BRL',
    billingPeriod: 'monthly',
    popular: true,
    features: [
      '5 instâncias WhatsApp',
      '5.000 mensagens por dia',
      '✅ Envio em massa (10 campanhas/mês)',
      '50 templates de mensagem',
      '5 membros na equipe',
      '10GB de armazenamento',
      'Respostas automáticas',
      'Dashboard avançado',
      'API de integração',
      'Suporte prioritário',
    ],
    limits: {
      instances: 5,
      messages_per_day: 5000,
      broadcasts: true,
      broadcasts_per_month: 10,
      templates: 50,
      team_members: 5,
      storage_gb: 10,
      api_access: true,
      priority_support: true,
      custom_domain: false,
      whitelabel: false,
    },
  },

  [PlanType.ENTERPRISE]: {
    name: 'ENTERPRISE',
    displayName: 'Enterprise',
    description: 'Solução completa para grandes empresas',
    price: 49700, // R$ 497.00
    priceFormatted: 'R$ 497',
    currency: 'BRL',
    billingPeriod: 'monthly',
    features: [
      '✅ Instâncias ilimitadas',
      '✅ Mensagens ilimitadas',
      '✅ Campanhas ilimitadas',
      '✅ Templates ilimitados',
      '✅ Equipe ilimitada',
      '100GB de armazenamento',
      'Respostas automáticas avançadas',
      'Chatbot com IA',
      'Dashboard customizável',
      'API completa',
      'Webhooks customizados',
      'Suporte 24/7 dedicado',
      'Domínio customizado',
      'White label',
      'Gerente de sucesso dedicado',
    ],
    limits: {
      instances: -1, // unlimited
      messages_per_day: -1, // unlimited
      broadcasts: true,
      broadcasts_per_month: -1, // unlimited
      templates: -1, // unlimited
      team_members: -1, // unlimited
      storage_gb: 100,
      api_access: true,
      priority_support: true,
      custom_domain: true,
      whitelabel: true,
    },
  },
};

// Helper functions
export const getPlanConfig = (planType: PlanType): PlanConfig => {
  const config = PLANS[planType];
  if (!config) {
    console.error(`Invalid plan type: ${planType}. Available plans:`, Object.keys(PLANS));
    throw new Error(`Invalid plan type: ${planType}`);
  }
  return config;
};

export const isUnlimited = (value: number): boolean => {
  return value === -1;
};

export const checkLimit = (current: number, limit: number): boolean => {
  if (isUnlimited(limit)) return true;
  return current < limit;
};

export const getLimitPercentage = (current: number, limit: number): number => {
  if (isUnlimited(limit)) return 0;
  if (limit === 0) return 100;
  return Math.round((current / limit) * 100);
};

export const getAllPlans = (): PlanConfig[] => {
  return Object.values(PLANS);
};

export const getDefaultLimits = (planType: PlanType): PlanLimits => {
  return PLANS[planType].limits;
};

// Validation helpers
export const isValidPlan = (plan: string): plan is PlanType => {
  return Object.values(PlanType).includes(plan as PlanType);
};

export const canUpgradeToPlan = (currentPlan: PlanType, targetPlan: PlanType): boolean => {
  const planOrder = [PlanType.FREE, PlanType.PRO, PlanType.ENTERPRISE];
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(targetPlan);
  return targetIndex > currentIndex;
};

export const canDowngradeToPlan = (currentPlan: PlanType, targetPlan: PlanType): boolean => {
  const planOrder = [PlanType.FREE, PlanType.PRO, PlanType.ENTERPRISE];
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(targetPlan);
  return targetIndex < currentIndex;
};
