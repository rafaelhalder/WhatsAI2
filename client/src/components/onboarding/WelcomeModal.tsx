import React from 'react';
import { X, Sparkles, MessageSquare, Zap, Users } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  onSkip: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onStartTour,
  onSkip,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open" onClick={onClose}>
      {/* Modal */}
      <div className="modal-box w-11/12 max-w-2xl p-8" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-success/20 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-3xl font-bold text-base-content mb-2">
            Bem-vindo ao WhatsAI! 🎉
          </h2>
          <p className="text-lg text-base-content/70">
            Gerencie múltiplas contas WhatsApp em um só lugar
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-info/20 rounded-lg mb-3">
              <MessageSquare className="w-6 h-6 text-info" />
            </div>
            <h3 className="font-semibold text-base-content mb-1">Multi-Instância</h3>
            <p className="text-sm text-base-content/60">
              Conecte quantas contas quiser
            </p>
          </div>

          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/20 rounded-lg mb-3">
              <Zap className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-semibold text-base-content mb-1">Templates</h3>
            <p className="text-sm text-base-content/60">
              Respostas rápidas automáticas
            </p>
          </div>

          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-warning/20 rounded-lg mb-3">
              <Users className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold text-base-content mb-1">Campanhas</h3>
            <p className="text-sm text-base-content/60">
              Envios em massa organizados
            </p>
          </div>
        </div>

        {/* Video or Image Placeholder */}
        <div className="bg-gradient-to-br from-success/10 to-info/10 rounded-xl p-8 mb-8 text-center border border-base-300">
          <div className="aspect-video bg-base-100/50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-success mx-auto mb-2" />
              <p className="text-base-content/70">
                Vídeo de boas-vindas (30 segundos)
              </p>
              <p className="text-sm text-base-content/50 mt-1">
                Em breve: Tour visual do produto
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onStartTour}
            className="btn btn-success flex-1 shadow-md"
          >
            🚀 Iniciar Tour Guiado (5 min)
          </button>
          <button
            onClick={onSkip}
            className="btn btn-ghost flex-1"
          >
            Explorar Por Conta
          </button>
        </div>

        <p className="text-center text-sm text-base-content/50 mt-4">
          Você pode retomar o tour a qualquer momento nas configurações
        </p>
      </div>
    </div>
  );
};

export default WelcomeModal;
