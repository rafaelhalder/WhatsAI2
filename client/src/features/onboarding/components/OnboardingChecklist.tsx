import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, X, Rocket, MessageSquare, QrCode, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action?: string;
  link?: string;
}

interface OnboardingChecklistProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  onComplete,
  onSkip
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 1,
      title: 'Conectar WhatsApp',
      description: 'Adicione sua primeira instância WhatsApp',
      icon: QrCode,
      completed: false,
      action: 'Conectar',
      link: '/instances'
    },
    {
      id: 2,
      title: 'Enviar primeira mensagem',
      description: 'Teste enviando uma mensagem',
      icon: Send,
      completed: false,
      action: 'Enviar',
      link: '/chat'
    },
    {
      id: 3,
      title: 'Criar template',
      description: 'Crie seu primeiro template de mensagem',
      icon: MessageSquare,
      completed: false,
      action: 'Criar',
      link: '/templates'
    },
    {
      id: 4,
      title: 'Explorar recursos',
      description: 'Conheça campanhas e automações',
      icon: Sparkles,
      completed: false,
      action: 'Explorar',
      link: '/campaigns'
    }
  ]);

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/onboarding/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const { onboardingCompleted, onboardingStep } = response.data.data;
        
        if (onboardingCompleted) {
          setIsVisible(false);
          return;
        }

        setCurrentStep(onboardingStep);
        
        // Update steps based on current progress
        setSteps(prevSteps => 
          prevSteps.map(step => ({
            ...step,
            completed: step.id <= onboardingStep
          }))
        );
      }
    } catch (error) {
      console.error('Error loading onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (stepId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.put('/api/onboarding/step', 
        { step: stepId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSteps(prevSteps =>
        prevSteps.map(step =>
          step.id === stepId ? { ...step, completed: true } : step
        )
      );
      setCurrentStep(stepId);

      // Check if all steps completed
      const allCompleted = steps.every(step => step.id === stepId || step.completed);
      if (allCompleted && stepId === steps.length) {
        await handleComplete();
      }
    } catch (error) {
      console.error('Error updating step:', error);
    }
  };

  const handleComplete = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post('/api/onboarding/complete', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsVisible(false);
      onComplete?.();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const handleSkipOnboarding = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post('/api/onboarding/skip', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsVisible(false);
      onSkip?.();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const progress = (steps.filter(s => s.completed).length / steps.length) * 100;

  if (!isVisible || loading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-base-100 rounded-lg shadow-lg p-6 border border-base-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Primeiros Passos</h3>
              <p className="text-sm text-base-content/70">
                Complete para começar a usar o WhatsAI
              </p>
            </div>
          </div>
          <button
            onClick={handleSkipOnboarding}
            className="btn btn-ghost btn-sm btn-circle"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-base-content/70">Progresso</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-2">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: step.id * 0.1 }}
              className={`
                flex items-center gap-3 p-3 rounded-lg transition-colors
                ${step.completed ? 'bg-success/10' : 'bg-base-200 hover:bg-base-300'}
              `}
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-success" />
                ) : (
                  <Circle className="w-6 h-6 text-base-content/30" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium text-sm ${step.completed ? 'text-success' : ''}`}>
                  {step.title}
                </h4>
                <p className="text-xs text-base-content/60">{step.description}</p>
              </div>

              {!step.completed && step.link && (
                <a
                  href={step.link}
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStepComplete(step.id)}
                >
                  {step.action}
                </a>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        {progress === 100 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-success/10 rounded-lg text-center"
          >
            <p className="text-sm font-medium text-success mb-2">
              🎉 Parabéns! Você completou o onboarding
            </p>
            <button
              onClick={handleComplete}
              className="btn btn-success btn-sm"
            >
              Concluir
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
