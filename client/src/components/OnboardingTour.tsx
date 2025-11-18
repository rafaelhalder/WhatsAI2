import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useState, useEffect } from 'react';
import { userAuthStore } from '../features/auth/store/authStore';
import { api } from '../services/api';

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const user = userAuthStore((state) => state.user);

  useEffect(() => {
    // Check if user has completed onboarding
    if (user && !user.onboardingCompleted) {
      // Small delay to allow page to render
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-primary">🎉 Bem-vindo ao WhatsAI!</h2>
          <p className="text-lg">
            Vamos fazer um tour rápido para você conhecer as funcionalidades principais.
          </p>
          <p className="text-sm text-base-content/70">
            Leva apenas 2 minutos e vai te ajudar a aproveitar melhor a plataforma!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">📊 Dashboard</h3>
          <p>
            Aqui você vê um resumo completo: total de mensagens, instâncias ativas, 
            taxa de entrega e custos operacionais em tempo real.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="instances"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">📱 Instâncias</h3>
          <p>
            Aqui você gerencia seus números de WhatsApp. Cada instância é um número conectado.
            Clique aqui para criar sua primeira instância!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="chat"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">💬 Chat</h3>
          <p>
            Interface completa tipo WhatsApp Web. Envie e receba mensagens, mídias, 
            e gerencie todas as suas conversas em um só lugar.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="templates"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">📝 Templates</h3>
          <p>
            Crie modelos de mensagens reutilizáveis com variáveis personalizadas.
            Economize tempo respondendo clientes frequentes!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="campaigns"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">📢 Campanhas</h3>
          <p>
            Envie mensagens em massa para múltiplos contatos com rate limiting inteligente.
            Perfeito para promoções e avisos importantes!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="automations"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">🤖 Automações</h3>
          <p>
            Configure respostas automáticas por palavras-chave e chatbot com IA.
            Automatize até 90% do seu atendimento!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="profile-menu"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">👤 Perfil</h3>
          <p>
            Gerencie sua conta, altere configurações, veja sua assinatura atual 
            e muito mais.
          </p>
        </div>
      ),
      placement: 'bottom-end',
    },
    {
      target: 'body',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-success">✅ Tour Completo!</h2>
          <p className="text-lg">
            Agora você está pronto para começar a usar o WhatsAI.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">🚀 Próximos Passos:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Crie sua primeira instância</li>
              <li>Conecte seu WhatsApp escaneando o QR Code</li>
              <li>Envie sua primeira mensagem</li>
              <li>Explore templates e automações</li>
            </ol>
          </div>
          <p className="text-sm text-base-content/70">
            Dica: Você pode rever este tour a qualquer momento nas Configurações.
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, index, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      
      // Mark onboarding as complete
      try {
        await api.post('/auth/onboarding/complete');
        
        // Update local user state
        if (user) {
          userAuthStore.setState({
            user: {
              ...user,
              onboardingCompleted: true,
              onboardingStep: 5,
            },
          });
        }
        
        if (onComplete) {
          onComplete();
        }
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    }

    // Update step index
    if (action === 'next' || action === 'prev') {
      setStepIndex(index + (action === 'next' ? 1 : -1));
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--p))',
          textColor: 'hsl(var(--bc))',
          backgroundColor: 'hsl(var(--b1))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: 'hsl(var(--b1))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--p))',
          borderRadius: 6,
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--bc))',
          marginRight: 10,
        },
        buttonSkip: {
          color: 'hsl(var(--bc) / 0.6)',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        open: 'Abrir',
        skip: 'Pular Tour',
      }}
    />
  );
}
