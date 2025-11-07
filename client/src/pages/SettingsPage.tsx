import toast from 'react-hot-toast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { UserSettings, DEFAULT_SETTINGS, STORAGE_KEY } from '../types/settings';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  // Settings state com persistência em localStorage
  const [settings, setSettings] = useLocalStorage<UserSettings>(STORAGE_KEY, DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [savedSettings, setSavedSettings] = useState<UserSettings>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // Detectar mudanças não salvas
  useEffect(() => {
    const isDifferent = JSON.stringify(settings) !== JSON.stringify(savedSettings);
    setHasUnsavedChanges(isDifferent);
  }, [settings, savedSettings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    
    // Simular async save (no futuro será chamada ao backend)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Settings são automaticamente salvos no localStorage pelo hook
    toast.success('✅ Configurações salvas com sucesso!');
    console.log('✅ Settings saved to localStorage:', settings);
    
    // Forçar atualização do tema disparando um evento de storage
    window.dispatchEvent(new Event('storage'));
    
    // Marcar como salvo
    setSavedSettings(settings);
    
    setSaving(false);
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    toast.success('✅ Configurações restauradas para o padrão');
    console.log('🔄 Settings reset to default');
    setShowResetModal(false);
  };

  const confirmReset = () => {
    setShowResetModal(true);
  };

  // Handler para toggle de Push Notifications
  const handlePushNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      // Verificar se browser suporta notificações
      if (!('Notification' in window)) {
        toast.error('Seu navegador não suporta notificações push');
        return;
      }

      // Pedir permissão
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Permissão de notificações negada');
          return;
        } else {
          toast.success('Notificações push habilitadas! 🔔');
        }
      } else if (Notification.permission === 'denied') {
        toast.error('Permissão de notificações negada. Habilite nas configurações do navegador.');
        return;
      }
    }

    // Atualizar settings
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, push: enabled }
    });
  };

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-base-content mb-2">Configurações</h1>
          <p className="text-base-content/70">Personalize sua experiência no WhatsAI</p>
        </div>

        {/* Notifications Settings */}
        <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-base-content mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notificações
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-base-content">Notificações Push</p>
                <p className="text-sm text-base-content/60">Receba notificações no navegador</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) => handlePushNotificationToggle(e.target.checked)}
                className="toggle toggle-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-base-content">Status de Instâncias</p>
                <p className="text-sm text-base-content/60">Alertas quando instâncias mudarem de status</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.instanceStatus}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, instanceStatus: e.target.checked }
                })}
                className="toggle toggle-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-base-content">QR Code Pronto</p>
                <p className="text-sm text-base-content/60">Notificar quando QR Code estiver disponível</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.qrCodeReady}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, qrCodeReady: e.target.checked }
                })}
                className="toggle toggle-primary"
              />
            </div>
          </div>
        </div>

        {/* Auto-Refresh Settings */}
        <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-base-content mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualização Automática
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-base-content">Atualização Automática</p>
                <p className="text-sm text-base-content/60">Atualizar status das instâncias automaticamente</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoRefresh.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  autoRefresh: { ...settings.autoRefresh, enabled: e.target.checked }
                })}
                className="toggle toggle-primary"
              />
            </div>

            {settings.autoRefresh.enabled && (
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-2">
                  Intervalo de Atualização (segundos)
                </label>
                <select
                  value={settings.autoRefresh.interval}
                  onChange={(e) => setSettings({
                    ...settings,
                    autoRefresh: { ...settings.autoRefresh, interval: parseInt(e.target.value) }
                  })}
                  className="select select-bordered w-full"
                >
                  <option value="3">3 segundos</option>
                  <option value="5">5 segundos</option>
                  <option value="10">10 segundos</option>
                  <option value="30">30 segundos</option>
                  <option value="60">1 minuto</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-base-content mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Aparência
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-base-content/70 mb-2">
                Tema
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, theme: 'light' }
                  })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.appearance.theme === 'light'
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 hover:border-base-content/30'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2 text-base-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm font-medium text-base-content">Claro</p>
                </button>

                <button
                  onClick={() => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, theme: 'dark' }
                  })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.appearance.theme === 'dark'
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 hover:border-base-content/30'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2 text-base-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <p className="text-sm font-medium text-base-content">Escuro</p>
                </button>

                <button
                  onClick={() => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, theme: 'auto' }
                  })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.appearance.theme === 'auto'
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 hover:border-base-content/30'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2 text-base-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-sm font-medium text-base-content">Auto</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-base-content mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Privacidade
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-base-content">Mostrar Status Online</p>
                <p className="text-sm text-base-content/60">Permitir que outros vejam quando você está online</p>
              </div>
              <input
                type="checkbox"
                checked={settings.privacy?.showOnlineStatus ?? true}
                onChange={(e) => setSettings({
                  ...settings,
                  privacy: { ...settings.privacy, showOnlineStatus: e.target.checked }
                })}
                className="toggle toggle-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-base-content">Coleta de Dados</p>
                <p className="text-sm text-base-content/60">Permitir coleta de dados anônimos para melhorias</p>
              </div>
              <input
                type="checkbox"
                checked={settings.privacy?.allowDataCollection ?? false}
                onChange={(e) => setSettings({
                  ...settings,
                  privacy: { ...settings.privacy, allowDataCollection: e.target.checked }
                })}
                className="toggle toggle-primary"
              />
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-base-content mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Zona de Perigo
          </h2>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full text-left px-4 py-3 bg-error/10 rounded-lg hover:bg-error/20 transition-colors border border-error/30"
            >
              <p className="font-medium text-error">Excluir Conta</p>
              <p className="text-sm text-error/80">Remover permanentemente sua conta e todos os dados</p>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className={`flex-1 btn btn-primary border-0 ${hasUnsavedChanges ? 'btn-warning' : ''}`}
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Salvando...
              </>
            ) : hasUnsavedChanges ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                * Alterações Não Salvas
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Salvar Configurações
              </>
            )}
          </button>
          <button
            onClick={confirmReset}
            className="btn btn-ghost"
          >
            Restaurar Padrão
          </button>
        </div>

        {/* Modal de Confirmação - Restaurar Padrão */}
        {showResetModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg text-base-content">Restaurar Configurações Padrão?</h3>
              <p className="py-4 text-base-content/70">
                Isso irá restaurar todas as configurações para os valores padrão. 
                Suas preferências atuais serão perdidas.
              </p>
              <div className="modal-action">
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleResetSettings}
                  className="btn btn-warning"
                >
                  Sim, Restaurar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação - Excluir Conta */}
        {showDeleteModal && (
          <div className="modal modal-open">
            <div className="modal-box border-2 border-error">
              <h3 className="font-bold text-lg text-error flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Excluir Conta Permanentemente
              </h3>
              <p className="py-4 text-base-content/70">
                ⚠️ <strong>ATENÇÃO:</strong> Esta ação é irreversível! 
                <br/><br/>
                Sua conta e todos os dados associados (instâncias, configurações, histórico) 
                serão permanentemente excluídos.
              </p>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Digite sua senha para confirmar:</span>
                </label>
                <input 
                  type="password" 
                  placeholder="Senha" 
                  className="input input-bordered input-error"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>

              <div className="modal-action">
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                  }}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (!deletePassword) {
                      toast.error('Por favor, digite sua senha');
                      return;
                    }
                    
                    try {
                      const token = localStorage.getItem('whatsai_token') || localStorage.getItem('token');
                      
                      const response = await fetch('http://localhost:3001/api/auth/delete-account', {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ password: deletePassword }),
                      });
                      
                      const data = await response.json();
                      
                      if (data.success) {
                        toast.success('Conta excluída com sucesso');
                        // Clear localStorage and redirect
                        localStorage.clear();
                        window.location.href = '/';
                      } else {
                        toast.error(data.message || 'Erro ao excluir conta');
                      }
                    } catch (error) {
                      console.error('Delete account error:', error);
                      toast.error('Erro ao conectar com o servidor');
                    } finally {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                    }
                  }}
                  className="btn btn-error"
                  disabled={!deletePassword}
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
