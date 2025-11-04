interface AutoResponse {
  id: string;
  instanceId: string;
  name: string;
  keywords: string[];
  matchType: 'CONTAINS' | 'EXACT' | 'STARTS_WITH' | 'ENDS_WITH';
  caseSensitive: boolean;
  response: string;
  useVariables: boolean;
  mediaUrl?: string;
  mediaType?: string;
  active: boolean;
  triggerCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
  instance: {
    id: string;
    name: string;
    status: string;
  };
}

interface CreateAutoResponseRequest {
  instanceId: string;
  name: string;
  keywords: string[];
  matchType?: 'CONTAINS' | 'EXACT' | 'STARTS_WITH' | 'ENDS_WITH';
  caseSensitive?: boolean;
  response: string;
  useVariables?: boolean;
  mediaUrl?: string;
  mediaType?: string;
  active?: boolean;
}

interface UpdateAutoResponseRequest {
  name?: string;
  keywords?: string[];
  matchType?: 'CONTAINS' | 'EXACT' | 'STARTS_WITH' | 'ENDS_WITH';
  caseSensitive?: boolean;
  response?: string;
  useVariables?: boolean;
  mediaUrl?: string;
  mediaType?: string;
  active?: boolean;
}

interface AutomationStats {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  totalTriggers: number;
  mostUsed: Array<{
    id: string;
    name: string;
    triggerCount: number;
    lastTriggeredAt?: string;
  }>;
}

class AutomationsService {
  private baseUrl = '/api/auto-responses';

  async listAutoResponses(token: string, instanceId: string): Promise<AutoResponse[]> {
    const response = await fetch(`${this.baseUrl}/${instanceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch auto-responses');
    }

    const data = await response.json();
    return data.data;
  }

  async createAutoResponse(token: string, request: CreateAutoResponseRequest): Promise<AutoResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create auto-response');
    }

    const data = await response.json();
    return data.data;
  }

  async updateAutoResponse(token: string, id: string, request: UpdateAutoResponseRequest): Promise<AutoResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update auto-response');
    }

    const data = await response.json();
    return data.data;
  }

  async deleteAutoResponse(token: string, id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete auto-response');
    }
  }

  async toggleAutoResponse(token: string, id: string): Promise<AutoResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/toggle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to toggle auto-response');
    }

    const data = await response.json();
    return data.data;
  }

  async getAutomationStats(token: string, instanceId: string): Promise<AutomationStats> {
    const response = await fetch(`${this.baseUrl}/stats/${instanceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch automation stats');
    }

    const data = await response.json();
    return data.data;
  }
}

export const automationsService = new AutomationsService();
export type {
  AutoResponse,
  CreateAutoResponseRequest,
  UpdateAutoResponseRequest,
  AutomationStats,
};
