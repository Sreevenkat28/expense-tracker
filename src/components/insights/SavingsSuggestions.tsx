import React, { useState } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  Calculator,
} from 'lucide-react';
import type { SavingsSuggestion, CategorySpending } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface SavingsSuggestionsProps {
  suggestions: SavingsSuggestion[];
  categorySpendings: CategorySpending[];
}

export const SavingsSuggestions: React.FC<SavingsSuggestionsProps> = ({
  suggestions,
  categorySpendings,
}) => {
  // Reduction Simulator State
  const [selectedSimCategory, setSelectedSimCategory] = useState<string>(() => {
    const top = categorySpendings.find((c) => c.amountCents > 0);
    return top ? top.category : 'Food and groceries';
  });
  const [reductionPercent, setReductionPercent] = useState<number>(15);

  const activeCategories = categorySpendings.filter((c) => c.amountCents > 0);
  const currentCategoryData = categorySpendings.find((c) => c.category === selectedSimCategory);
  const currentCategoryCents = currentCategoryData ? currentCategoryData.amountCents : 0;

  // Simulator savings calculations
  const simulatedMonthlySavingsCents = Math.round(
    currentCategoryCents * (reductionPercent / 100)
  );
  const simulatedAnnualSavingsCents = simulatedMonthlySavingsCents * 12;

  const getSeverityStyle = (severity: SavingsSuggestion['severity']) => {
    switch (severity) {
      case 'alert':
        return {
          cardBg: 'bg-rose-50/70 border-rose-200/90',
          iconBg: 'bg-rose-100 text-rose-700',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: AlertOctagon,
        };
      case 'warning':
        return {
          cardBg: 'bg-amber-50/70 border-amber-200/90',
          iconBg: 'bg-amber-100 text-amber-700',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: AlertTriangle,
        };
      case 'success':
        return {
          cardBg: 'bg-emerald-50/70 border-emerald-200/90',
          iconBg: 'bg-emerald-100 text-emerald-700',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'info':
      default:
        return {
          cardBg: 'bg-slate-50 border-slate-200/90',
          iconBg: 'bg-slate-100 text-slate-700',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Info,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Rule-based Suggestions Cards */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 m-0">Practical Savings Suggestions</h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                Transparent Rule-Based
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Generated directly from your transaction ledger and budget thresholds. Projections are estimates.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((suggestion) => {
            const style = getSeverityStyle(suggestion.severity);
            const Icon = style.icon;

            return (
              <div
                key={suggestion.id}
                className={`p-4 rounded-2xl border ${style.cardBg} transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${style.iconBg} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {suggestion.title}
                      </h4>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${style.badgeBg}`}
                    >
                      {suggestion.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>

                {suggestion.potentialSavingsCents && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Estimated Monthly Savings:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      +{formatCurrency(suggestion.potentialSavingsCents)}/mo
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Proposed Spending Reduction Simulator */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Interactive Spending Reduction Simulator
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate how trimming specific expense areas accelerates your cash reserve
            </p>
          </div>
        </div>

        {activeCategories.length === 0 ? (
          <p className="text-xs text-slate-400 mt-4">
            Record expenses in this month to run interactive savings projections.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Interactive Inputs */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Choose Category to Optimize
                </label>
                <select
                  value={selectedSimCategory}
                  onChange={(e) => setSelectedSimCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                >
                  {activeCategories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category} ({formatCurrency(c.amountCents)} spent)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Target Reduction Percentage:</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {reductionPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={reductionPercent}
                  onChange={(e) => setReductionPercent(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>5% (Light Trim)</span>
                  <span>25% (Moderate Cut)</span>
                  <span>50% (Strict Diet)</span>
                </div>
              </div>
            </div>

            {/* Simulated Projected Savings Result Box */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-md">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Projected Impact Estimate
              </span>

              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-2xl font-black text-emerald-400">
                    +{formatCurrency(simulatedMonthlySavingsCents)}
                  </div>
                  <div className="text-xs text-slate-300">
                    Estimated monthly reduction
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/80">
                  <div className="text-lg font-bold text-slate-200">
                    +{formatCurrency(simulatedAnnualSavingsCents)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Annual cumulative reserve growth
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[10px] text-slate-400 italic">
                * Note: Projections are estimates based on your logged spending in {selectedSimCategory}.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
