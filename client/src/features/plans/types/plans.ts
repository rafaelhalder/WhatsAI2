export type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';

export interface PlanLimits {
  instances: number; // -1 = unlimited
  messages_per_day: number; // -1 = unlimited
  templates: number; // -1 = unlimited
  broadcasts: boolean;
  broadcasts_per_month?: number; // -1 = unlimited
  team_members: number; // -1 = unlimited
  storage_gb?: number; // -1 = unlimited
  api_access?: boolean;
  priority_support?: boolean;
  custom_domain?: boolean;
  whitelabel?: boolean;
}

export interface PlanConfig {
  name: PlanType;
  displayName: string;
  price: number; // Monthly price in BRL (R$)
  description: string;
  limits: PlanLimits;
  color: string;
  popular?: boolean;
}

export interface UsageItem {
  current: number;
  limit: number;
  percentage: number;
}

export interface UsageResponse {
  plan: PlanType;
  planDisplayName: string;
  limits: PlanLimits;
  usage: {
    instances: UsageItem;
    messages_today: UsageItem;
    templates: UsageItem;
    campaigns_this_month?: UsageItem;
  };
  canCreateInstance: boolean;
  canSendMessage: boolean;
  canCreateTemplate: boolean;
  canCreateCampaign: boolean;
}

export interface CheckActionRequest {
  action: 'CREATE_INSTANCE' | 'SEND_MESSAGE' | 'CREATE_TEMPLATE' | 'CREATE_CAMPAIGN';
}

export interface CheckActionResponse {
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
}

export interface UpgradePlanRequest {
  newPlan: PlanType;
}

export interface DowngradePlanRequest {
  newPlan: PlanType;
}
