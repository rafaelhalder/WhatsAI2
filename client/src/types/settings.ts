/**
 * Configurações do usuário - Types e Defaults
 */

export interface UserSettings {
  notifications: {
    push: boolean;
    instanceStatus: boolean;
    qrCodeReady: boolean;
  };
  autoRefresh: {
    enabled: boolean;
    interval: number;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
  };
  privacy?: {
    showOnlineStatus: boolean;
    allowDataCollection: boolean;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  notifications: {
    push: true,
    instanceStatus: true,
    qrCodeReady: true,
  },
  autoRefresh: {
    enabled: true,
    interval: 5,
  },
  appearance: {
    theme: 'light',
  },
  privacy: {
    showOnlineStatus: true,
    allowDataCollection: false,
  },
};

export const STORAGE_KEY = 'whatsai_settings';
