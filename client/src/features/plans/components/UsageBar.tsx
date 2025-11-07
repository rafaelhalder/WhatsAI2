import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  showWarning?: boolean;
  warningThreshold?: number; // Percentage threshold for warning (default: 80%)
}

export const UsageBar: React.FC<UsageBarProps> = ({
  label,
  current,
  limit,
  unit = '',
  showWarning = true,
  warningThreshold = 80
}) => {
  
  const isUnlimited = limit === -1 || limit === Infinity;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= warningThreshold;
  const isAtLimit = percentage >= 100;

  const getProgressColor = () => {
    if (isAtLimit) return 'bg-error';
    if (isNearLimit) return 'bg-warning';
    return 'bg-primary';
  };

  const getTextColor = () => {
    if (isAtLimit) return 'text-error';
    if (isNearLimit) return 'text-warning';
    return 'text-base-content';
  };

  return (
    <div className="space-y-2">
      {/* Header with label and usage */}
      <div className="flex justify-between items-center">
        <span className={`text-sm font-medium ${getTextColor()}`}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          {showWarning && isNearLimit && !isUnlimited && (
            <AlertTriangle className="w-4 h-4 text-warning" />
          )}
          <span className={`text-sm font-semibold ${getTextColor()}`}>
            {current} {unit} / {isUnlimited ? '∞' : `${limit} ${unit}`}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {!isUnlimited && (
        <div className="relative w-full h-2 bg-base-200 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Unlimited indicator */}
      {isUnlimited && (
        <div className="text-xs text-success flex items-center gap-1">
          <span>✓</span>
          <span>Ilimitado</span>
        </div>
      )}

      {/* Warning message */}
      {showWarning && isAtLimit && !isUnlimited && (
        <p className="text-xs text-error">
          Limite atingido! Faça upgrade para continuar.
        </p>
      )}
      {showWarning && isNearLimit && !isAtLimit && !isUnlimited && (
        <p className="text-xs text-warning">
          {Math.round(100 - percentage)}% restante
        </p>
      )}
    </div>
  );
};
