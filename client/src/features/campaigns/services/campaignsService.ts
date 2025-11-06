import { Campaign, CreateCampaignRequest, UpdateCampaignRequest, CampaignAction } from '../types/campaigns';

class CampaignsService {
  private baseUrl = '/api/campaigns';

  /**
   * Get all campaigns for the current user
   */
  async getCampaigns(token: string, params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Campaign[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));

    const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch campaigns');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get a specific campaign by ID
   */
  async getCampaignById(token: string, id: string): Promise<Campaign> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch campaign');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Create a new campaign
   */
  async createCampaign(token: string, campaign: CreateCampaignRequest): Promise<Campaign> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaign)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create campaign');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(token: string, id: string, updates: UpdateCampaignRequest): Promise<Campaign> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update campaign');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(token: string, id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete campaign');
    }
  }

  /**
   * Perform an action on a campaign (start, pause, resume, cancel)
   */
  async performAction(token: string, id: string, action: CampaignAction['action']): Promise<Campaign> {
    const response = await fetch(`${this.baseUrl}/${id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to ${action} campaign`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(token: string, id: string): Promise<Campaign['stats']> {
    const response = await fetch(`${this.baseUrl}/${id}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch campaign stats');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get overall campaign statistics for user
   */
  async getOverallStats(token: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch overall campaign stats');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get campaign progress
   */
  async getCampaignProgress(token: string, id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${id}/progress`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch campaign progress');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get detailed campaign report
   */
  async getCampaignReport(token: string, id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${id}/report`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch campaign report');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Export campaign results to CSV
   */
  async exportCampaignCSV(token: string, id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}/export`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to export campaign');
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : `campanha-${id}.csv`;

    // Download file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const campaignsService = new CampaignsService();

