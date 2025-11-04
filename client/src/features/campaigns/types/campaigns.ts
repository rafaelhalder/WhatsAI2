export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  templateId: string;
  template?: {
    id: string;
    name: string;
    content: string;
  };
  instanceId: string;
  instance?: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  recipients: CampaignRecipient[];
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  stats?: CampaignStats; // Opcional porque pode não vir na criação
  settings?: CampaignSettings; // Opcional também
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipient {
  phoneNumber: string;
  name?: string;
  variables?: Record<string, string>;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt?: string;
  error?: string;
}

export interface CampaignStats {
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
}

export interface CampaignSettings {
  delayBetweenMessages: number; // milliseconds
  maxMessagesPerMinute: number;
  retryOnFailure: boolean;
  maxRetries: number;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  message: string; // Mensagem da campanha (obrigatório)
  templateId?: string;
  instanceId: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  recipients: Array<{
    phone: string; // Backend espera 'phone', não 'phoneNumber'
    variables?: Record<string, string>;
  }>;
  scheduledFor?: string;
  rateLimit?: number;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  scheduledAt?: string;
  settings?: Partial<CampaignSettings>;
}

export interface CampaignAction {
  action: 'start' | 'pause' | 'resume' | 'cancel';
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendada',
  RUNNING: 'Em execução',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  FAILED: 'Falhou'
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  DRAFT: 'badge-ghost',
  SCHEDULED: 'badge-info',
  RUNNING: 'badge-primary',
  PAUSED: 'badge-warning',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-error',
  FAILED: 'badge-error'
};
