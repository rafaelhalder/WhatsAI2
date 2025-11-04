// Core types for WhatsApp instance management
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface WhatsAppInstance {
  id: string;
  name: string;
  apiKey: string;
  serverUrl: string;
  status: InstanceStatus;
  qrCode?: string;
  connected: boolean;
  lastSeen?: Date;
  connectedAt?: Date;
  webhook?: string;
  evolutionInstanceName: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum InstanceStatus {
  PENDING = 'pending',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  NOT_FOUND = 'not_found' // Instância não existe mais na Evolution API
}

export interface QRCodeData {
  code: string;
  base64: string;
  instanceId: string;
  expiresAt: Date;
}

export interface WebhookEvent {
  event: string;
  instance: string;
  data: any;
  serverUrl: string;
  timestamp: Date;
}

export interface MessageData {
  instanceId: string;
  to: string;
  message: string;
  type?: 'text' | 'image' | 'document';
  filename?: string;
  caption?: string;
}

export interface InstanceCreateRequest {
  name: string;
  apiKey: string;
  serverUrl: string;
  webhookUrl?: string;
}

export interface InstanceUpdateRequest {
  name?: string;
  webhookUrl?: string;
}

export interface ConnectionStatus {
  instanceId: string;
  connected: boolean;
  lastSeen: Date;
  qrCode?: string;
  error?: string;
}

export interface EvolutionAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface InstanceListResponse {
  instances: WhatsAppInstance[];
  total: number;
  page: number;
  limit: number;
}

// User Settings types
export interface UserSettings {
  id: string;
  userId: string;
  
  // Profile Settings (can be null in database, undefined in API)
  displayName: string | undefined;
  profilePicture: string | undefined;
  bio: string | undefined;
  
  // Theme Settings
  theme: 'light' | 'dark' | 'auto';
  language: string;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundNotifications: boolean;
  notificationFrequency: 'immediate' | 'hourly' | 'daily';
  
  // Auto-refresh Settings
  autoRefresh: boolean;
  autoRefreshInterval: number;
  
  // Privacy Settings
  showOnlineStatus: boolean;
  allowDataCollection: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserSettingsRequest {
  displayName?: string | undefined;
  profilePicture?: string | undefined;
  bio?: string | undefined;
  theme?: 'light' | 'dark' | 'auto' | undefined;
  language?: string | undefined;
  emailNotifications?: boolean | undefined;
  pushNotifications?: boolean | undefined;
  soundNotifications?: boolean | undefined;
  notificationFrequency?: 'immediate' | 'hourly' | 'daily' | undefined;
  autoRefresh?: boolean | undefined;
  autoRefreshInterval?: number | undefined;
  showOnlineStatus?: boolean | undefined;
  allowDataCollection?: boolean | undefined;
}

export interface UpdateUserSettingsRequest extends Partial<CreateUserSettingsRequest> {}

export interface UserSettingsResponse {
  settings: UserSettings;
}

// Account Deletion types
export interface DeleteAccountRequest {
  password: string;
  confirmEmail: string;
  confirmDeletion: boolean;
}

export interface AccountDeletionPreview {
  user: {
    email: string;
    name: string;
    createdAt: Date;
  };
  dataToDelete: {
    instances: number;
    messages: number;
    settings: boolean;
  };
}

export interface DeleteAccountResult {
  success: boolean;
  deletedData: {
    userId: string;
    email: string;
    instancesDeleted: number;
    messagesDeleted: number;
    settingsDeleted: boolean;
  };
}

// Dashboard types
export interface DashboardMetrics {
  totalMessages: number;
  activeInstances: number;
  totalUsers: number;
  deliveryRate: number;
  storageUsed: number;
  costs: {
    evolutionApi: number;
    storage: number;
    total: number;
  };
}

export interface MessageChartData {
  date: string;
  messages: number;
  delivered: number;
  failed: number;
}

export interface InstanceStatusData {
  status: 'online' | 'offline' | 'connecting';
  count: number;
  percentage: number;
}

export interface CostData {
  month: string;
  evolutionApi: number;
  storage: number;
  total: number;
}

export interface UserActivityData {
  date: string;
  activeUsers: number;
  newUsers: number;
}

export interface DashboardFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  instanceId?: string;
  userId?: string;
}

export interface ActivityLog {
  id: string;
  type: 'message' | 'instance' | 'user' | 'system';
  description: string;
  timestamp: Date;
  userId?: string;
  instanceId?: string;
  metadata?: Record<string, any>;
}

// Message Templates
export interface MessageTemplate {
  id: string;
  userId: string;
  name: string;
  content: string;
  category?: string;
  usageCount: number;
  variables?: string[]; // Extracted from content: {{nome}}, {{empresa}}
  mediaUrl?: string;
  mediaType?: string;
  tags?: string[];
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateRequest {
  name: string;
  content: string;
  category?: string;
  mediaUrl?: string;
  mediaType?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  content?: string;
  category?: string;
  mediaUrl?: string;
  mediaType?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface RenderTemplateRequest {
  templateId: string;
  variables: Record<string, string>; // { "nome": "João", "empresa": "ACME" }
}

export interface RenderTemplateResponse {
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface TemplateUsageStats {
  templateId: string;
  name: string;
  usageCount: number;
  lastUsed?: Date;
  category?: string;
}

// Campaigns and Bulk Messaging
export interface Campaign {
  id: string;
  userId: string;
  name: string;
  status: CampaignStatus;
  instanceId: string;
  templateId?: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  rateLimit: number;
  recipientsData?: Recipient[];
  stats?: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    pending: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignStatus = 
  | 'DRAFT' 
  | 'SCHEDULED' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'FAILED';

export interface Recipient {
  phone: string;
  variables?: Record<string, string> | undefined;
}

export interface CampaignMessage {
  id: string;
  campaignId: string;
  recipient: string;
  status: CampaignMessageStatus;
  message: string;
  variables?: Record<string, string>;
  messageId?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
}

export type CampaignMessageStatus = 
  | 'PENDING' 
  | 'SENT' 
  | 'DELIVERED' 
  | 'FAILED';

export interface CreateCampaignRequest {
  name: string;
  instanceId: string;
  templateId?: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  recipients: Recipient[];
  scheduledFor?: Date;
  rateLimit?: number;
}

export interface UpdateCampaignRequest {
  name?: string;
  message?: string;
  mediaUrl?: string;
  mediaType?: string;
  scheduledFor?: Date;
  rateLimit?: number;
}

export interface CampaignProgress {
  campaignId: string;
  status: CampaignStatus;
  progress: number; // 0-100
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  estimatedTimeRemaining?: number; // seconds
  currentRate?: number; // messages per minute
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalMessagesSent: number;
  averageDeliveryRate: number;
  recentCampaigns: Campaign[];
}
