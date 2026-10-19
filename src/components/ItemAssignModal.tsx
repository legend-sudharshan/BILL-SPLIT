import React, { useState } from 'react';
import { X, Check, UserPlus, Users } from 'lucide-react';
import type { ReceiptItem } from '../types/receipt.ts';
import { formatCurrency, getPersonColor } from '../utils/splitCalculator.ts';

interface ItemAssignModalProps {
  item: ReceiptItem | null;
  knownParticipants: string[];
  onClose: () => void;
  onSaveAssignees: (itemId: string, assignees: string[]) => void;
}

export const ItemAssignModal: React.FC<ItemAssignModalProps> = ({
  item,
  knownParticipants,
  onClose,
  onSaveAssignees,
}) => {
  if (!item) return null;

  const [assignees, setAssignees] = useState<string[]>(item.assignedTo || []);
  const [newPersonName, setNewPersonName] = useState('');

  const togglePerson = (name: string) => {
    setAssignees((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const handleAddNewPerson = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPersonName.trim();
    if (!clean) return;
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (!assignees.includes(capitalized)) {
      setAssignees((prev) => [...prev, capitalized]);
    }
    setNewPersonName('');
  };

  const handleSave = () => {
    onSaveAssignees(item.id, assignees);
    onClose();
  };

  // Combine known participants and any assigned to this item
  const allPeople = Array.from(new Set([...knownParticipants, ...assignees]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block">
              Assign Dish
            </span>
            <h3 className="text-base font-bold text-white truncate max-w-xs">{item.name}</h3>
            <span className="text-xs text-slate-400">
              {formatCurrency(item.price * (item.quantity || 1))} total
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-2">
              Select who shared or ordered this item:
            </label>

            {allPeople.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No people added yet. Add a name below or chat like &quot;Dhruv had the nachos&quot;.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allPeople.map((person) => {
                  const isSelected = assignees.includes(person);
                  const color = getPersonColor(person, allPeople);

                  return (
                    <button
                      key={person}
                      type="button"
                      onClick={() => togglePerson(person)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                      style={isSelected ? { backgroundColor: color } : {}}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 stroke-3" />
                      ) : (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      )}
                      <span>{person}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Person Input */}
          <form onSubmit={handleAddNewPerson} className="pt-2 border-t border-slate-800">
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              Add a new person
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="e.g. Alex, Sam, Maria..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={!newPersonName.trim()}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-teal-400 px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Share Breakdown Preview */}
          {assignees.length > 0 && (
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-400 font-medium block mb-1">Cost distribution:</span>
              <p>
                Split among {assignees.length} people ={' '}
                <strong className="text-teal-400 font-semibold">
                  {formatCurrency((item.price * (item.quantity || 1)) / assignees.length)}
                </strong>{' '}
                each (before proportional tax & tip).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setAssignees([])}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
          >
            Clear Assignees
          </button>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors cursor-pointer shadow-sm"
            >
              Save Assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
