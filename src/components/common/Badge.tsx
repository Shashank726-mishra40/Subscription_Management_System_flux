import React from 'react';
import { cn } from '../../utils/cn';
import { getStatusBadgeVariant } from '../../utils/formatters';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'slate' | 'status';
  status?: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  status,
  showDot = true,
  size = 'md',
  className,
}) => {
  let styleClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotClass = 'bg-slate-400';

  if (status) {
    const s = getStatusBadgeVariant(status);
    styleClasses = `${s.bg} ${s.text} ${s.border}`;
    dotClass = s.dot;
  } else if (variant === 'emerald') {
    styleClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotClass = 'bg-emerald-500';
  } else if (variant === 'blue') {
    styleClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    dotClass = 'bg-blue-500';
  } else if (variant === 'amber') {
    styleClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    dotClass = 'bg-amber-500';
  } else if (variant === 'rose') {
    styleClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    dotClass = 'bg-rose-500';
  } else if (variant === 'purple') {
    styleClasses = 'bg-purple-50 text-purple-700 border-purple-200';
    dotClass = 'bg-purple-500';
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        styleClasses,
        sizes[size],
        className
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotClass)} />
      )}
      <span>{children}</span>
    </span>
  );
};
