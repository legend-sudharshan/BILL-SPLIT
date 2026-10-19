import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Receipt,
  AlertCircle,
  Sparkles,
  PieChart,
} from 'lucide-react';
import type { BillSummary, PersonSplit } from '../types/receipt.ts';
import { formatCurrency } from '../utils/splitCalculator.ts';

interface BreakdownSummaryProps {
  summary: BillSummary;
  merchantName: string;
  onSplitAllUnassigned: () => void;
}

export const BreakdownSummary: React.FC<BreakdownSummaryProps> = ({
  summary,
  merchantName,
  onSplitAllUnassigned,
}) => {
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [copiedPerson, setCopiedPerson] = useState<string | null>(null);

  const toggleExpand = (name: string) => {
    setExpandedPerson((prev) => (prev === name ? null : name));
  };

  const copyPersonBreakdown = (split: PersonSplit) => {
    const text = `Hey ${split.name}! Your share for ${merchantName || 'the meal'} is ${formatCurrency(
      split.total
    )} (Items: ${formatCurrency(split.subtotal)}, Tax: ${formatCurrency(
      split.taxShare
    )}, Tip: ${formatCurrency(split.tipShare)}).`;
    navigator.clipboard.writeText(text);
    setCopiedPerson(split.name);
    setTimeout(() => setCopiedPerson(null), 2000);
  };

  const participantsList = Object.values(summary.splits);
  const activeParticipants = participantsList.filter((p) => p.subtotal > 0);

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Real-Time Person Breakdown</span>
              {summary.isFullyAssigned && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">
                  Complete
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Tax & tip automatically distributed proportionally
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block">Total Check</span>
          <span className="text-sm font-bold text-white">
            {formatCurrency(summary.grandTotal)}
          </span>
        </div>
      </div>

      {/* Unassigned Warning Alert */}
      {summary.unassignedSubtotal > 0 && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="font-semibold">{formatCurrency(summary.unassignedSubtotal)}</strong>{' '}
              unassigned ({summary.unassignedItemsCount} item{summary.unassignedItemsCount > 1 ? 's' : ''})
            </span>
          </div>
          {activeParticipants.length > 0 && (
            <button
              onClick={onSplitAllUnassigned}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer"
            >
              Split remainder equally
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {activeParticipants.length === 0 ? (
        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-xs text-slate-400">
          <PieChart className="w-6 h-6 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-300 font-medium">No costs assigned yet</p>
          <p className="text-slate-400 mt-1">
            Type commands in chat like &ldquo;Dhruv had the nachos&rdquo; or click items on the left.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeParticipants.map((person) => {
            const isExpanded = expandedPerson === person.name;
            const isCopied = copiedPerson === person.name;

            return (
              <div
                key={person.name}
                className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all shadow-sm"
              >
                {/* Person Card Top */}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    {/* Name + Initial Avatar */}
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: person.color }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {person.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {person.percentageOfBill}% of meal
                        </span>
                      </div>
                    </div>

                    {/* Total Amount Owed */}
                    <div className="text-right">
                      <div className="text-base font-extrabold text-teal-400">
                        {formatCurrency(person.total)}
                      </div>
                      <span className="text-[10px] text-slate-400 block">Total Owed</span>
                    </div>
                  </div>

                  {/* Quick summary line */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[11px] text-slate-300 text-center">
                    <div className="bg-slate-900/60 rounded p-1">
                      <span className="text-[9px] text-slate-400 block">Items</span>
                      <span className="font-semibold text-slate-200">
                        {formatCurrency(person.subtotal)}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 rounded p-1">
                      <span className="text-[9px] text-slate-400 block">+Tax</span>
                      <span className="font-medium text-slate-300">
                        {formatCurrency(person.taxShare)}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 rounded p-1">
                      <span className="text-[9px] text-slate-400 block">+Tip</span>
                      <span className="font-medium text-slate-300">
                        {formatCurrency(person.tipShare)}
                      </span>
                    </div>
                  </div>

                  {/* Actions: View Details & Copy */}
                  <div className="mt-2.5 flex items-center justify-between text-xs pt-1">
                    <button
                      onClick={() => toggleExpand(person.name)}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide items' : `${person.items.length} items`}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      onClick={() => copyPersonBreakdown(person)}
                      className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium cursor-pointer"
                      title="Copy person breakdown"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy share</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable item details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 bg-slate-900/40 space-y-1.5 text-xs">
                    {person.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-300">
                        <span className="truncate pr-2">
                          {item.itemName}{' '}
                          {item.coAssigneesCount > 1 && (
                            <span className="text-[10px] text-slate-400">
                              (1/{item.coAssigneesCount})
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-slate-200 shrink-0">
                          {formatCurrency(item.itemShareCost)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
