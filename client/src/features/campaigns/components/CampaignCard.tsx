import React from 'react';
import { 
  Send, Edit2, Trash2, Play, Pause, Square, Calendar, 
  Users, CheckCircle, XCircle, Clock, FileDown, BarChart3
} from 'lucide-react';
import { Campaign, CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from '../types/campaigns';

interface CampaignCardProps {
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onViewReport?: (id: string) => void;
  onExportCSV?: (id: string) => void;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onEdit,
  onDelete,
  onStart,
  onPause,
  onResume,
  onCancel,
  onViewReport,
  onExportCSV
}) => {
  const stats = campaign.stats || {
    totalRecipients: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    pending: 0
  };
  const progress = stats.totalRecipients > 0 
    ? ((stats.sent + stats.failed) / stats.totalRecipients) * 100 
    : 0;

  // Debug: Log when campaign stats change
  React.useEffect(() => {
    if (campaign.status === 'RUNNING' || campaign.status === 'COMPLETED') {
      console.log(`[CARD] 🔄 Campaign ${campaign.id} stats updated:`, {
        status: campaign.status,
        stats,
        progress: Math.round(progress)
      });
    }
  }, [campaign.status, stats.sent, stats.delivered, stats.failed, stats.pending]);

  const canStart = campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED';
  const canPause = campaign.status === 'RUNNING';
  const canResume = campaign.status === 'PAUSED';
  const canCancel = ['DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED'].includes(campaign.status);
  const canEdit = campaign.status === 'DRAFT';
  const canDelete = ['DRAFT', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(campaign.status);

  return (
    <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all border border-base-300">
      <div className="card-body p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate" title={campaign.name}>
                {campaign.name}
              </h3>
              {campaign.description && (
                <p className="text-sm text-base-content/70 truncate">
                  {campaign.description}
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <span className={`badge ${CAMPAIGN_STATUS_COLORS[campaign.status]}`}>
            {CAMPAIGN_STATUS_LABELS[campaign.status]}
          </span>
        </div>

        {/* Template & Instance Info */}
        <div className="space-y-2 mb-3">
          {campaign.template && (
            <div className="text-sm flex items-center gap-2">
              <span className="text-base-content/60">Template:</span>
              <span className="font-medium">{campaign.template.name}</span>
            </div>
          )}
          {campaign.instance && (
            <div className="text-sm flex items-center gap-2">
              <span className="text-base-content/60">Instância:</span>
              <span className="font-medium">{campaign.instance.name}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-base-content/60">Progresso</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-base-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-base-200 rounded-lg p-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-info" />
            <div>
              <div className="text-xs text-base-content/60">Total</div>
              <div className="font-semibold">{stats.totalRecipients}</div>
            </div>
          </div>
          
          <div className="bg-base-200 rounded-lg p-2 flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            <div>
              <div className="text-xs text-base-content/60">Enviados</div>
              <div className="font-semibold">{stats.sent}</div>
            </div>
          </div>

          <div className="bg-base-200 rounded-lg p-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <div>
              <div className="text-xs text-base-content/60">Entregues</div>
              <div className="font-semibold">{stats.delivered}</div>
            </div>
          </div>

          <div className="bg-base-200 rounded-lg p-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-error" />
            <div>
              <div className="text-xs text-base-content/60">Falhas</div>
              <div className="font-semibold">{stats.failed}</div>
            </div>
          </div>
        </div>

        {/* Scheduled/Started Time */}
        {campaign.scheduledAt && campaign.status === 'SCHEDULED' && (
          <div className="alert alert-info py-2 mb-3">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              Agendada para {new Date(campaign.scheduledAt).toLocaleString('pt-BR')}
            </span>
          </div>
        )}

        {campaign.startedAt && campaign.status === 'RUNNING' && (
          <div className="alert alert-primary py-2 mb-3">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Iniciada em {new Date(campaign.startedAt).toLocaleString('pt-BR')}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-base-300">
          {/* View Report Button - Show for completed or running campaigns */}
          {(campaign.status === 'COMPLETED' || campaign.status === 'RUNNING' || campaign.status === 'PAUSED') && onViewReport && (
            <button
              onClick={() => onViewReport(campaign.id)}
              className="btn btn-sm btn-info"
              title="Ver relatório detalhado"
            >
              <BarChart3 className="w-4 h-4" />
              Relatório
            </button>
          )}

          {/* Export CSV Button - Show for completed campaigns */}
          {campaign.status === 'COMPLETED' && onExportCSV && (
            <button
              onClick={() => onExportCSV(campaign.id)}
              className="btn btn-sm btn-success"
              title="Exportar CSV"
            >
              <FileDown className="w-4 h-4" />
              Exportar
            </button>
          )}

          {canStart && (
            <button
              onClick={() => onStart(campaign.id)}
              className="btn btn-sm btn-primary flex-1"
              title="Iniciar campanha"
            >
              <Play className="w-4 h-4" />
              Iniciar
            </button>
          )}

          {canPause && (
            <button
              onClick={() => onPause(campaign.id)}
              className="btn btn-sm btn-warning flex-1"
              title="Pausar campanha"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
          )}

          {canResume && (
            <button
              onClick={() => onResume(campaign.id)}
              className="btn btn-sm btn-success flex-1"
              title="Retomar campanha"
            >
              <Play className="w-4 h-4" />
              Retomar
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => {
                if (confirm(`Deseja realmente cancelar a campanha "${campaign.name}"?`)) {
                  onCancel(campaign.id);
                }
              }}
              className="btn btn-sm btn-ghost btn-error"
              title="Cancelar campanha"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onEdit(campaign)}
              className="btn btn-sm btn-ghost"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => {
                if (confirm(`Deseja realmente excluir a campanha "${campaign.name}"?`)) {
                  onDelete(campaign.id);
                }
              }}
              className="btn btn-sm btn-ghost text-error"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-base-content/50 pt-2">
          Criada em {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>
  );
};
