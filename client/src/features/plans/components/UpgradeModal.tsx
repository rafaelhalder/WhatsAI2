import React from 'react';
import { X, AlertTriangle, ArrowRight, Crown, Zap, Rocket } from 'lucide-react';
import { PlanType } from '../types/plans';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: PlanType) => void;
  currentPlan: PlanType;
  limitType: 'instances' | 'messages' | 'templates' | 'campaigns';
  currentUsage: number;
  limit: number;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  currentPlan,
  limitType,
  currentUsage,
  limit
}) => {
  if (!isOpen) return null;

  const limitMessages = {
    instances: {
      title: 'Limite de Instâncias Atingido',
      description: `Você atingiu o limite de ${limit} instância(s) do plano ${currentPlan}.`,
      feature: 'mais instâncias WhatsApp'
    },
    messages: {
      title: 'Limite de Mensagens Atingido',
      description: `Você atingiu o limite de ${limit} mensagens diárias do plano ${currentPlan}.`,
      feature: 'mais mensagens por dia'
    },
    templates: {
      title: 'Limite de Templates Atingido',
      description: `Você atingiu o limite de ${limit} template(s) do plano ${currentPlan}.`,
      feature: 'mais templates de mensagens'
    },
    campaigns: {
      title: 'Limite de Campanhas Atingido',
      description: `Você atingiu o limite de ${limit} campanha(s) do plano ${currentPlan}.`,
      feature: 'mais campanhas simultâneas'
    }
  };

  const config = limitMessages[limitType];

  const getRecommendedPlan = (): PlanType => {
    if (currentPlan === 'FREE') return 'STARTER';
    if (currentPlan === 'STARTER') return 'PRO';
    if (currentPlan === 'PRO') return 'BUSINESS';
    return 'BUSINESS';
  };

  const recommendedPlan = getRecommendedPlan();

  const planBenefits = {
    STARTER: {
      icon: Rocket,
      price: 47,
      benefits: [
        '2 instâncias WhatsApp',
        '1.000 mensagens/dia',
        '20 templates',
        '5 campanhas/mês',
        'Envio em massa',
        'Auto-respostas básicas'
      ]
    },
    PRO: {
      icon: Zap,
      price: 97,
      benefits: [
        '5 instâncias WhatsApp',
        '5.000 mensagens/dia',
        '50 templates',
        '10 campanhas/mês',
        'Envio em massa',
        'Analytics avançado',
        'API de integração'
      ]
    },
    BUSINESS: {
      icon: Crown,
      price: 297,
      benefits: [
        'Instâncias ilimitadas',
        'Mensagens ilimitadas',
        'Templates ilimitados',
        'Campanhas ilimitadas',
        'Acesso à API completa',
        'Suporte prioritário',
        'Integrações customizadas',
        'White label'
      ]
    }
  };

  const recommended = planBenefits[recommendedPlan as 'STARTER' | 'PRO' | 'BUSINESS'];
  const Icon = recommended.icon;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-warning" />
            <div>
              <h3 className="text-xl font-bold">{config.title}</h3>
              <p className="text-sm text-base-content/70 mt-1">
                {config.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Usage */}
        <div className="alert alert-warning mb-6">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <div className="font-semibold">Uso atual:</div>
            <div className="text-sm">
              {currentUsage} / {limit} {limitType === 'messages' ? 'mensagens' : limitType}
            </div>
          </div>
        </div>

        {/* Recommended Plan */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Icon className="w-10 h-10 text-primary" />
              <div>
                <h4 className="text-lg font-bold">Plano {recommendedPlan}</h4>
                <p className="text-sm text-base-content/70">
                  Recomendado para {config.feature}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                R$ {recommended.price}
              </div>
              <div className="text-sm text-base-content/70">/mês</div>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recommended.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn btn-ghost flex-1"
          >
            Agora Não
          </button>
          <button
            onClick={() => {
              onUpgrade(recommendedPlan);
              onClose();
            }}
            className="btn btn-primary flex-1"
          >
            Fazer Upgrade
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-center text-base-content/60 mt-4">
          Você pode cancelar ou alterar seu plano a qualquer momento
        </p>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};
