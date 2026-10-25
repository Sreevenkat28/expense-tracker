import React, { useState } from 'react';
import { CategorySpending, CATEGORY_COLORS } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface CategoryPieChartProps {
  categorySpendings: CategorySpending[];
  totalExpensesCents: number;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categorySpendings,
  totalExpensesCents,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Filter to active categories
  const activeSpendings = categorySpendings.filter((c) => c.amountCents > 0);

  if (activeSpendings.length === 0 || totalExpensesCents === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
        <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-200 mb-3" />
        <p className="text-sm font-semibold text-slate-600">No expense records this month</p>
        <p className="text-xs text-slate-400 mt-0.5">Log expenses to visualize category distributions</p>
      </div>
    );
  }

  // Calculate SVG donut slice arcs
  const radius = 80;
  const strokeWidth = 32;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const slices = activeSpendings.map((item) => {
    const percent = item.percentage;
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    const color = CATEGORY_COLORS[item.category]?.fill || '#64748b';

    cumulativePercent += percent;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      color,
    };
  });

  const highlightedItem = hoveredCategory
    ? activeSpendings.find((s) => s.category === hoveredCategory)
    : activeSpendings[0];

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      {/* SVG Donut Chart */}
      <div className="relative w-52 h-52 shrink-0 flex items-center justify-center">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 220 220"
        >
          {/* Base track */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredCategory === slice.category;
            return (
              <circle
                key={slice.category}
                cx="110"
                cy="110"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredCategory(slice.category)}
                onMouseLeave={() => setHoveredCategory(null)}
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight max-w-[110px] break-words">
            {hoveredCategory || 'Total Spend'}
          </span>
          <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            {hoveredCategory && highlightedItem
              ? formatCurrency(highlightedItem.amountCents)
              : formatCurrency(totalExpensesCents)}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {hoveredCategory && highlightedItem
              ? `${highlightedItem.percentage.toFixed(1)}%`
              : `${activeSpendings.length} ${activeSpendings.length === 1 ? 'category' : 'categories'}`}
          </span>
        </div>
      </div>

      {/* Legend & Category Bars */}
      <div className="w-full space-y-2.5">
        {activeSpendings.map((item) => {
          const colorInfo = CATEGORY_COLORS[item.category] || {
            fill: '#64748b',
            bg: 'bg-slate-100',
            text: 'text-slate-700',
          };
          const isHovered = hoveredCategory === item.category;

          return (
            <div
              key={item.category}
              onMouseEnter={() => setHoveredCategory(item.category)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isHovered ? 'bg-slate-100/90 scale-[1.01]' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorInfo.fill }}
                  />
                  <span>{item.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    {formatCurrency(item.amountCents)}
                  </span>
                  <span className="text-slate-400 text-[11px] font-medium w-9 text-right">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Mini progress track */}
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: colorInfo.fill,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
