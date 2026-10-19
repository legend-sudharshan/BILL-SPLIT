import React, { useState, useRef } from 'react';
import { Upload, X, Camera, Sparkles, Loader2, Image, FileText, Check } from 'lucide-react';
import { SAMPLE_RECEIPTS } from '../data/sampleReceipts.ts';
import type { ReceiptData } from '../types/receipt.ts';

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptParsed: (receipt: ReceiptData) => void;
  onSelectSample: (sampleId: string) => void;
}

export const ReceiptUploadModal: React.FC<ReceiptUploadModalProps> = ({
  isOpen,
  onClose,
  onReceiptParsed,
  onSelectSample,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleParseReceipt = async () => {
    if (!selectedImage) return;

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.receipt) {
        throw new Error(data.error || 'Failed to parse receipt image');
      }

      onReceiptParsed(data.receipt);
      onClose();
    } catch (err: any) {
      console.error('Error parsing receipt:', err);
      setErrorMessage(err.message || 'Unable to scan receipt. Please try another image.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Upload Receipt Photo</h3>
              <p className="text-xs text-slate-400">
                Gemini OCR automatically extracts line items & prices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Dropzone / Preview */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              selectedImage
                ? 'border-teal-500/50 bg-teal-950/10'
                : 'border-slate-700 hover:border-teal-500/40 bg-slate-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedImage ? (
              <div className="space-y-3">
                <img
                  src={selectedImage}
                  alt="Receipt Preview"
                  className="max-h-56 mx-auto rounded-lg shadow-md object-contain border border-slate-700"
                />
                <p className="text-xs text-teal-400 font-medium">
                  Image loaded! Click to choose a different photo.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  Click or drag a receipt photo here
                </p>
                <p className="text-xs text-slate-500">Supports JPG, PNG, WEBP receipts</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Quick Preset Selector */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
              Or pick an instant sample receipt:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_RECEIPTS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    onSelectSample(sample.id);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-left transition-all cursor-pointer group"
                >
                  <span className="text-xs font-semibold text-white block group-hover:text-teal-400 transition-colors truncate">
                    {sample.merchantName}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    ${sample.total.toFixed(2)} • {sample.items.length} items
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleParseReceipt}
            disabled={!selectedImage || isParsing}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
          >
            {isParsing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Scanning Receipt...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyze with Gemini</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
