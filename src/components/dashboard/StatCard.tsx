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
  iconBgColor = 'bg-slate-100',
  iconTextColor = 'text-slate-700',
  badge,
}) => {
  const getBadgeClass = (variant: 'positive' | 'negative' | 'neutral' | 'warning') => {
    switch (variant) {
      case 'positive':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'negative':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'neutral':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {value}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBgColor} ${iconTextColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between text-xs">
        {subtitle && <span className="text-slate-500">{subtitle}</span>}
        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full font-semibold border ${getBadgeClass(
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
