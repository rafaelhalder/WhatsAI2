/**
 * Pricing Page
 * Página de planos e preços com integração Stripe
 */

import { useState, useEffect } from 'react';
import { Check, Loader2, Zap } from 'lucide-react';
import { billingService, PLANS, Plan } from '../services/billing';
import { userAuthStore } from '../features/auth/store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const user = userAuthStore((state) => state.user);
  const authLoading = userAuthStore((state) => state.loading);
  const navigate = useNavigate();

  // Obter plano atual do usuário (normalizado para minúsculo)
  const currentPlanId = user?.plan?.toLowerCase() || 'free';

  console.log('📊 [Pricing] Current state:', {
    user: user?.name,
    userPlan: user?.plan,
    currentPlanId,
    isLoggedIn: !!user,
    authLoading
  });

  // Verificar se há plano selecionado após login
  useEffect(() => {
    // Só processar após carregar autenticação
    if (authLoading) {
      console.log('⏳ [Pricing] Aguardando autenticação carregar...');
      return;
    }

    const selectedPlanId = localStorage.getItem('selectedPlan');
    console.log('🔍 [Pricing] Verificando plano selecionado:', {
      selectedPlanId,
      hasUser: !!user,
      authLoading
    });

    if (selectedPlanId && user) {
      const plan = PLANS.find(p => p.id === selectedPlanId);
      if (plan) {
        console.log('✅ [Pricing] Plano encontrado, processando:', plan.name);
        localStorage.removeItem('selectedPlan');
        handleSubscribe(plan);
      }
    }
  }, [user, authLoading]);

  const handleSubscribe = async (plan: Plan) => {
    console.log('🛒 [Pricing] handleSubscribe called:', {
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      planPriceId: plan.priceId,
      userLoggedIn: !!user,
      userPlan: user?.plan,
      currentPlanId,
      isCurrentPlan: plan.id === currentPlanId,
      isFree: plan.id === 'free'
    });

    // Validação de segurança
    if (!plan || !plan.id) {
      console.error('❌ [Pricing] Plano inválido!', plan);
      return;
    }

    // Se não estiver logado, salva o plano e redireciona para login
    if (!user) {
      console.log('👤 [Pricing] Usuário não logado, redirecionando para login');
      localStorage.setItem('selectedPlan', plan.id);
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    // Se já está no plano, vai para subscription
    if (plan.id === currentPlanId) {
      console.log('✅ [Pricing] Já está no plano atual, indo para /subscription');
      navigate('/subscription');
      return;
    }

    // Se plano FREE, não pode "downgrade" para free - precisa cancelar
    if (plan.id === 'free') {
      console.log('🆓 [Pricing] Downgrade para FREE - redirecionar para cancelar assinatura');
      toast.error('Para voltar ao plano Free, cancele sua assinatura na página de gerenciamento.');
      navigate('/subscription');
      return;
    }

    if (!plan.priceId) {
      console.error('❌ [Pricing] PriceId inválido para plano:', plan.name);
      return;
    }

    try {
      setLoading(plan.id);

      // Verificar se usuário já tem assinatura ativa
      const hasActiveSubscription = currentPlanId !== 'free';

      if (hasActiveSubscription) {
        // Usuário já tem plano pago - trocar plano existente
        console.log('� [Pricing] Trocando plano existente');
        await billingService.changePlan(plan.priceId);
        
        toast.success(
          `Plano alterado com sucesso! ${
            plan.price > (PLANS.find(p => p.id === currentPlanId)?.price || 0)
              ? 'Upgrade aplicado imediatamente.'
              : 'Downgrade será aplicado no próximo ciclo.'
          }`
        );
        
        // Recarregar dados do usuário
        await userAuthStore.getState().checkAuth();
        navigate('/subscription');
      } else {
        // Usuário está no FREE - criar nova assinatura
        console.log('💳 [Pricing] Criando nova assinatura via Stripe Checkout');
        await billingService.redirectToCheckout(plan.priceId);
      }
    } catch (error: any) {
      console.error('❌ [Pricing] Erro ao processar:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao processar. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const getButtonText = (plan: Plan): string => {
    if (!user) {
      return plan.id === 'free' ? 'Começar Grátis' : 'Assinar Agora';
    }

    if (plan.id === currentPlanId) {
      return 'Plano Atual';
    }

    if (plan.id === 'free') {
      return 'Cancelar Assinatura';
    }

    // Comparar preços diretamente ao invés de usar ordem
    const currentPlan = PLANS.find(p => p.id === currentPlanId);
    const currentPrice = currentPlan?.price || 0;

    return plan.price > currentPrice ? 'Fazer Upgrade' : 'Fazer Downgrade';
  };

  const getButtonStyle = (plan: Plan): string => {
    if (plan.id === currentPlanId) {
      return 'bg-gray-400 cursor-not-allowed';
    }
    
    if (plan.id === 'free') {
      return 'bg-gray-600 hover:bg-gray-700';
    }

    return plan.popular
      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
      : 'bg-blue-600 hover:bg-blue-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Escolha seu plano
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Comece grátis e escale conforme seu negócio cresce
          </p>

          <div className="mt-6 inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900 rounded-full">
            <Zap className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              14 dias de teste grátis em todos os planos pagos
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                plan.popular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
                  MAIS POPULAR
                </div>
              )}

              {/* Current Plan Badge */}
              {plan.id === currentPlanId && user && (
                <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 text-xs font-bold rounded-br-lg">
                  SEU PLANO
                </div>
              )}

              <div className="p-8">
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                      R$ {plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="ml-2 text-gray-500 dark:text-gray-400">/mês</span>
                    )}
                  </div>
                  {plan.id !== 'free' && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Teste grátis por 14 dias
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading === plan.id || plan.id === currentPlanId}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all text-white ${
                    getButtonStyle(plan)
                  } ${
                    loading === plan.id || plan.id === currentPlanId
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </span>
                  ) : (
                    getButtonText(plan)
                  )}
                </button>

                {/* Features List */}
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 dark:text-gray-300 text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Perguntas Frequentes
          </h2>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Como funciona o teste grátis?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Você tem 14 dias para testar qualquer plano pago sem custo. Após o período de
                teste, sua assinatura será automaticamente convertida para o plano escolhido.
                Você pode cancelar a qualquer momento durante o período de teste.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Posso trocar de plano depois?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento.
                Mudanças de plano são proporcionais ao tempo restante do ciclo de cobrança.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Como posso cancelar minha assinatura?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Você pode cancelar sua assinatura a qualquer momento através do portal de
                gerenciamento ou entrando em contato com nosso suporte. Não há multas ou taxas
                de cancelamento.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Quais formas de pagamento são aceitas?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Aceitamos cartões de crédito (Visa, Mastercard, American Express, etc.) através
                do Stripe, nossa plataforma de pagamentos segura.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de empresas que confiam no WhatsAI para automatizar suas
            comunicações
          </p>
          <button
            onClick={() => handleSubscribe(PLANS[1])} // STARTER plan
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
          >
            Começar Teste Grátis
          </button>
        </div>
      </div>
    </div>
  );
}
