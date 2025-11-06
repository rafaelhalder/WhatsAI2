import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface OnboardingChecklistProps {
  items: ChecklistItem[];
  onStartTour?: () => void;
}

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ items, onStartTour }) => {
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <div className="bg-base-100 rounded-lg shadow-md p-6 border border-base-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-base-content">
          Primeiros Passos
        </h3>
        <span className="text-sm text-base-content/60">
          {completedCount} de {totalCount} concluídos
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-base-300 rounded-full h-2 mb-6">
        <div
          className="bg-success h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start p-3 rounded-lg transition-all ${
              item.completed
                ? 'bg-success/10 border border-success/30'
                : 'bg-base-200/50 border border-base-300 hover:bg-base-200'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {item.completed ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-base-content/40" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p
                className={`text-sm font-medium ${
                  item.completed ? 'text-success line-through' : 'text-base-content'
                }`}
              >
                {item.title}
              </p>
              <p
                className={`text-xs mt-1 ${
                  item.completed ? 'text-success/70' : 'text-base-content/60'
                }`}
              >
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      {completedCount < totalCount && onStartTour && (
        <button
          onClick={onStartTour}
          className="btn btn-success w-full mt-4"
        >
          🎯 Iniciar Tour Guiado
        </button>
      )}

      {completedCount === totalCount && (
        <div className="mt-4 text-center alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">
            🎉 Parabéns! Você concluiu todos os passos!
          </span>
        </div>
      )}
    </div>
  );
};

export default OnboardingChecklist;
