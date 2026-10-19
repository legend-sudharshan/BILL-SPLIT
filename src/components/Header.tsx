import React from 'react';
import { Receipt, Upload, RotateCcw, Share2, Sparkles, CheckCircle2 } from 'lucide-react';
import { SAMPLE_RECEIPTS } from '../data/sampleReceipts.ts';
import type { ReceiptData, BillSummary } from '../types/receipt.ts';

interface HeaderProps {
  currentReceipt: ReceiptData;
  summary: BillSummary;
  onSelectSample: (sampleId: string) => void;
  onOpenUpload: () => void;
  onResetAssignments: () => void;
  onShare: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentReceipt,
  summary,
  onSelectSample,
  onOpenUpload,
  onResetAssignments,
  onShare,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Logo and Title */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Receipt className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">SplitSense</h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden lg:block">
              Split-screen AI receipt parser & smart conversational bill splitter
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Sample Receipt Selector */}
          <div className="flex items-center space-x-1 bg-slate-800/90 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-300">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Sample:</span>
            <select
              value={currentReceipt.id}
              onChange={(e) => onSelectSample(e.target.value)}
              className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[160px] truncate"
              aria-label="Select sample receipt"
            >
              {SAMPLE_RECEIPTS.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-800 text-white">
                  {r.merchantName} (${r.total.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
            title="Upload receipt photo"
            aria-label="Upload receipt image"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Share Summary Button */}
          <button
            onClick={onShare}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Copy breakdown text to clipboard"
            aria-label="Share bill summary"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Share</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={onResetAssignments}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
            title="Reset all assignments"
            aria-label="Reset assignments"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fully Split Indicator */}
          {summary.isFullyAssigned ? (
            <span className="hidden md:flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Split</span>
            </span>
          ) : (
            <span className="hidden md:flex items-center space-x-1 text-xs text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-1 rounded-full font-medium">
              <span>{summary.percentAssigned}%</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
