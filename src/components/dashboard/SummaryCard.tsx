import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SummaryCardProps {
  title: string;
  value: string;
  trend?: {
    percentage: number;
    isPositive: boolean;
    label?: string;
  };
  icon: React.ReactNode;
  iconBgColor?: string;
  badge?: React.ReactNode;
  subtitle?: string;
  highlightAlert?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  trend,
  icon,
  iconBgColor = 'bg-indigo-50 text-indigo-600',
  badge,
  subtitle,
  highlightAlert = false,
}) => {
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden',
        highlightAlert && 'border-rose-200/90 bg-rose-50/20'
      )}
    >
      {/* Top Header with title and icon */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h4 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h4>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
        </div>

        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105',
            iconBgColor
          )}
        >
          {icon}
        </div>
      </div>

      {/* Footer / Trend Info */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100/80 text-xs">
        {trend ? (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center font-semibold rounded-md px-1.5 py-0.5',
                trend.isPositive
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              )}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5 stroke-[2.5]" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 mr-0.5 stroke-[2.5]" />
              )}
              {Math.abs(trend.percentage)}%
            </span>
            <span className="text-slate-500">{trend.label || 'vs last month'}</span>
          </div>
        ) : subtitle ? (
          <span className="text-slate-500">{subtitle}</span>
        ) : (
          <span className="text-slate-400">Updated just now</span>
        )}
      </div>
    </div>
  );
};
