import React, { useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { onboardingService } from '../../services/onboarding';

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ run, onComplete, onSkip }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">🎉 Bem-vindo ao WhatsAI!</h2>
          <p className="text-lg mb-4">
            Gerencie múltiplas contas WhatsApp em um só lugar com inteligência artificial.
          </p>
          <p className="text-sm text-base-content/60">
            Vamos conhecer os principais recursos da plataforma.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-3">📱 Conexões WhatsApp</h3>
          <p className="text-base mb-3">
            Conecte múltiplas contas WhatsApp simultaneamente.
          </p>
          <p className="text-sm text-base-content/60">
            Cada conexão funciona de forma independente e você pode gerenciar todas em um só lugar.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-3">💬 Chat Inteligente</h3>
          <p className="text-base mb-3">
            Converse com seus contatos através de uma interface moderna e intuitiva.
          </p>
          <p className="text-sm text-base-content/60">
            Suporte a texto, imagens, vídeos, áudios e documentos.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-3">📝 Templates & Automação</h3>
          <p className="text-base mb-3">
            Crie templates de mensagens com variáveis dinâmicas.
          </p>
          <p className="text-sm text-base-content/60">
            Configure respostas automáticas e horários de atendimento para otimizar seu tempo.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-3">📢 Campanhas de Mensagens</h3>
          <p className="text-base mb-3">
            Envie mensagens em massa de forma organizada e controlada.
          </p>
          <p className="text-sm text-base-content/60">
            Configure taxa de envio, agende campanhas e acompanhe os resultados.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">✅ Tudo Pronto!</h2>
          <p className="text-lg mb-4">
            Você conheceu os principais recursos do WhatsAI.
          </p>
          <p className="text-sm text-base-content/60">
            Comece conectando sua primeira conta WhatsApp no menu "Instâncias"!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      // Tour completed or skipped
      if (status === STATUS.FINISHED) {
        await onboardingService.complete();
        onComplete();
      } else if (status === STATUS.SKIPPED) {
        await onboardingService.skip();
        onSkip();
      }
    } else if (type === EVENTS.STEP_AFTER) {
      // Move to next step
      const newIndex = action === ACTIONS.NEXT ? index + 1 : index - 1;
      setStepIndex(newIndex);
      
      // Update step in backend (steps 0-5, total 6 steps)
      try {
        await onboardingService.updateStep(Math.min(newIndex, 5));
      } catch (error) {
        console.error('Failed to update onboarding step:', error);
      }
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
      disableOverlayClose
      disableCloseOnEsc={false}
      spotlightClicks={true}
      scrollToFirstStep={true}
      scrollOffset={100}
      styles={{
        options: {
          primaryColor: 'hsl(var(--s))', // Use DaisyUI success color
          zIndex: 10000,
          textColor: 'hsl(var(--bc))', // Use DaisyUI base-content
          backgroundColor: 'hsl(var(--b1))', // Use DaisyUI base-100
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--s))', // success color
          borderRadius: 8,
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--bc))',
          opacity: 0.6,
          marginRight: 8,
        },
        buttonSkip: {
          color: 'hsl(var(--bc))',
          opacity: 0.5,
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular Tutorial',
      }}
    />
  );
};

export default OnboardingTour;
