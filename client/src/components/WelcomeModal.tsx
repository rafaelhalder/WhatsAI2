import { useState, useEffect } from 'react';
import { X, CheckCircle, Rocket } from 'lucide-react';
import { userAuthStore } from '../features/auth/store/authStore';

interface WelcomeModalProps {
  onStartTour: () => void;
  onClose: () => void;
}

export function WelcomeModal({ onStartTour, onClose }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const user = userAuthStore((state) => state.user);

  useEffect(() => {
    // Show welcome modal only for new users who haven't completed onboarding
    if (user && !user.onboardingCompleted) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleStartTour = () => {
    setIsOpen(false);
    onStartTour();
  };

  const handleSkip = () => {
    setIsOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl relative">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="text-center py-6">
          {/* Welcome icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <Rocket className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold mb-4">
            Bem-vindo ao <span className="text-primary">WhatsAI</span>! 🎉
          </h2>

          <p className="text-lg text-base-content/70 mb-8">
            Estamos felizes em tê-lo conosco! Vamos te ajudar a aproveitar ao máximo nossa plataforma.
          </p>

          {/* Features list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
            <div className="flex items-start gap-3 bg-base-200 p-4 rounded-lg">
              <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Multi-Instância</h4>
                <p className="text-sm text-base-content/70">
                  Gerencie múltiplos números de WhatsApp em um só lugar
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-base-200 p-4 rounded-lg">
              <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Automação com IA</h4>
                <p className="text-sm text-base-content/70">
                  Chatbot inteligente com GPT-4 para respostas automáticas
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-base-200 p-4 rounded-lg">
              <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Campanhas em Massa</h4>
                <p className="text-sm text-base-content/70">
                  Envie mensagens para milhares de contatos com rate limiting
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-base-200 p-4 rounded-lg">
              <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Templates Reutilizáveis</h4>
                <p className="text-sm text-base-content/70">
                  Crie modelos de mensagens com variáveis personalizadas
                </p>
              </div>
            </div>
          </div>

          {/* Video embed section (optional) */}
          <div className="mb-8">
            <div className="bg-base-200 rounded-lg p-6">
              <h3 className="font-semibold mb-3">📹 Quer ver como funciona?</h3>
              <p className="text-sm text-base-content/70 mb-4">
                Assista nosso vídeo de 2 minutos ou faça um tour interativo agora!
              </p>
              {/* Placeholder for video - can be replaced with actual YouTube embed */}
              <div className="aspect-video bg-base-300 rounded-lg flex items-center justify-center">
                <span className="text-sm text-base-content/50">Vídeo de demonstração em breve</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleStartTour}
              className="btn btn-primary btn-lg gap-2"
            >
              <Rocket className="w-5 h-5" />
              Fazer Tour Interativo (2 min)
            </button>
            <button
              onClick={handleSkip}
              className="btn btn-outline btn-lg"
            >
              Explorar por conta própria
            </button>
          </div>

          <p className="text-xs text-base-content/50 mt-6">
            Você pode refazer este tour a qualquer momento nas Configurações
          </p>
        </div>
      </div>

      {/* Modal backdrop */}
      <div className="modal-backdrop" onClick={handleSkip}>
        <button>close</button>
      </div>
    </div>
  );
}
