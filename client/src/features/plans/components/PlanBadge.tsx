import React from 'react';
import { Crown, Zap, Star, Rocket } from 'lucide-react';

type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';

interface PlanBadgeProps {
  plan: PlanType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({
  plan,
  size = 'md',
  showIcon = true
}) => {
  const planConfig = {
    FREE: {
      label: 'Free',
      icon: Star,
      colorClasses: 'bg-base-300 text-base-content',
      iconColor: 'text-base-content/60'
    },
    STARTER: {
      label: 'Starter',
      icon: Rocket,
      colorClasses: 'bg-info text-info-content',
      iconColor: 'text-info-content'
    },
    PRO: {
      label: 'Pro',
      icon: Zap,
      colorClasses: 'bg-primary text-primary-content',
      iconColor: 'text-primary-content'
    },
    BUSINESS: {
      label: 'Business',
      icon: Crown,
      colorClasses: 'bg-gradient-to-r from-warning to-error text-white',
      iconColor: 'text-white'
    }
  };

  const config = planConfig[plan];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 
        rounded-full font-semibold
        ${config.colorClasses}
        ${sizeClasses[size]}
      `}
    >
      {showIcon && <Icon className={`${iconSizes[size]} ${config.iconColor}`} />}
      <span>{config.label}</span>
    </span>
  );
};
