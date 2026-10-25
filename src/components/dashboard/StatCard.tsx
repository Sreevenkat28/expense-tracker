import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconTextColor?: string;
  badge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'warning';
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-slate-100 dark:bg-slate-800',
  iconTextColor = 'text-slate-700 dark:text-slate-200',
  badge,
}) => {
  const getBadgeClass = (variant: 'positive' | 'negative' | 'neutral' | 'warning') => {
    switch (variant) {
      case 'positive':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'negative':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'neutral':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight break-words">
            {value}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBgColor} ${iconTextColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 text-xs">
        {subtitle && <span className="text-slate-500 dark:text-slate-400 min-w-0 break-words">{subtitle}</span>}
        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full font-semibold border shrink-0 ${getBadgeClass(
              badge.variant
            )}`}
          >
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
};
