export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[]; // List of person names
  category?: string;
}

export interface ReceiptData {
  id: string;
  merchantName: string;
  date?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  tipType: 'amount' | 'percentage';
  tipPercentage?: number;
  total: number;
  rawImageUrl?: string;
}

export interface PersonItemDetail {
  itemId: string;
  itemName: string;
  itemPrice: number;
  quantity: number;
  coAssigneesCount: number;
  shareFraction: number; // e.g. 0.5 for 2 people
  itemShareCost: number; // itemPrice * quantity * shareFraction
}

export interface PersonSplit {
  name: string;
  color: string;
  items: PersonItemDetail[];
  subtotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
  percentageOfBill: number;
}

export interface BillSummary {
  totalSubtotal: number;
  tax: number;
  tip: number;
  grandTotal: number;
  assignedSubtotal: number;
  unassignedSubtotal: number;
  unassignedItemsCount: number;
  percentAssigned: number;
  splits: Record<string, PersonSplit>;
  participants: string[];
  isFullyAssigned: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actionSummary?: string;
  changesMade?: {
    assigned?: { item: string; people: string[] }[];
    unassigned?: { item: string; people: string[] }[];
    tipUpdated?: string;
    taxUpdated?: string;
  };
  suggestedActions?: string[];
}
