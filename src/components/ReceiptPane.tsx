import React from 'react';
import {
  Receipt,
  Store,
  Calendar,
  UserPlus,
  Percent,
  Plus,
  Trash2,
  Sparkles,
  Info,
  Users,
} from 'lucide-react';
import type { ReceiptData, ReceiptItem, BillSummary } from '../types/receipt.ts';
import { formatCurrency, getPersonColor } from '../utils/splitCalculator.ts';

interface ReceiptPaneProps {
  receipt: ReceiptData;
  summary: BillSummary;
  onItemClick: (item: ReceiptItem) => void;
  onUpdateTipPercentage: (percentage: number) => void;
  onUpdateTipAmount: (amount: number) => void;
  onUpdateTax: (tax: number) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onSplitAllUnassigned: () => void;
}

export const ReceiptPane: React.FC<ReceiptPaneProps> = ({
  receipt,
  summary,
  onItemClick,
  onUpdateTipPercentage,
  onUpdateTipAmount,
  onUpdateTax,
  onAddItem,
  onDeleteItem,
  onSplitAllUnassigned,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 overflow-y-auto">
      {/* Receipt Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-1.5">
                {receipt.merchantName}
              </h2>
              <div className="flex items-center text-xs text-slate-400 gap-2 mt-0.5">
                {receipt.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {receipt.date}
                  </span>
                )}
                <span>•</span>
                <span>{receipt.items.length} items</span>
              </div>
            </div>
          </div>

          <button
            onClick={onAddItem}
            className="flex items-center space-x-1 text-xs text-teal-400 hover:text-teal-300 bg-teal-950/60 border border-teal-800/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Add a manual item"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Assignment Progress Bar */}
        <div className="mt-4 bg-slate-950/80 rounded-xl p-3 border border-slate-800/80">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Split Progress</span>
            <span className="font-semibold text-slate-200">
              {formatCurrency(summary.assignedSubtotal)} of {formatCurrency(summary.totalSubtotal)}{' '}
              <span className="text-teal-400 font-bold">({summary.percentAssigned}%)</span>
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                summary.isFullyAssigned ? 'bg-emerald-500' : 'bg-teal-500'
              }`}
              style={{ width: `${summary.percentAssigned}%` }}
            />
          </div>

          {summary.unassignedItemsCount > 0 && summary.participants.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-amber-400/90 flex items-center gap-1">
                <span>⚠️ {summary.unassignedItemsCount} item(s) unassigned</span>
              </span>
              <button
                onClick={onSplitAllUnassigned}
                className="text-teal-400 hover:text-teal-300 font-medium underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3 h-3" />
                Split equally among all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Structured Item List */}
      <div className="p-4 sm:p-5 flex-1 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          <span>Item & Assignees</span>
          <span>Price</span>
        </div>

        {receipt.items.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 text-sm font-medium">No receipt items found</p>
            <p className="text-slate-500 text-xs mt-1">
              Upload a receipt photo or pick a sample receipt from the top bar.
            </p>
          </div>
        ) : (
          receipt.items.map((item) => {
            const isAssigned = item.assignedTo.length > 0;
            const totalItemCost = item.price * (item.quantity || 1);

            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                className={`group relative rounded-xl p-3 border transition-all cursor-pointer ${
                  isAssigned
                    ? 'bg-slate-800/60 border-slate-700/80 hover:border-teal-500/50'
                    : 'bg-amber-950/15 border-amber-900/40 hover:border-amber-500/40'
                }`}
                title="Click to manually assign people"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Item name & quantity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.quantity > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-slate-200">
                          {item.quantity}x
                        </span>
                      )}
                      <span className="font-medium text-slate-100 text-sm leading-snug">
                        {item.name}
                      </span>
                      {item.category && (
                        <span className="text-[10px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {/* Assignee badges */}
                    <div className="mt-2 flex items-center flex-wrap gap-1.5">
                      {isAssigned ? (
                        item.assignedTo.map((person) => {
                          const color = getPersonColor(person, summary.participants);
                          const shareText =
                            item.assignedTo.length > 1
                              ? `(1/${item.assignedTo.length})`
                              : '';
                          return (
                            <span
                              key={person}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-white shadow-xs"
                              style={{ backgroundColor: color }}
                            >
                              {person} {shareText}
                            </span>
                          );
                        })
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <UserPlus className="w-3 h-3 mr-1" /> Unassigned
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 group-hover:text-teal-400 transition-colors ml-1">
                        + Edit
                      </span>
                    </div>
                  </div>

                  {/* Right: Price & Delete */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-sm font-semibold text-white">
                      {formatCurrency(totalItemCost)}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-[10px] text-slate-400">
                        ({formatCurrency(item.price)} ea)
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400 mt-1 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bill Totals & Tax / Tip Controls */}
      <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 mt-auto">
        <div className="space-y-2 text-xs">
          {/* Subtotal */}
          <div className="flex justify-between items-center text-slate-300">
            <span>Items Subtotal</span>
            <span className="font-semibold text-white text-sm">
              {formatCurrency(summary.totalSubtotal)}
            </span>
          </div>

          {/* Tax */}
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5">
              <span>Tax</span>
              <span className="text-[10px] text-slate-400">
                ({summary.totalSubtotal > 0 ? ((summary.tax / summary.totalSubtotal) * 100).toFixed(1) : 0}%)
              </span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={receipt.tax || ''}
                onChange={(e) => onUpdateTax(parseFloat(e.target.value) || 0)}
                className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-right text-white focus:outline-none focus:border-teal-500 text-xs"
                aria-label="Tax amount"
              />
            </div>
          </div>

          {/* Tip */}
          <div className="pt-1">
            <div className="flex justify-between items-center text-slate-300 mb-1.5">
              <span className="flex items-center gap-1">
                <span>Tip</span>
                <span className="text-[10px] text-teal-400 font-medium">
                  ({summary.totalSubtotal > 0 ? ((summary.tip / summary.totalSubtotal) * 100).toFixed(0) : 0}%)
                </span>
              </span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={receipt.tip || ''}
                  onChange={(e) => onUpdateTipAmount(parseFloat(e.target.value) || 0)}
                  className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-right text-white focus:outline-none focus:border-teal-500 text-xs"
                  aria-label="Tip amount"
                />
              </div>
            </div>

            {/* Quick Tip % buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[15, 18, 20, 25].map((pct) => {
                const isSelected =
                  summary.totalSubtotal > 0 &&
                  Math.abs((summary.tip / summary.totalSubtotal) * 100 - pct) < 0.5;
                return (
                  <button
                    key={pct}
                    onClick={() => onUpdateTipPercentage(pct)}
                    className={`py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Proportional note */}
          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Tax & tip are distributed proportionally based on each person's ordered items.</span>
          </div>

          {/* Grand Total */}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-sm font-bold text-white block">Grand Total</span>
              <span className="text-[10px] text-slate-400">Total Check</span>
            </div>
            <span className="text-lg font-extrabold text-teal-400">
              {formatCurrency(summary.grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
