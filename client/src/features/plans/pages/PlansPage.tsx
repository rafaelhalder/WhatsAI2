import React, { useState, useEffect } from 'react';
import { Check, X, Zap, Crown, Star, ArrowRight, Rocket } from 'lucide-react';
import { plansService } from '../services/plansService';
import { PlanConfig, PlanType, UsageResponse } from '../types/plans';
import { userAuthStore } from '../../auth/store/authStore';
import { UsageBar } from '../components/UsageBar';
import { PlanBadge } from '../components/PlanBadge';

export const PlansPage: React.FC = () => {
  const { token } = userAuthStore();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanType>('FREE');
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const [plansData, currentPlanData, usageData] = await Promise.all([
        plansService.getAllPlans(token),
        plansService.getCurrentPlan(token),
        plansService.getUsage(token)
      ]);

      setPlans(plansData);
      setCurrentPlan(currentPlanData.plan);
      setUsage(usageData);
      setError(null);
    } catch (err) {
      console.error('Error loading plans:', err);
      setError('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (targetPlan: PlanType) => {
    if (!token || targetPlan === currentPlan) return;

    try {
      setActionLoading(targetPlan);
      
      const isUpgrade = getPlanOrder(targetPlan) > getPlanOrder(currentPlan);
      
      if (isUpgrade) {
        await plansService.upgradePlan(token, targetPlan);
      } else {
        await plansService.downgradePlan(token, targetPlan);
      }

      await loadData();
      alert(`Plano alterado com sucesso para ${targetPlan}!`);
    } catch (err: any) {
      console.error('Error changing plan:', err);
      alert(err.message || 'Erro ao alterar plano');
    } finally {
      setActionLoading(null);
    }
  };

  const getPlanOrder = (plan: PlanType): number => {
    const order = { FREE: 1, STARTER: 2, PRO: 3, BUSINESS: 4 };
    return order[plan];
  };

  const getPlanIcon = (planType: PlanType) => {
    const icons = {
      FREE: Star,
      STARTER: Rocket,
      PRO: Zap,
      BUSINESS: Crown
    };
    return icons[planType];
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
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Escolha seu Plano</h1>
          <p className="text-lg text-base-content/70">
            Selecione o plano ideal para suas necessidades
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm">Plano Atual:</span>
            <PlanBadge plan={currentPlan} size="lg" />
          </div>
        </div>

        {/* Current Usage */}
        {usage && usage.usage && (
          <div className="bg-base-100 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Uso Atual</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UsageBar
                label="Instâncias"
                current={usage.usage.instances.current}
                limit={usage.usage.instances.limit}
              />
              <UsageBar
                label="Mensagens Hoje"
                current={usage.usage.messages_today.current}
                limit={usage.usage.messages_today.limit}
              />
              <UsageBar
                label="Templates"
                current={usage.usage.templates.current}
                limit={usage.usage.templates.limit}
              />
              {usage.usage.campaigns_this_month && (
                <UsageBar
                  label="Campanhas"
                  current={usage.usage.campaigns_this_month.current}
                  limit={usage.usage.campaigns_this_month.limit}
                />
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.name);
            const isCurrent = plan.name === currentPlan;
            const canUpgrade = getPlanOrder(plan.name) > getPlanOrder(currentPlan);
            const canDowngrade = getPlanOrder(plan.name) < getPlanOrder(currentPlan);
            const isLoading = actionLoading === plan.name;

            return (
              <div
                key={plan.name}
                className={`
                  bg-base-100 rounded-xl shadow-lg overflow-hidden
                  border-2 transition-all flex flex-col
                  ${isCurrent ? 'border-primary' : 'border-transparent'}
                  ${plan.popular ? 'ring-2 ring-warning' : ''}
                  ${plan.name === 'BUSINESS' ? 'ring-4 ring-secondary shadow-2xl' : ''}
                `}
              >
                {/* Plan Header */}
                <div className={`p-6 text-center ${plan.name === 'BUSINESS' ? 'bg-gradient-to-br from-secondary to-accent text-secondary-content' : plan.color}`}>
                  <Icon className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold mb-2">{plan.displayName}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      R$ {plan.price === 0 ? '0' : (plan.price / 100).toFixed(0)}
                    </span>
                    <span className="text-sm opacity-70">/mês</span>
                  </div>
                  <p className="text-sm mt-2 opacity-80">{plan.description}</p>
                  {plan.popular && (
                    <div className="mt-3">
                      <span className="badge badge-warning">Mais Popular</span>
                    </div>
                  )}
                  {plan.name === 'BUSINESS' && (
                    <div className="mt-3">
                      <span className="badge badge-accent">Premium ✨</span>
                    </div>
                  )}
                </div>

                {/* Plan Features */}
                <div className="p-6 space-y-4 flex-grow flex flex-col">
                  <div className="space-y-2">
                    <Feature
                      text={`${plan.limits.instances === -1 ? 'Ilimitadas' : plan.limits.instances} instância(s)`}
                      available={true}
                    />
                    <Feature
                      text={`${plan.limits.messages_per_day === -1 ? 'Ilimitadas' : plan.limits.messages_per_day} mensagens/dia`}
                      available={true}
                    />
                    <Feature
                      text={`${plan.limits.templates === -1 ? 'Ilimitados' : plan.limits.templates} template(s)`}
                      available={true}
                    />
                    <Feature
                      text={`${plan.limits.broadcasts_per_month === -1 ? 'Ilimitadas' : plan.limits.broadcasts_per_month ?? 'N/A'} campanha(s)`}
                      available={plan.limits.broadcasts}
                    />
                  </div>

                  <div className="divider"></div>

                  <div className="space-y-2 flex-grow">
                    <Feature
                      text="Envio em Massa"
                      available={plan.limits.broadcasts ?? false}
                    />
                    <Feature
                      text="Analytics Avançado"
                      available={true}
                    />
                    <Feature
                      text="Acesso API"
                      available={plan.limits.api_access ?? false}
                    />
                    <Feature
                      text="Suporte Prioritário"
                      available={plan.limits.priority_support ?? false}
                    />
                    <Feature
                      text="Membros da Equipe"
                      available={plan.limits.team_members > 1}
                    />
                    <Feature
                      text="White Label"
                      available={plan.limits.whitelabel ?? false}
                    />
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 mt-auto">
                    {isCurrent ? (
                      <button className="btn btn-outline btn-block" disabled>
                        Plano Atual
                      </button>
                    ) : canUpgrade ? (
                      <button
                        className="btn btn-primary btn-block"
                        onClick={() => handlePlanChange(plan.name)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="loading loading-spinner"></span>
                        ) : (
                          <>
                            Fazer Upgrade
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    ) : canDowngrade ? (
                      <button
                        className="btn btn-ghost btn-block"
                        onClick={() => handlePlanChange(plan.name)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="loading loading-spinner"></span>
                        ) : (
                          'Downgrade'
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="bg-base-100 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Perguntas Frequentes</h2>
          <div className="space-y-4">
            <FAQ
              question="Posso mudar de plano a qualquer momento?"
              answer="Sim! Você pode fazer upgrade ou downgrade a qualquer momento. O valor será ajustado proporcionalmente."
            />
            <FAQ
              question="O que acontece se eu atingir o limite?"
              answer="Quando você atinge o limite do seu plano, não poderá realizar novas ações até fazer upgrade ou aguardar a renovação diária dos limites."
            />
            <FAQ
              question="Como funciona o reset diário de mensagens?"
              answer="O contador de mensagens diárias é resetado automaticamente todos os dias à meia-noite (horário de Brasília)."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const Feature: React.FC<{ text: string; available: boolean }> = ({ text, available }) => (
  <div className="flex items-center gap-2">
    {available ? (
      <Check className="w-5 h-5 text-success flex-shrink-0" />
    ) : (
      <X className="w-5 h-5 text-base-content/30 flex-shrink-0" />
    )}
    <span className={available ? 'text-base-content' : 'text-base-content/50 line-through'}>
      {text}
    </span>
  </div>
);

const FAQ: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
  <div className="collapse collapse-arrow bg-base-200">
    <input type="checkbox" />
    <div className="collapse-title font-medium">{question}</div>
    <div className="collapse-content">
      <p className="text-base-content/70">{answer}</p>
    </div>
  </div>
);
