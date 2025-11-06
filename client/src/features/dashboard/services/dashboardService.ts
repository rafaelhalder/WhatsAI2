import { DashboardMetrics, MessageChartData, InstanceStatusData, CostData, UserActivityData, ActivityLog, DashboardFilters } from '../types/dashboard';

class DashboardService {
  private baseUrl = '/api/dashboard';

  async getMetrics(token: string, filters?: Partial<DashboardFilters>): Promise<DashboardMetrics> {
    const params = new URLSearchParams();

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start.toISOString());
      params.append('endDate', filters.dateRange.end.toISOString());
    }

    if (filters?.instanceId) {
      params.append('instanceId', filters.instanceId);
    }

    const response = await fetch(`${this.baseUrl}/metrics?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard metrics');
    }

    return response.json();
  }

  async getMessageChart(token: string, filters?: Partial<DashboardFilters>): Promise<MessageChartData[]> {
    const params = new URLSearchParams();

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start.toISOString());
      params.append('endDate', filters.dateRange.end.toISOString());
    }

    if (filters?.instanceId) {
      params.append('instanceId', filters.instanceId);
    }

    const response = await fetch(`${this.baseUrl}/messages/chart?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch message chart data');
    }

    return response.json();
  }

  async getInstanceStatus(token: string): Promise<InstanceStatusData[]> {
    const response = await fetch(`${this.baseUrl}/instances/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch instance status data');
    }

    const data = await response.json();
    return data.data || data;
  }

  async getInstancesList(token: string): Promise<any[]> {
    const response = await fetch('/api/instances', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch instances list');
    }

    const data = await response.json();
    return data.data || [];
  }

  async getCostData(token: string, filters?: Partial<DashboardFilters>): Promise<CostData[]> {
    const params = new URLSearchParams();

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start.toISOString());
      params.append('endDate', filters.dateRange.end.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/costs?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch cost data');
    }

    return response.json();
  }

  async getUserActivity(token: string, filters?: Partial<DashboardFilters>): Promise<UserActivityData[]> {
    const params = new URLSearchParams();

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start.toISOString());
      params.append('endDate', filters.dateRange.end.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/users/activity?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user activity data');
    }

    return response.json();
  }

  async getActivityLog(token: string, limit: number = 50): Promise<ActivityLog[]> {
    const response = await fetch(`${this.baseUrl}/activity?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch activity log');
    }

    return response.json();
  }

  async getPeakHours(token: string): Promise<{ hour: number; count: number }[]> {
    const response = await fetch(`${this.baseUrl}/peak-hours`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch peak hours data');
    }

    return response.json();
  }

  async getResponseTimeStats(token: string): Promise<{ average: number; median: number; min: number; max: number }> {
    const response = await fetch(`${this.baseUrl}/response-time`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch response time stats');
    }

    return response.json();
  }

  // Admin functions
  async getAllUsers() {
    const response = await fetch('/api/admin/users');
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return response.json();
  }

  async updateUser(userId: string, data: any) {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update user');
    }

    return response.json();
  }

  async deleteUser(userId: string) {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }

    return response.json();
  }
}

export const dashboardService = new DashboardService();