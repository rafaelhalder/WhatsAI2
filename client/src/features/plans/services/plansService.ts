import { PlanType, PlanConfig, UsageResponse, CheckActionRequest } from '../types/plans';

class PlansService {
  private baseUrl = '/api/plans';

  /**
   * Get all available plans
   */
  async getAllPlans(token: string): Promise<PlanConfig[]> {
    const response = await fetch(`${this.baseUrl}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch plans');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get current user's plan
   */
  async getCurrentPlan(token: string): Promise<{ plan: PlanType; config: PlanConfig }> {
    const response = await fetch(`${this.baseUrl}/current`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch current plan');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get current user's usage statistics
   */
  async getUsage(token: string): Promise<UsageResponse> {
    const response = await fetch(`${this.baseUrl}/usage`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch usage statistics');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Check if user can perform an action
   */
  async checkAction(token: string, action: CheckActionRequest['action']): Promise<{
    allowed: boolean;
    reason?: string;
    current: number;
    limit: number;
  }> {
    const response = await fetch(`${this.baseUrl}/check-action`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action })
    });

    if (!response.ok) {
      throw new Error('Failed to check action');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Upgrade to a new plan
   */
  async upgradePlan(token: string, newPlan: PlanType): Promise<{ plan: PlanType; config: PlanConfig }> {
    const response = await fetch(`${this.baseUrl}/upgrade`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ plan: newPlan })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upgrade plan');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Downgrade to a new plan
   */
  async downgradePlan(token: string, newPlan: PlanType): Promise<{ plan: PlanType; config: PlanConfig }> {
    const response = await fetch(`${this.baseUrl}/downgrade`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ plan: newPlan })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to downgrade plan');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get plan comparison
   */
  async getComparison(token: string): Promise<{
    current: PlanType;
    available: PlanType[];
    comparison: Record<string, any>;
  }> {
    const response = await fetch(`${this.baseUrl}/comparison`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch plan comparison');
    }

    const data = await response.json();
    return data.data;
  }
}

export const plansService = new PlansService();
