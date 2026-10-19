import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Lightbulb, ArrowRight, CornerDownLeft } from 'lucide-react';
import type { ChatMessage, ReceiptData, BillSummary } from '../types/receipt.ts';

interface ChatPaneProps {
  messages: ChatMessage[];
  receipt: ReceiptData;
  summary: BillSummary;
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  suggestedPrompts: string[];
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  messages,
  receipt,
  summary,
  isLoading,
  onSendMessage,
  suggestedPrompts,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleChipClick = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Chat Top Banner */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white">Smart Split Chat</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Gemini 3.8 Flash • Natural Language Commands</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
          <Sparkles className="w-3 h-3 text-teal-400" />
          <span>Multi-turn active</span>
        </div>
      </div>

      {/* Messages Scrollable Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2.5 max-w-xl mx-auto shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-200">{msg.content}</p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                  isUser
                    ? 'bg-teal-600 text-white font-bold'
                    : 'bg-slate-800 border border-slate-700 text-teal-400'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-teal-600 text-white rounded-tr-xs'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* If assistant returned change summary pills */}
                {msg.actionSummary && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-teal-300/90 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>{msg.actionSummary}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-teal-400 flex items-center justify-center text-xs shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-xs px-4 py-3 text-sm text-slate-400 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              <span>Analyzing command & updating split...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      {suggestedPrompts.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
          <span className="text-[11px] text-slate-400 font-medium shrink-0">Try:</span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(prompt)}
              className="text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700/80 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>{prompt}</span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Form */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. 'Dhruv had the nachos' or 'Sarah and Sue shared the pizza'..."
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all disabled:opacity-50"
              aria-label="Natural language bill command"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center cursor-pointer shadow-sm"
            aria-label="Send bill command"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <div className="mt-1.5 flex justify-between items-center text-[11px] text-slate-400 px-1">
          <span>Natural language command engine</span>
          <span className="hidden sm:inline">Press Enter to send</span>
        </div>
      </div>
    </div>
  );
};
