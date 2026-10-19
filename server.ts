import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SAMPLE_RECEIPTS } from './data/sampleReceipts.ts';
import { Header } from './components/Header.tsx';
import { ReceiptPane } from './components/ReceiptPane.tsx';
import { ChatPane } from './components/ChatPane.tsx';
import { BreakdownSummary } from './components/BreakdownSummary.tsx';
import { ReceiptUploadModal } from './components/ReceiptUploadModal.tsx';
import { ItemAssignModal } from './components/ItemAssignModal.tsx';
import { AddItemModal } from './components/AddItemModal.tsx';
import { calculateBillSummary, generateShareText } from './utils/splitCalculator.ts';
import type { ReceiptData, ReceiptItem, ChatMessage } from './types/receipt.ts';
import { Receipt as ReceiptIcon, MessageSquare, Check, Sparkles } from 'lucide-react';

const calculateSubtotal = (items: ReceiptItem[]) =>
  items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

const normaliseReceiptTotals = (receipt: ReceiptData, items = receipt.items): ReceiptData => {
  const subtotal = calculateSubtotal(items);
  const tax = Number(receipt.tax) || 0;
  const tip = Number(receipt.tip) || 0;

  return {
    ...receipt,
    items,
    subtotal,
    tax,
    tip,
    total: subtotal + tax + tip,
  };
};

export default function App() {
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData>(SAMPLE_RECEIPTS[0]);
  const [knownParticipants, setKnownParticipants] = useState<string[]>(['Dhruv', 'Sarah', 'Sue']);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedItemForAssign, setSelectedItemForAssign] = useState<ReceiptItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<'receipt' | 'chat'>('receipt');

  const receiptRef = useRef(currentReceipt);
  const participantsRef = useRef(knownParticipants);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    receiptRef.current = currentReceipt;
  }, [currentReceipt]);

  useEffect(() => {
    participantsRef.current = knownParticipants;
  }, [knownParticipants]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Multi-turn conversation messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'system',
      content:
        '👋 Welcome to SplitSense AI! I have parsed the receipt for ' +
        SAMPLE_RECEIPTS[0].merchantName +
        '. You can assign items using natural language commands below or tap on dishes directly.',
      timestamp: Date.now() - 60000,
    },
    {
      id: 'welcome-2',
      role: 'assistant',
      content:
        'Try saying: "Dhruv had the nachos", "Sarah and Sue shared the pizza", or "Add 18% tip". Tax and tip will automatically distribute proportionally to each person\'s subtotal!',
      timestamp: Date.now() - 50000,
      suggestedActions: [
        'Dhruv had the nachos',
        'Sarah and Sue shared the pizza',
        'Add 20% tip',
      ],
    },
  ]);

  // Dynamic suggested prompts
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    'Dhruv had the nachos',
    'Sarah and Sue shared the pizza',
    'Split unassigned items equally',
    'Add 20% tip',
  ]);

  // Compute real-time bill summary with proportional tax & tip
  const summary = useMemo(() => {
    return calculateBillSummary(currentReceipt, knownParticipants);
  }, [currentReceipt, knownParticipants]);

  // Show a momentary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.clearTimeout((showToast as any)._timer);
    (showToast as any)._timer = window.setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch sample receipt
  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_RECEIPTS.find((r) => r.id === sampleId);
    if (!sample) return;

    const nextReceipt = JSON.parse(JSON.stringify(sample));
    setCurrentReceipt(nextReceipt);
    setMessages([
      {
        id: 'new-receipt-' + Date.now(),
        role: 'system',
        content: `Loaded receipt for "${sample.merchantName}" (${sample.items.length} items, total $${sample.total.toFixed(2)}).`,
        timestamp: Date.now(),
      },
      {
        id: 'new-receipt-prompt-' + Date.now(),
        role: 'assistant',
        content: `Tell me who ordered which dish, or tell me to split everything equally!`,
        timestamp: Date.now(),
      },
    ]);
    setSuggestedPrompts([
      `Dhruv had the ${sample.items[0]?.name || 'first dish'}`,
      'Sarah and Sue shared the pizza',
      'Split unassigned items equally',
      'Add 20% tip',
    ]);
  };

  // Uploaded parsed receipt handler
  const handleReceiptParsed = (newReceipt: ReceiptData) => {
    setCurrentReceipt(newReceipt);
    setMessages([
      {
        id: 'parsed-' + Date.now(),
        role: 'system',
        content: `🎉 Successfully analyzed receipt for "${newReceipt.merchantName}" via Gemini OCR! Extracted ${newReceipt.items.length} line items.`,
        timestamp: Date.now(),
      },
      {
        id: 'parsed-bot-' + Date.now(),
        role: 'assistant',
        content: `Who had which items? You can say things like "Alex had the ${newReceipt.items[0]?.name || 'first item'}" or "Sam and Bob shared the main dish".`,
        timestamp: Date.now(),
      },
    ]);
    showToast(`Receipt parsed: ${newReceipt.items.length} items detected!`);
  };

  // Send natural language command to chat endpoint
  const handleSendMessage = async (userText: string) => {
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    const receiptSnapshot = receiptRef.current;
    const participantSnapshot = participantsRef.current;
    const conversationSnapshot = messagesRef.current;

    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          receipt: receiptSnapshot,
          conversation: conversationSnapshot,
          knownParticipants: participantSnapshot,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process command');
      }

      // Apply updates to receipt items
      let updatedItems = [...receiptSnapshot.items];
      const newlyAddedPeople: string[] = [...(data.newParticipants || [])];

      if (data.itemUpdates && data.itemUpdates.length > 0) {
        data.itemUpdates.forEach((update: any) => {
          const itemIdx = updatedItems.findIndex((it) => it.id === update.itemId);
          if (itemIdx !== -1) {
            const currentItem = updatedItems[itemIdx];
            let nextAssignees: string[] = [];

            if (update.action === 'add') {
              nextAssignees = Array.from(
                new Set([...currentItem.assignedTo, ...update.assignedTo])
              );
            } else if (update.action === 'remove') {
              nextAssignees = currentItem.assignedTo.filter(
                (p) => !update.assignedTo.includes(p)
              );
            } else {
              // replace / set
              nextAssignees = update.assignedTo;
            }

            updatedItems[itemIdx] = {
              ...currentItem,
              assignedTo: nextAssignees,
            };

            nextAssignees.forEach((p) => {
              if (!newlyAddedPeople.includes(p) && !participantSnapshot.includes(p)) {
                newlyAddedPeople.push(p);
              }
            });
          }
        });
      }

      // Tip or tax updates
      let updatedTip = receiptSnapshot.tip;
      let updatedTipPercentage = receiptSnapshot.tipPercentage;
      let updatedTax = receiptSnapshot.tax;

      if (data.tipUpdate) {
        if (data.tipUpdate.type === 'percentage') {
          const pct = data.tipUpdate.value;
          updatedTipPercentage = pct;
          const subtotal = calculateSubtotal(updatedItems);
          updatedTip = Math.round(subtotal * (pct / 100) * 100) / 100;
        } else {
          updatedTip = data.tipUpdate.value;
        }
      }

      if (data.taxUpdate?.amount) {
        updatedTax = data.taxUpdate.amount;
      }

      const nextReceipt = normaliseReceiptTotals(
        {
          ...receiptSnapshot,
          items: updatedItems,
          tax: updatedTax,
          tip: updatedTip,
          tipPercentage: updatedTipPercentage,
        },
        updatedItems
      );

      setCurrentReceipt(nextReceipt);

      if (newlyAddedPeople.length > 0) {
        setKnownParticipants((prev) =>
          Array.from(new Set([...prev, ...newlyAddedPeople]))
        );
      }

      // Append assistant message
      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'assistant',
        content: data.reply || 'Got it! Receipt split updated.',
        timestamp: Date.now(),
        actionSummary:
          data.itemUpdates && data.itemUpdates.length > 0
            ? `Updated ${data.itemUpdates.length} item(s)`
            : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.suggestedActions && data.suggestedActions.length > 0) {
        setSuggestedPrompts(data.suggestedActions);
      }
    } catch (err: any) {
      console.error('Error processing command:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: "Sorry, I had trouble parsing that. Try something like 'Dhruv had the nachos' or 'Sarah and Sue shared the pizza'.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Reset all assignments
  const handleResetAssignments = () => {
    setCurrentReceipt((prev) => ({
      ...prev,
      items: prev.items.map((it) => ({ ...it, assignedTo: [] })),
    }));
    setMessages((prev) => [
      ...prev,
      {
        id: 'reset-' + Date.now(),
        role: 'system',
        content: '🔄 Cleared all item assignments. Ready for a new split!',
        timestamp: Date.now(),
      },
    ]);
    showToast('All item assignments cleared');
  };

  // Share summary via clipboard
  const handleShare = () => {
    const text = generateShareText(summary, currentReceipt.merchantName);
    navigator.clipboard.writeText(text);
    showToast('Breakdown copied to clipboard!');
  };

  // Split all unassigned items equally among known participants
  const handleSplitAllUnassigned = () => {
    if (summary.participants.length === 0) {
      showToast('Please assign at least one person first!');
      return;
    }

    setCurrentReceipt((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.assignedTo.length === 0
          ? { ...it, assignedTo: [...summary.participants] }
          : it
      ),
    }));

    setMessages((prev) => [
      ...prev,
      {
        id: 'split-all-' + Date.now(),
        role: 'assistant',
        content: `Split all ${summary.unassignedItemsCount} unassigned dish(es) equally among ${summary.participants.join(', ')}!`,
        timestamp: Date.now(),
      },
    ]);
    showToast('Unassigned items distributed equally!');
  };

  // Tip adjustments
  const handleUpdateTipPercentage = (percentage: number) => {
    const calculatedTip =
      Math.round(summary.totalSubtotal * (percentage / 100) * 100) / 100;
    setCurrentReceipt((prev) => ({
      ...prev,
      tip: calculatedTip,
      tipType: 'percentage',
      tipPercentage: percentage,
      total: prev.subtotal + prev.tax + calculatedTip,
    }));
  };

  const handleUpdateTipAmount = (amount: number) => {
    setCurrentReceipt((prev) => ({
      ...prev,
      tip: amount,
      tipType: 'amount',
      total: prev.subtotal + prev.tax + amount,
    }));
  };

  // Tax adjustment
  const handleUpdateTax = (tax: number) => {
    setCurrentReceipt((prev) => ({
      ...prev,
      tax,
      total: prev.subtotal + tax + prev.tip,
    }));
  };

  // Manual Add Item
  const handleAddItem = (newItem: Omit<ReceiptItem, 'id' | 'assignedTo'>) => {
    const item: ReceiptItem = {
      ...newItem,
      id: 'custom-item-' + Date.now(),
      assignedTo: [],
    };
    setCurrentReceipt((prev) => {
      const items = [...prev.items, item];
      return normaliseReceiptTotals({ ...prev, items });
    });
    showToast(`Added ${newItem.name}`);
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    setCurrentReceipt((prev) => {
      const items = prev.items.filter((it) => it.id !== itemId);
      return normaliseReceiptTotals({ ...prev, items });
    });
  };

  // Save manual assignees from modal
  const handleSaveAssignees = (itemId: string, assignees: string[]) => {
    setCurrentReceipt((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === itemId ? { ...it, assignedTo: assignees } : it)),
    }));
    setKnownParticipants((prev) => Array.from(new Set([...prev, ...assignees])));
    showToast('Item assignees updated');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-5 z-50 bg-teal-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 stroke-3" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* App Header */}
      <Header
        currentReceipt={currentReceipt}
        summary={summary}
        onSelectSample={handleSelectSample}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onResetAssignments={handleResetAssignments}
        onShare={handleShare}
      />

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b border-slate-800 bg-slate-900 z-20 shrink-0">
        <button
          onClick={() => setMobileActiveTab('receipt')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
            mobileActiveTab === 'receipt'
              ? 'border-teal-400 text-teal-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ReceiptIcon className="w-3.5 h-3.5" />
          <span>Receipt ({currentReceipt.items.length})</span>
        </button>
        <button
          onClick={() => setMobileActiveTab('chat')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
            mobileActiveTab === 'chat'
              ? 'border-teal-400 text-teal-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Smart Chat & Split</span>
          {summary.percentAssigned > 0 && (
            <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded-full">
              {summary.percentAssigned}%
            </span>
          )}
        </button>
      </div>

      {/* Main Split-Screen Workspace */}
      <main className="flex-1 flex flex-col md:grid md:grid-cols-2 overflow-hidden min-h-0">
        {/* Left Pane: AI-Parsed Receipt */}
        <section
          className={`h-full overflow-hidden ${
            mobileActiveTab === 'receipt' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
          }`}
          aria-label="Receipt details pane"
        >
          <ReceiptPane
            receipt={currentReceipt}
            summary={summary}
            onItemClick={(item) => setSelectedItemForAssign(item)}
            onUpdateTipPercentage={handleUpdateTipPercentage}
            onUpdateTipAmount={handleUpdateTipAmount}
            onUpdateTax={handleUpdateTax}
            onAddItem={() => setIsAddItemModalOpen(true)}
            onDeleteItem={handleDeleteItem}
            onSplitAllUnassigned={handleSplitAllUnassigned}
          />
        </section>

        {/* Right Pane: Smart Chat & Real-Time Proportional Summary */}
        <section
          className={`h-full overflow-hidden flex flex-col bg-slate-950 ${
            mobileActiveTab === 'chat' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
          }`}
          aria-label="Smart chat and live breakdown pane"
        >
          {/* Upper: Multi-turn Chat */}
          <div className="flex-1 min-h-[300px] overflow-hidden">
            <ChatPane
              messages={messages}
              receipt={currentReceipt}
              summary={summary}
              isLoading={isChatLoading}
              onSendMessage={handleSendMessage}
              suggestedPrompts={suggestedPrompts}
            />
          </div>

          {/* Lower: Real-Time Summary with proportional tax & tip */}
          <div className="shrink-0 max-h-[45vh] overflow-y-auto">
            <BreakdownSummary
              summary={summary}
              merchantName={currentReceipt.merchantName}
              onSplitAllUnassigned={handleSplitAllUnassigned}
            />
          </div>
        </section>
      </main>

      {/* Modals */}
      <ReceiptUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onReceiptParsed={handleReceiptParsed}
        onSelectSample={handleSelectSample}
      />

      <ItemAssignModal
        item={selectedItemForAssign}
        knownParticipants={knownParticipants}
        onClose={() => setSelectedItemForAssign(null)}
        onSaveAssignees={handleSaveAssignees}
      />

      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onAddItem={handleAddItem}
      />
    </div>
  );
}

