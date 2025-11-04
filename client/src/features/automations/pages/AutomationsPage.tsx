import React, { useState, useEffect } from 'react';
import { userAuthStore } from '../../auth/store/authStore';
import { Bot, Clock, BarChart3, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { automationsService } from '../services/automationsService';
import type { AutoResponse, AutomationStats, CreateAutoResponseRequest } from '../services/automationsService';
import { AutoResponseCard } from '../components/AutoResponseCard';
import { CreateAutoResponseModal } from '../components/CreateAutoResponseModal';
import { instanceService } from '../../instances/services/instanceService';

type TabType = 'auto-responses' | 'out-of-office' | 'stats';

export const AutomationsPage: React.FC = () => {
  const { token } = userAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('auto-responses');
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [autoResponses, setAutoResponses] = useState<AutoResponse[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAutoResponse, setEditingAutoResponse] = useState<AutoResponse | null>(null);

  // Out of office states
  const [outOfOfficeEnabled, setOutOfOfficeEnabled] = useState(false);
  const [outOfOfficeMessage, setOutOfOfficeMessage] = useState('');
  const [businessHoursStart, setBusinessHoursStart] = useState('09:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState('18:00');
  const [isSavingOutOfOffice, setIsSavingOutOfOffice] = useState(false);

  useEffect(() => {
    loadInstances();
  }, [token]);

  useEffect(() => {
    if (selectedInstanceId) {
      if (activeTab === 'auto-responses') {
        loadAutoResponses();
      } else if (activeTab === 'stats') {
        loadStats();
      } else if (activeTab === 'out-of-office') {
        loadOutOfOfficeSettings();
      }
    }
  }, [selectedInstanceId, activeTab, token]);

  const loadInstances = async () => {
    if (!token) return;

    try {
      const data = await instanceService.getInstances(token);
      setInstances(data);
      if (data.length > 0 && !selectedInstanceId) {
        setSelectedInstanceId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load instances:', error);
    }
  };

  const loadAutoResponses = async () => {
    if (!token || !selectedInstanceId) return;

    setIsLoading(true);
    try {
      const data = await automationsService.listAutoResponses(token, selectedInstanceId);
      setAutoResponses(data);
    } catch (error) {
      console.error('Failed to load auto-responses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!token || !selectedInstanceId) return;

    setIsLoading(true);
    try {
      const data = await automationsService.getAutomationStats(token, selectedInstanceId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOutOfOfficeSettings = async () => {
    if (!token || !selectedInstanceId) return;

    setIsLoading(true);
    try {
      const instance = instances.find(i => i.id === selectedInstanceId);
      if (instance) {
        setOutOfOfficeEnabled(instance.outOfOfficeEnabled || false);
        setOutOfOfficeMessage(instance.outOfOfficeMessage || '');
        setBusinessHoursStart(instance.businessHoursStart || '09:00');
        setBusinessHoursEnd(instance.businessHoursEnd || '18:00');
      }
    } catch (error) {
      console.error('Failed to load out of office settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAutoResponse = async (data: CreateAutoResponseRequest) => {
    if (!token) return;

    await automationsService.createAutoResponse(token, data);
    await loadAutoResponses();
  };

  const handleUpdateAutoResponse = async (data: CreateAutoResponseRequest) => {
    if (!token || !editingAutoResponse) return;

    await automationsService.updateAutoResponse(token, editingAutoResponse.id, data);
    await loadAutoResponses();
    setEditingAutoResponse(null);
  };

  const handleDeleteAutoResponse = async (id: string) => {
    if (!token) return;
    if (!confirm('Tem certeza que deseja deletar esta auto-resposta?')) return;

    try {
      await automationsService.deleteAutoResponse(token, id);
      await loadAutoResponses();
    } catch (error) {
      console.error('Failed to delete auto-response:', error);
      alert('Erro ao deletar auto-resposta');
    }
  };

  const handleToggleAutoResponse = async (id: string) => {
    if (!token) return;

    try {
      await automationsService.toggleAutoResponse(token, id);
      await loadAutoResponses();
    } catch (error) {
      console.error('Failed to toggle auto-response:', error);
      alert('Erro ao alternar status');
    }
  };

  const handleEditAutoResponse = (autoResponse: AutoResponse) => {
    setEditingAutoResponse(autoResponse);
    setIsModalOpen(true);
  };

  const handleSaveOutOfOffice = async () => {
    if (!token || !selectedInstanceId) return;

    setIsSavingOutOfOffice(true);
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          outOfOfficeEnabled,
          outOfOfficeMessage,
          businessHoursStart,
          businessHoursEnd,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update instance');
      }

      alert('Configurações salvas com sucesso!');
      await loadInstances(); // Reload to update local state
    } catch (error) {
      console.error('Failed to save out of office settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setIsSavingOutOfOffice(false);
    }
  };

  const insertVariableInOutOfOffice = (variable: string) => {
    setOutOfOfficeMessage(outOfOfficeMessage + `{${variable}}`);
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
          <p className="text-lg">Faça login para acessar as automações</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="w-8 h-8" />
            Automações
          </h1>
          <p className="text-base-content/70 mt-1">
            Configure respostas automáticas e horário de atendimento
          </p>
        </div>

        {/* Instance Selector */}
        {instances.length > 0 && (
          <select
            className="select select-bordered"
            value={selectedInstanceId}
            onChange={(e) => setSelectedInstanceId(e.target.value)}
          >
            {instances.map((instance) => (
              <option key={instance.id} value={instance.id}>
                {instance.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === 'auto-responses' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('auto-responses')}
        >
          <Bot className="w-4 h-4 mr-2" />
          Auto-Respostas
        </button>
        <button
          className={`tab ${activeTab === 'out-of-office' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('out-of-office')}
        >
          <Clock className="w-4 h-4 mr-2" />
          Horário Comercial
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Estatísticas
        </button>
      </div>

      {/* Auto-Responses Tab */}
      {activeTab === 'auto-responses' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Regras de Auto-Resposta</h2>
            <button
              onClick={() => {
                setEditingAutoResponse(null);
                setIsModalOpen(true);
              }}
              className="btn btn-primary"
              disabled={!selectedInstanceId}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Regra
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : autoResponses.length === 0 ? (
            <div className="text-center py-12 bg-base-200 rounded-lg">
              <Bot className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
              <p className="text-lg text-base-content/70">Nenhuma auto-resposta configurada</p>
              <p className="text-sm text-base-content/50 mt-2">
                Clique em "Nova Regra" para começar
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {autoResponses.map((autoResponse) => (
                <AutoResponseCard
                  key={autoResponse.id}
                  autoResponse={autoResponse}
                  onEdit={handleEditAutoResponse}
                  onDelete={handleDeleteAutoResponse}
                  onToggle={handleToggleAutoResponse}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Out of Office Tab */}
      {activeTab === 'out-of-office' && (
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold mb-4">Mensagem Fora do Horário</h2>

          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              {/* Enable Toggle */}
              <div className="form-control mb-4">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="toggle toggle-success"
                    checked={outOfOfficeEnabled}
                    onChange={(e) => setOutOfOfficeEnabled(e.target.checked)}
                  />
                  <span className="label-text font-medium">
                    {outOfOfficeEnabled ? 'Habilitado' : 'Desabilitado'}
                  </span>
                </label>
              </div>

              {/* Business Hours */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Início</span>
                  </label>
                  <input
                    type="time"
                    className="input input-bordered"
                    value={businessHoursStart}
                    onChange={(e) => setBusinessHoursStart(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fim</span>
                  </label>
                  <input
                    type="time"
                    className="input input-bordered"
                    value={businessHoursEnd}
                    onChange={(e) => setBusinessHoursEnd(e.target.value)}
                  />
                </div>
              </div>

              {/* Message */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">Mensagem</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-32"
                  placeholder="Digite a mensagem que será enviada fora do horário comercial..."
                  value={outOfOfficeMessage}
                  onChange={(e) => setOutOfOfficeMessage(e.target.value)}
                />
              </div>

              {/* Variables */}
              <div className="mb-4 p-4 bg-info/10 rounded-lg">
                <p className="text-sm text-base-content/70 mb-3">
                  Variáveis disponíveis:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertVariableInOutOfOffice('nome')}
                    className="btn btn-xs btn-outline"
                  >
                    {'{nome}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariableInOutOfOffice('hora')}
                    className="btn btn-xs btn-outline"
                  >
                    {'{hora}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariableInOutOfOffice('data')}
                    className="btn btn-xs btn-outline"
                  >
                    {'{data}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariableInOutOfOffice('horario_inicio')}
                    className="btn btn-xs btn-outline"
                  >
                    {'{horario_inicio}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariableInOutOfOffice('horario_fim')}
                    className="btn btn-xs btn-outline"
                  >
                    {'{horario_fim}'}
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveOutOfOffice}
                className="btn btn-primary"
                disabled={isSavingOutOfOffice}
              >
                {isSavingOutOfOffice ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Estatísticas de Automação</h2>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : stats ? (
            <div>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="stat bg-base-100 shadow rounded-lg">
                  <div className="stat-title">Total de Regras</div>
                  <div className="stat-value text-primary">{stats.totalRules}</div>
                </div>
                <div className="stat bg-base-100 shadow rounded-lg">
                  <div className="stat-title">Regras Ativas</div>
                  <div className="stat-value text-success">{stats.activeRules}</div>
                </div>
                <div className="stat bg-base-100 shadow rounded-lg">
                  <div className="stat-title">Regras Inativas</div>
                  <div className="stat-value text-base-content/50">{stats.inactiveRules}</div>
                </div>
                <div className="stat bg-base-100 shadow rounded-lg">
                  <div className="stat-title">Total de Acionamentos</div>
                  <div className="stat-value text-info">{stats.totalTriggers}</div>
                </div>
              </div>

              {/* Most Used */}
              {stats.mostUsed.length > 0 && (
                <div className="card bg-base-100 shadow-md">
                  <div className="card-body">
                    <h3 className="card-title">Mais Usadas</h3>
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Acionamentos</th>
                            <th>Último Uso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.mostUsed.map((item) => (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td>
                                <span className="badge badge-primary">{item.triggerCount}</span>
                              </td>
                              <td>
                                {item.lastTriggeredAt
                                  ? new Date(item.lastTriggeredAt).toLocaleString('pt-BR')
                                  : 'Nunca'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-base-200 rounded-lg">
              <BarChart3 className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
              <p className="text-lg text-base-content/70">Nenhuma estatística disponível</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <CreateAutoResponseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAutoResponse(null);
        }}
        onSubmit={editingAutoResponse ? handleUpdateAutoResponse : handleCreateAutoResponse}
        instanceId={selectedInstanceId}
        editingAutoResponse={editingAutoResponse}
      />
    </div>
  );
};
