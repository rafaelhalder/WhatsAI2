/**
 * Subscription Dashboard
 * Página de gerenciamento de assinatura
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  ExternalLink,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { billingService, Subscription as SubscriptionType, Invoice, PLANS } from '../services/billing';
import { userAuthStore } from '../features/auth/store/authStore';
import { plansService } from '../features/plans/services/plansService';
import { UsageResponse } from '../features/plans/types/plans';

export default function Subscription() {
  const navigate = useNavigate();
  const user = userAuthStore((state) => state.user);
  const token = userAuthStore((state) => state.token);
  const checkAuth = userAuthStore((state) => state.checkAuth);
  const [subscription, setSubscription] = useState<SubscriptionType | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados da assinatura e atualizar usuário
  useEffect(() => {
    const initData = async () => {
      // Atualizar dados do usuário primeiro
      await checkAuth();
      // Depois carregar dados da assinatura
      await loadSubscriptionData();
    };
    initData();
  }, [checkAuth]);

  const loadSubscriptionData = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);

      const [subData, invoiceData, usageData] = await Promise.all([
        billingService.getSubscription(),
        billingService.getInvoices(),
        plansService.getUsage(token),
      ]);

      console.log('🔍 [SUBSCRIPTION PAGE] Dados recebidos:', {
        subscription: subData,
        cancelAtPeriodEnd: subData?.cancelAtPeriodEnd,
        status: subData?.status,
        usage: usageData
      });

      setSubscription(subData);
      setInvoices(invoiceData || []);
      setUsage(usageData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Não foi possível carregar os dados da assinatura');
      setInvoices([]); // Garante que sempre seja array
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você terá acesso até o final do período pago.')) {
      return;
    }

    try {
      setActionLoading(true);
      
      console.log('🚫 [CANCEL] Cancelando assinatura...');
      await billingService.cancelSubscription();
      
      console.log('⏳ [CANCEL] Aguardando webhook processar (2s)...');
      // Aguardar webhook processar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🔄 [CANCEL] Recarregando dados...');
      // Recarregar dados
      await checkAuth();
      await loadSubscriptionData();
      
      alert('Assinatura cancelada com sucesso. Você terá acesso até o final do período pago.');
    } catch (err) {
      console.error('Erro ao cancelar:', err);
      alert('Erro ao cancelar assinatura. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true);
      await billingService.reactivateSubscription();
      
      // Aguardar webhook processar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Recarregar dados
      await checkAuth();
      await loadSubscriptionData();
      
      alert('Assinatura reativada com sucesso!');
    } catch (err) {
      console.error('Erro ao reativar:', err);
      alert('Erro ao reativar assinatura. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async (newPriceId: string) => {
    // Detectar se é upgrade ou downgrade
    const newPlan = PLANS.find(p => p.priceId === newPriceId);
    if (!newPlan) return;
    
    const isUpgrade = newPlan.price > currentPlan.price;
    const message = isUpgrade
      ? `Deseja fazer upgrade para ${newPlan.name}? Você será cobrado R$ ${calculateProration(newPlan.price, currentPlan.price)} proporcionalmente ao período restante.`
      : `Deseja fazer downgrade para ${newPlan.name}? A mudança será aplicada no próximo ciclo de cobrança. Você continuará com o plano ${currentPlan.name} até ${subscription ? formatDate(subscription.currentPeriodEnd) : 'o fim do período'}.`;
    
    if (!confirm(message)) {
      return;
    }

    try {
      setActionLoading(true);
      await billingService.changePlan(newPriceId);
      
      // Aguardar processamento do Stripe (webhooks)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Recarregar TODOS os dados
      await checkAuth(); // Atualiza plano do usuário
      await loadSubscriptionData(); // Atualiza subscription e invoices
      
      const successMessage = isUpgrade
        ? `Upgrade realizado com sucesso! Você foi cobrado proporcionalmente.`
        : `Downgrade agendado! Você continuará com ${currentPlan.name} até o fim do período atual.`;
      
      alert(successMessage);
    } catch (err: any) {
      console.error('Erro ao mudar plano:', err);
      
      // Mensagens de erro específicas
      const errorMessage = err.response?.data?.error || err.message;
      const statusCode = err.response?.status;
      
      if (statusCode === 402) {
        // Erro de pagamento
        alert('❌ Pagamento recusado!\n\nSeu cartão foi recusado ao tentar cobrar o upgrade. Possíveis motivos:\n• Saldo insuficiente\n• Cartão expirado\n• Limite excedido\n\nPor favor, atualize seu método de pagamento e tente novamente.');
      } else if (errorMessage?.includes('Pagamento recusado')) {
        alert(`❌ ${errorMessage}\n\nAtualize seu cartão no portal de pagamentos e tente novamente.`);
      } else {
        alert(`Erro ao mudar de plano:\n${errorMessage || 'Tente novamente mais tarde.'}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Calcular valor proporcional (estimativa simples)
  const calculateProration = (newPrice: number, currentPrice: number): string => {
    if (!subscription) return '0.00';
    
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const periodStart = new Date(subscription.currentPeriodStart);
    
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const priceDiff = newPrice - currentPrice;
    const prorationAmount = (priceDiff * remainingDays) / totalDays;
    
    return prorationAmount.toFixed(2);
  };

  const handleManageBilling = async () => {
    try {
      setActionLoading(true);
      await billingService.redirectToPortal();
    } catch (err) {
      console.error('Erro ao abrir portal:', err);
      alert('Erro ao abrir portal de pagamento. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { icon: CheckCircle, color: 'badge-success', label: 'Ativo' },
      trialing: { icon: Calendar, color: 'badge-info', label: 'Período de Teste' },
      canceled: { icon: XCircle, color: 'badge-error', label: 'Cancelado' },
      past_due: { icon: AlertCircle, color: 'badge-warning', label: 'Pagamento Pendente' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={`badge ${config.color} gap-1`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  const getInvoiceStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: 'badge-success', label: 'Pago' },
      open: { color: 'badge-warning', label: 'Pendente' },
      void: { color: 'badge-neutral', label: 'Cancelado' },
      uncollectible: { color: 'badge-error', label: 'Não Coletável' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;

    return (
      <span className={`badge ${config.color} badge-sm`}>
        {config.label}
      </span>
    );
  };

  const currentPlan = PLANS.find(p => p.id === user?.plan) || PLANS[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-base-content mb-2">Erro ao Carregar</h2>
          <p className="text-base-content/70 mb-4">{error}</p>
          <button
            onClick={loadSubscriptionData}
            className="btn btn-primary"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            Minha Assinatura
          </h1>
          <p className="text-base-content/70">
            Gerencie sua assinatura e histórico de pagamentos
          </p>
        </div>

        {/* Current Plan Card */}
        <div className="card bg-base-100 shadow-lg mb-8">
          <div className="card-body">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="card-title text-2xl mb-2">
                  Plano {currentPlan.name}
                </h2>
                <p className="text-base-content/70">
                  {currentPlan.price === 0 ? 'Sem cobrança' : `R$ ${currentPlan.price}/mês`}
                </p>
              </div>
              {subscription && (
                <div className="mt-4 md:mt-0">
                  {getStatusBadge(subscription.status)}
                </div>
              )}
            </div>

            {/* Plan Features */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-base-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-5 h-5 text-primary mr-2" />
                  <h3 className="font-semibold text-base-content">Instâncias</h3>
                </div>
                <p className="text-2xl font-bold text-base-content">
                  {currentPlan.features.find(f => f.includes('instância'))?.match(/\d+/)?.[0] || '0'}
                </p>
              </div>

              <div className="bg-base-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CreditCard className="w-5 h-5 text-success mr-2" />
                  <h3 className="font-semibold text-base-content">Mensagens/Mês</h3>
                </div>
                <p className="text-2xl font-bold text-base-content">
                  {currentPlan.features.find(f => f.includes('mensagens'))?.match(/[\d.]+k?/)?.[0] || '0'}
                </p>
              </div>

              <div className="bg-base-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 text-secondary mr-2" />
                  <h3 className="font-semibold text-base-content">Contatos</h3>
                </div>
                <p className="text-2xl font-bold text-base-content">
                  {currentPlan.features.find(f => f.includes('contatos'))?.match(/[\d.]+k?/)?.[0] || '0'}
                </p>
              </div>
            </div>
            
            {/* Usage Statistics */}
            {user && (
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-base-content mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                Uso Atual
              </h3>
              <div className="space-y-3">
                {/* Messages Usage */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-base-content/70">Mensagens Hoje</span>
                    <span className="text-xs font-medium text-base-content">
                      {usage ? (
                        usage.limits.messages_per_day === -1 
                          ? `${usage.usage.messages_today.current} / ∞`
                          : `${usage.usage.messages_today.current} / ${usage.limits.messages_per_day}`
                      ) : '0 / 0'}
                    </span>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${(() => {
                        if (!usage || usage.limits.messages_per_day === -1) return 'bg-success';
                        const percentage = (usage.usage.messages_today.current / usage.limits.messages_per_day) * 100;
                        return percentage > 90 
                          ? 'bg-error' 
                          : percentage > 70
                          ? 'bg-warning'
                          : 'bg-success';
                      })()}`}
                      style={{ 
                        width: `${(() => {
                          if (!usage || usage.limits.messages_per_day === -1) return 0;
                          return Math.min(100, (usage.usage.messages_today.current / usage.limits.messages_per_day) * 100);
                        })()}%` 
                      }}
                    ></div>
                  </div>
                  {(() => {
                    if (!usage || usage.limits.messages_per_day === -1) return null;
                    const percentage = (usage.usage.messages_today.current / usage.limits.messages_per_day) * 100;
                    if (percentage > 80) {
                      return (
                        <p className="text-xs text-warning mt-1">
                          ⚠️ Você está próximo do limite diário
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Subscription Details */}
          {subscription && (
            <div className="border-t border-base-300 pt-6">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
                  <div>
                    <p className="text-sm text-base-content/60 mb-1">Teste grátis até</p>
                    <p className="font-semibold text-base-content">
                      {formatDate(subscription.trialEnd)}
                    </p>
                  </div>
                )}
                {subscription.currentPeriodEnd && (
                  <div>
                    <p className="text-sm text-base-content/60 mb-1">
                      {subscription.cancelAtPeriodEnd ? 'Acesso até' : 'Próxima cobrança'}
                    </p>
                    <p className="font-semibold text-base-content">
                      {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={actionLoading}
                    className="btn btn-error"
                  >
                    {actionLoading ? 'Processando...' : 'Cancelar Assinatura'}
                  </button>
                )}

                {subscription.cancelAtPeriodEnd && (
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={actionLoading}
                    className="btn btn-success"
                  >
                    {actionLoading ? 'Processando...' : 'Reativar Assinatura'}
                  </button>
                )}

                <button
                  onClick={handleManageBilling}
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {actionLoading ? 'Abrindo...' : 'Gerenciar Pagamento'}
                </button>

                {currentPlan.id === 'FREE' && (
                  <button
                    onClick={() => navigate('/pricing')}
                    className="btn btn-secondary"
                  >
                    Fazer Upgrade
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Free Plan CTA */}
          {!subscription && currentPlan.id === 'FREE' && (
            <div className="alert alert-info">
              <div>
                <h3 className="text-lg font-bold mb-2">
                  Pronto para mais recursos?
                </h3>
                <p className="mb-4">
                  Faça upgrade e desbloqueie todo o potencial do WhatsAI
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="btn btn-primary"
                >
                  Ver Planos
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Change Plan Section */}
        {subscription && currentPlan.id !== 'FREE' && (
          <div className="card bg-base-100 shadow-lg mb-8">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">
                Mudar de Plano
              </h2>
              <div className="grid md:grid-cols-4 gap-4">
                {PLANS.map((plan) => {
                  const isUpgrade = plan.price > currentPlan.price;
                  return (
                    <div
                      key={plan.id}
                      className={`card border ${
                        plan.id === currentPlan.id
                          ? 'border-primary bg-primary/5'
                          : 'border-base-300'
                      }`}
                    >
                      <div className="card-body p-4">
                        <h3 className="font-bold text-base-content mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-2xl font-bold text-primary mb-3">
                          R$ {plan.price}
                          <span className="text-sm text-base-content/60">/mês</span>
                        </p>
                        {plan.id === currentPlan.id ? (
                          <div className="text-center py-2 text-sm font-medium text-primary">
                            Plano Atual
                          </div>
                        ) : plan.id === 'free' ? (
                          <button
                            onClick={handleCancelSubscription}
                            disabled={actionLoading}
                            className="btn btn-error btn-sm w-full"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancelar Assinatura
                          </button>
                        ) : (
                          <button
                            onClick={() => handleChangePlan(plan.priceId)}
                            disabled={actionLoading}
                            className={`btn btn-sm w-full ${
                              isUpgrade ? 'btn-primary' : 'btn-outline'
                            }`}
                          >
                            {isUpgrade ? (
                              <>
                                <ArrowUpCircle className="w-4 h-4 mr-1" />
                                Upgrade
                              </>
                            ) : (
                              <>
                                <ArrowDownCircle className="w-4 h-4 mr-1" />
                                Downgrade
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Invoice History */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">
              Histórico de Faturas
            </h2>
            {!invoices || invoices.length === 0 ? (
              <p className="text-base-content/70 text-center py-8">
                Nenhuma fatura encontrada
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Data</th>
                      <th className="text-left">Número</th>
                      <th className="text-left">Valor</th>
                      <th className="text-left">Status</th>
                      <th className="text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="text-base-content">
                          {formatDate(invoice.paidAt || invoice.createdAt)}
                        </td>
                        <td className="text-base-content/70">
                          {invoice.invoiceNumber || invoice.number || '-'}
                        </td>
                        <td className="text-base-content font-medium">
                          R$ {invoice.amount.toFixed(2)}
                        </td>
                        <td>
                          {getInvoiceStatusBadge(invoice.status)}
                        </td>
                        <td>
                          {(invoice.invoicePdfUrl || invoice.invoicePdf) && (
                            <a
                              href={invoice.invoicePdfUrl || invoice.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link link-primary flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </a>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
