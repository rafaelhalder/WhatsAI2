import React, { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, Clock, Users, CheckCircle, XCircle, Send } from 'lucide-react';
import { campaignsService } from '../services/campaignsService';

interface CampaignReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  token: string;
}

interface ReportData {
  campaign: any;
  statistics: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    successRate: number;
    failureRate: number;
    avgDeliveryTime?: number;
  };
  timeline: Array<{
    timestamp: Date;
    event: string;
    count: number;
  }>;
  failureReasons: Array<{
    error: string;
    count: number;
  }>;
  messages: Array<{
    id: string;
    recipient: string;
    status: string;
    message: string;
    variables?: any;
    error?: string;
    retryCount: number;
    sentAt?: Date;
    deliveredAt?: Date;
    failedAt?: Date;
  }>;
}

export const CampaignReportModal: React.FC<CampaignReportModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  token
}) => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const messagesPerPage = 20;

  useEffect(() => {
    if (isOpen && campaignId) {
      loadReport();
    }
  }, [isOpen, campaignId]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await campaignsService.getCampaignReport(token, campaignId);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Pagination
  const paginatedMessages = report?.messages.slice(
    (currentPage - 1) * messagesPerPage,
    currentPage * messagesPerPage
  ) || [];
  const totalPages = Math.ceil((report?.messages.length || 0) / messagesPerPage);

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-base-100 z-10 pb-4 border-b border-base-300">
          <div>
            <h3 className="text-2xl font-bold">Relatório da Campanha</h3>
            {report && (
              <p className="text-sm text-base-content/70 mt-1">{report.campaign.name}</p>
            )}
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat bg-base-200 rounded-lg shadow">
                <div className="stat-figure text-primary">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">Total</div>
                <div className="stat-value text-primary">{report.statistics.totalRecipients}</div>
                <div className="stat-desc">Destinatários</div>
              </div>

              <div className="stat bg-base-200 rounded-lg shadow">
                <div className="stat-figure text-info">
                  <Send className="w-8 h-8" />
                </div>
                <div className="stat-title">Enviados</div>
                <div className="stat-value text-info">{report.statistics.sent}</div>
                <div className="stat-desc">
                  {((report.statistics.sent / report.statistics.totalRecipients) * 100).toFixed(1)}%
                </div>
              </div>

              <div className="stat bg-base-200 rounded-lg shadow">
                <div className="stat-figure text-success">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="stat-title">Entregues</div>
                <div className="stat-value text-success">{report.statistics.delivered}</div>
                <div className="stat-desc">{report.statistics.successRate.toFixed(1)}% de sucesso</div>
              </div>

              <div className="stat bg-base-200 rounded-lg shadow">
                <div className="stat-figure text-error">
                  <XCircle className="w-8 h-8" />
                </div>
                <div className="stat-title">Falhas</div>
                <div className="stat-value text-error">{report.statistics.failed}</div>
                <div className="stat-desc">{report.statistics.failureRate.toFixed(1)}% de falha</div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-base-200 shadow">
                <div className="card-body">
                  <h3 className="card-title text-lg">Performance</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-success" />
                        Taxa de Sucesso
                      </span>
                      <span className="font-bold text-success">
                        {report.statistics.successRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-error" />
                        Taxa de Falha
                      </span>
                      <span className="font-bold text-error">
                        {report.statistics.failureRate.toFixed(2)}%
                      </span>
                    </div>
                    {report.statistics.avgDeliveryTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4 text-info" />
                          Tempo Médio de Entrega
                        </span>
                        <span className="font-bold text-info">
                          {report.statistics.avgDeliveryTime}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="card bg-base-200 shadow">
                <div className="card-body">
                  <h3 className="card-title text-lg">Distribuição</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Entregues</span>
                        <span className="font-semibold">{report.statistics.delivered}</span>
                      </div>
                      <progress 
                        className="progress progress-success w-full" 
                        value={report.statistics.delivered} 
                        max={report.statistics.totalRecipients}
                      ></progress>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Falhas</span>
                        <span className="font-semibold">{report.statistics.failed}</span>
                      </div>
                      <progress 
                        className="progress progress-error w-full" 
                        value={report.statistics.failed} 
                        max={report.statistics.totalRecipients}
                      ></progress>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Pendentes</span>
                        <span className="font-semibold">{report.statistics.pending}</span>
                      </div>
                      <progress 
                        className="progress progress-warning w-full" 
                        value={report.statistics.pending} 
                        max={report.statistics.totalRecipients}
                      ></progress>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Failure Reasons */}
            {report.failureReasons.length > 0 && (
              <div className="card bg-base-200 shadow">
                <div className="card-body">
                  <h3 className="card-title text-lg">Motivos de Falha</h3>
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Erro</th>
                          <th className="text-right">Ocorrências</th>
                          <th className="text-right">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.failureReasons.map((reason, idx) => (
                          <tr key={idx}>
                            <td className="text-sm">{reason.error}</td>
                            <td className="text-right font-semibold">{reason.count}</td>
                            <td className="text-right text-sm text-base-content/70">
                              {((reason.count / report.statistics.failed) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {report.timeline.length > 0 && (
              <div className="card bg-base-200 shadow">
                <div className="card-body">
                  <h3 className="card-title text-lg">Timeline de Eventos</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {report.timeline.map((event, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-base-100 rounded">
                        <div className="flex items-center gap-3">
                          <div className={`badge ${
                            event.event === 'sent' ? 'badge-info' :
                            event.event === 'delivered' ? 'badge-success' :
                            'badge-error'
                          }`}>
                            {event.event === 'sent' ? 'Enviado' :
                             event.event === 'delivered' ? 'Entregue' :
                             'Falhou'}
                          </div>
                          <span className="text-sm text-base-content/70">
                            {new Date(event.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <span className="font-semibold">{event.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages List */}
            <div className="card bg-base-200 shadow">
              <div className="card-body">
                <h3 className="card-title text-lg">
                  Mensagens ({report.messages.length})
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-sm">
                    <thead>
                      <tr>
                        <th>Destinatário</th>
                        <th>Status</th>
                        <th>Tentativas</th>
                        <th>Enviado em</th>
                        <th>Erro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMessages.map((msg) => (
                        <tr key={msg.id}>
                          <td className="font-mono text-xs">{msg.recipient}</td>
                          <td>
                            <div className={`badge badge-sm ${
                              msg.status === 'SENT' ? 'badge-info' :
                              msg.status === 'DELIVERED' ? 'badge-success' :
                              msg.status === 'FAILED' ? 'badge-error' :
                              'badge-warning'
                            }`}>
                              {msg.status}
                            </div>
                          </td>
                          <td className="text-center">{msg.retryCount}</td>
                          <td className="text-xs">
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleString('pt-BR') : '-'}
                          </td>
                          <td className="text-xs text-error max-w-xs truncate" title={msg.error}>
                            {msg.error || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      className="btn btn-sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>
                    <span className="flex items-center px-4">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      className="btn btn-sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal-action">
          <button onClick={onClose} className="btn">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
