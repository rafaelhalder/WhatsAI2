import { CheckCircle, Circle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    link: string;
  };
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  onDismiss?: () => void;
}

export function OnboardingChecklist({ steps, onDismiss }: OnboardingChecklistProps) {
  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const progress = (completedCount / totalCount) * 100;
  const allCompleted = completedCount === totalCount;

  if (allCompleted && onDismiss) {
    return null; // Don't show if all completed
  }

  return (
    <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 shadow-lg">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="card-title text-primary mb-2">
              {allCompleted ? '🎉 Parabéns!' : '🚀 Comece Aqui'}
            </h3>
            <p className="text-sm text-base-content/70">
              {allCompleted
                ? 'Você completou todos os passos iniciais!'
                : 'Complete estes passos para aproveitar melhor o WhatsAI'}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Fechar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso</span>
            <span className="text-sm font-bold">{completedCount}/{totalCount}</span>
          </div>
          <div className="progress progress-primary w-full h-2">
            <div
              className="progress-value bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                step.completed
                  ? 'bg-success/10 border border-success/20'
                  : 'bg-base-200 hover:bg-base-300'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {step.completed ? (
                  <CheckCircle className="w-6 h-6 text-success" />
                ) : (
                  <Circle className="w-6 h-6 text-base-content/40" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`font-semibold mb-1 ${
                    step.completed ? 'text-success line-through' : ''
                  }`}
                >
                  {step.title}
                </h4>
                <p className="text-sm text-base-content/70">
                  {step.description}
                </p>
              </div>

              {/* Action button */}
              {!step.completed && step.action && (
                <div className="flex-shrink-0">
                  <Link
                    to={step.action.link}
                    className="btn btn-primary btn-sm gap-2"
                  >
                    {step.action.label}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer message */}
        {allCompleted && (
          <div className="alert alert-success mt-4">
            <CheckCircle className="w-6 h-6" />
            <div>
              <h4 className="font-semibold">Você está pronto!</h4>
              <p className="text-sm">
                Agora você pode explorar todos os recursos do WhatsAI.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
