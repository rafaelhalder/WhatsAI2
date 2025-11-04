import React, { useState, useEffect } from 'react';
import { Plus, Send, AlertCircle, Filter } from 'lucide-react';
import { campaignsService } from '../services/campaignsService';
import { Campaign, CampaignStatus, CAMPAIGN_STATUS_LABELS } from '../types/campaigns';
import { userAuthStore } from '../../auth/store/authStore';
import { CampaignCard } from '../components/CampaignCard';
import { CreateCampaignModal } from '../components/CreateCampaignModal';
import { CampaignReportModal } from '../components/CampaignReportModal';
import { UpgradeModal } from '../../plans/components/UpgradeModal';
import { plansService } from '../../plans/services/plansService';
import { PlanType } from '../../plans/types/plans';
import { socketService } from '../../../services/socketService';

export const CampaignsPage: React.FC = () => {
  const { token } = userAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportCampaignId, setReportCampaignId] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<PlanType>('FREE');
  const [currentUsage, setCurrentUsage] = useState(0);
  const [limit, setLimit] = useState(3);
  const [instances, setInstances] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadCampaigns();
    loadPlanInfo();
    loadInstances();
  }, [token]);

  // Setup WebSocket listeners for campaign progress
  useEffect(() => {
    console.log('[CAMPAIGNS] 📡 Configurando listeners WebSocket para progresso de campanhas');
    
    const handleCampaignProgress = (progress: any) => {
      console.log('[CAMPAIGNS] 📊 Progress update received:', progress);
      console.log('[CAMPAIGNS] 📊 Current campaigns:', campaigns.map(c => ({ id: c.id, status: c.status })));
      
      // Update campaign in the list with new progress
      setCampaigns(prevCampaigns => {
        const updated = prevCampaigns.map(campaign => 
          campaign.id === progress.campaignId 
            ? { 
                ...campaign, 
                status: progress.status,
                stats: {
                  ...(campaign.stats || { totalRecipients: 0, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 }),
                  sent: progress.sentCount || 0,
                  delivered: progress.deliveredCount || 0,
                  failed: progress.failedCount || 0,
                  pending: progress.pendingCount || 0
                }
              }
            : campaign
        );
        console.log('[CAMPAIGNS] 📊 Updated campaigns:', updated.map(c => ({ id: c.id, status: c.status, stats: c.stats })));
        return updated;
      });
    };

    const handleCampaignCompleted = (progress: any) => {
      console.log('[CAMPAIGNS] ✅ Campaign completed:', progress);
      
      // Update campaign status to completed
      setCampaigns(prevCampaigns => {
        const updated = prevCampaigns.map(campaign => 
          campaign.id === progress.campaignId 
            ? { 
                ...campaign, 
                status: 'COMPLETED' as CampaignStatus,
                stats: {
                  ...(campaign.stats || { totalRecipients: 0, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 }),
                  sent: progress.sentCount || 0,
                  delivered: progress.deliveredCount || 0,
                  failed: progress.failedCount || 0,
                  pending: 0
                }
              }
            : campaign
        );
        console.log('[CAMPAIGNS] ✅ Updated to completed:', updated.find(c => c.id === progress.campaignId));
        return updated;
      });
    };

    socketService.on('campaign:progress', handleCampaignProgress);
    socketService.on('campaign:completed', handleCampaignCompleted);

    return () => {
      // Note: socketService doesn't have an 'off' method, so we can't clean up
      // This is okay as the listeners are stored in a Map and reused
    };
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, statusFilter]);

  const loadCampaigns = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await campaignsService.getCampaigns(token);
      setCampaigns(data);
      
      // Join instance rooms for running campaigns to receive WebSocket updates
      const runningCampaigns = data.filter(c => c.status === 'RUNNING');
      runningCampaigns.forEach(campaign => {
        console.log('[CAMPAIGNS] 📡 Joining instance room for running campaign:', campaign.instanceId);
        socketService.joinInstance(campaign.instanceId);
      });
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanInfo = async () => {
    if (!token) return;

    try {
      const [planData, usageData] = await Promise.all([
        plansService.getCurrentPlan(token),
        plansService.getUsage(token)
      ]);
      setCurrentPlan(planData.plan);
      setCurrentUsage(usageData.campaigns?.current ?? 0);
      setLimit(usageData.campaigns?.limit ?? -1);
    } catch (error) {
      console.error('Error loading plan info:', error);
    }
  };

  const loadInstances = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/instances', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInstances(data.data.map((inst: any) => ({ id: inst.id, name: inst.name })));
      }
    } catch (error) {
      console.error('Error loading instances:', error);
    }
  };

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    setFilteredCampaigns(filtered);
  };

  const handleCreateClick = async () => {
    if (!token) return;

    if (limit !== -1 && currentUsage >= limit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    setEditingCampaign(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;

    try {
      await campaignsService.deleteCampaign(token, id);
      await loadCampaigns();
      await loadPlanInfo();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Erro ao excluir campanha');
    }
  };

  const handleStart = async (id: string) => {
    if (!token) return;

    try {
      await campaignsService.performAction(token, id, 'start');
      await loadCampaigns();
      
      // Join instance room when starting campaign to receive real-time updates
      const campaign = campaigns.find(c => c.id === id);
      if (campaign) {
        console.log('[CAMPAIGNS] 🚀 Starting campaign, joining instance room:', campaign.instanceId);
        socketService.joinInstance(campaign.instanceId);
      }
    } catch (error: any) {
      console.error('Error starting campaign:', error);
      alert(error.message || 'Erro ao iniciar campanha');
    }
  };

  const handlePause = async (id: string) => {
    if (!token) return;

    try {
      await campaignsService.performAction(token, id, 'pause');
      await loadCampaigns();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      alert('Erro ao pausar campanha');
    }
  };

  const handleResume = async (id: string) => {
    if (!token) return;

    try {
      await campaignsService.performAction(token, id, 'resume');
      await loadCampaigns();
    } catch (error) {
      console.error('Error resuming campaign:', error);
      alert('Erro ao retomar campanha');
    }
  };

  const handleCancel = async (id: string) => {
    if (!token) return;

    try {
      await campaignsService.performAction(token, id, 'cancel');
      await loadCampaigns();
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      alert('Erro ao cancelar campanha');
    }
  };

  const handleViewReport = async (id: string) => {
    if (!token) return;

    setReportCampaignId(id);
    setIsReportModalOpen(true);
  };

  const handleExportCSV = async (id: string) => {
    if (!token) return;

    try {
      await campaignsService.exportCampaignCSV(token, id);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Erro ao exportar CSV');
    }
  };

  const handleModalSuccess = async () => {
    await loadCampaigns();
    await loadPlanInfo();
    
    // If a campaign was just created and started, join its instance room
    const runningCampaigns = campaigns.filter(c => c.status === 'RUNNING');
    runningCampaigns.forEach(campaign => {
      socketService.joinInstance(campaign.instanceId);
    });
  };

  const handleUpgrade = async (plan: PlanType) => {
    if (!token) return;
    try {
      await plansService.upgradePlan(token, plan);
      await loadPlanInfo();
      alert(`Plano alterado para ${plan} com sucesso!`);
    } catch (error: any) {
      alert(error.message || 'Erro ao fazer upgrade');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Send className="w-8 h-8 text-primary" />
              Campanhas de Envio
            </h1>
            <p className="text-base-content/70 mt-1">
              Gerencie e monitore suas campanhas de envio em massa
            </p>
          </div>
          <button onClick={handleCreateClick} className="btn btn-primary gap-2">
            <Plus className="w-5 h-5" />
            Nova Campanha
          </button>
        </div>

        {/* Usage Warning */}
        {limit !== -1 && currentUsage >= limit * 0.8 && (
          <div className={`alert ${currentUsage >= limit ? 'alert-error' : 'alert-warning'}`}>
            <AlertCircle className="w-5 h-5" />
            <div>
              <div className="font-semibold">
                {currentUsage >= limit ? 'Limite de campanhas atingido!' : 'Atenção: Limite próximo'}
              </div>
              <div className="text-sm">
                Você está usando {currentUsage} de {limit} campanhas disponíveis no plano {currentPlan}.
                {currentUsage >= limit && ' Faça upgrade para criar mais campanhas.'}
              </div>
            </div>
            {currentUsage >= limit && (
              <button onClick={() => setIsUpgradeModalOpen(true)} className="btn btn-sm">
                Ver Planos
              </button>
            )}
          </div>
        )}

        {/* Filter */}
        <div className="bg-base-100 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-base-content/60" />
            <select
              className="select select-bordered flex-1 md:flex-initial md:w-64"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os Status</option>
              {(Object.keys(CAMPAIGN_STATUS_LABELS) as CampaignStatus[]).map((status) => (
                <option key={status} value={status}>
                  {CAMPAIGN_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <span className="text-sm text-base-content/60">
              {filteredCampaigns.length} de {campaigns.length} campanha(s)
            </span>
          </div>
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-16">
            <Send className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {campaigns.length === 0 ? 'Nenhuma campanha criada' : 'Nenhuma campanha encontrada'}
            </h3>
            <p className="text-base-content/60 mb-6">
              {campaigns.length === 0
                ? 'Comece criando sua primeira campanha de envio em massa'
                : 'Tente ajustar o filtro de status'}
            </p>
            {campaigns.length === 0 && (
              <button onClick={handleCreateClick} className="btn btn-primary gap-2">
                <Plus className="w-5 h-5" />
                Criar Primeira Campanha
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
                onViewReport={handleViewReport}
                onExportCSV={handleExportCSV}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <CreateCampaignModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingCampaign(null);
          }}
          onSuccess={handleModalSuccess}
          editCampaign={editingCampaign}
          instances={instances}
        />

        {token && (
          <CampaignReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            campaignId={reportCampaignId}
            token={token}
          />
        )}

        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          onUpgrade={handleUpgrade}
          currentPlan={currentPlan}
          limitType="campaigns"
          currentUsage={currentUsage}
          limit={limit}
        />
      </div>
    </div>
  );
};
