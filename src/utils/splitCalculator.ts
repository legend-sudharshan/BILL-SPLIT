import type { BillSummary, PersonSplit, ReceiptData } from '../types/receipt.ts';

// Deterministic vibrant colors for participants
export const PARTICIPANT_COLORS = [
  '#0D9488', // Teal
  '#7C3AED', // Violet
  '#EA580C', // Orange
  '#2563EB', // Blue
  '#DB2777', // Pink
  '#059669', // Emerald
  '#D97706', // Amber
  '#4F46E5', // Indigo
  '#DC2626', // Red
  '#0891B2', // Cyan
];

export function getPersonColor(name: string, knownList?: string[]): string {
  if (knownList && knownList.includes(name)) {
    const idx = knownList.indexOf(name);
    return PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length];
  }
  // Simple hash for consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PARTICIPANT_COLORS.length;
  return PARTICIPANT_COLORS[index];
}

/**
 * Calculates item totals, proportional tax, proportional tip, and per-person breakdown.
 * Formula:
 * - Each person's item share = (item.price * item.quantity) / (item.assignedTo.length)
 * - Person Subtotal = sum of all their item shares
 * - If totalSubtotal > 0:
 *     Tax Share = roundToCents(tax * (personSubtotal / totalSubtotal))
 *     Tip Share = roundToCents(tip * (personSubtotal / totalSubtotal))
 * - Person Total = personSubtotal + taxShare + tipShare
 */
export function calculateBillSummary(
  receipt: ReceiptData,
  explicitParticipants: string[] = []
): BillSummary {
  // 1. Calculate actual subtotal from items if present or use receipt.subtotal
  const itemsSubtotal = receipt.items.reduce(
    (acc, item) => acc + item.price * (item.quantity || 1),
    0
  );
  const totalSubtotal = itemsSubtotal > 0 ? itemsSubtotal : receipt.subtotal || 0;
  const tax = Number(receipt.tax) || 0;
  const tip = Number(receipt.tip) || 0;
  const grandTotal = totalSubtotal + tax + tip;

  // 2. Collect all active participants
  const participantsSet = new Set<string>(explicitParticipants);
  receipt.items.forEach((item) => {
    item.assignedTo.forEach((p) => {
      const cleanName = p.trim();
      if (cleanName) participantsSet.add(cleanName);
    });
  });
  const participants = Array.from(participantsSet);

  // Initialize splits record
  const splits: Record<string, PersonSplit> = {};
  participants.forEach((name) => {
    splits[name] = {
      name,
      color: getPersonColor(name, participants),
      items: [],
      subtotal: 0,
      taxShare: 0,
      tipShare: 0,
      total: 0,
      percentageOfBill: 0,
    };
  });

  let assignedSubtotal = 0;
  let unassignedSubtotal = 0;
  let unassignedItemsCount = 0;

  // 3. Distribute items
  receipt.items.forEach((item) => {
    const itemTotal = item.price * (item.quantity || 1);
    const assignees = item.assignedTo.filter((p) => p.trim() !== '');

    if (assignees.length === 0) {
      unassignedSubtotal += itemTotal;
      unassignedItemsCount++;
    } else {
      assignedSubtotal += itemTotal;
      const shareFraction = 1 / assignees.length;
      const itemShareCost = itemTotal * shareFraction;

      assignees.forEach((personName) => {
        if (!splits[personName]) {
          splits[personName] = {
            name: personName,
            color: getPersonColor(personName, participants),
            items: [],
            subtotal: 0,
            taxShare: 0,
            tipShare: 0,
            total: 0,
            percentageOfBill: 0,
          };
        }

        splits[personName].items.push({
          itemId: item.id,
          itemName: item.name,
          itemPrice: item.price,
          quantity: item.quantity || 1,
          coAssigneesCount: assignees.length,
          shareFraction,
          itemShareCost,
        });

        splits[personName].subtotal += itemShareCost;
      });
    }
  });

  // 4. Calculate proportional tax and tip for each person
  // We use totalSubtotal as the base so tax & tip are proportional to the full meal
  participants.forEach((name) => {
    const person = splits[name];
    if (totalSubtotal > 0 && person.subtotal > 0) {
      const ratio = person.subtotal / totalSubtotal;
      person.taxShare = Math.round(tax * ratio * 100) / 100;
      person.tipShare = Math.round(tip * ratio * 100) / 100;
      person.total = Math.round((person.subtotal + person.taxShare + person.tipShare) * 100) / 100;
      person.percentageOfBill = Math.round(ratio * 1000) / 10;
    } else {
      person.taxShare = 0;
      person.tipShare = 0;
      person.total = 0;
      person.percentageOfBill = 0;
    }
  });

  const percentAssigned =
    totalSubtotal > 0
      ? Math.min(100, Math.round((assignedSubtotal / totalSubtotal) * 100))
      : 0;

  return {
    totalSubtotal: Math.round(totalSubtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    tip: Math.round(tip * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    assignedSubtotal: Math.round(assignedSubtotal * 100) / 100,
    unassignedSubtotal: Math.round(unassignedSubtotal * 100) / 100,
    unassignedItemsCount,
    percentAssigned,
    splits,
    participants,
    isFullyAssigned: unassignedItemsCount === 0 && receipt.items.length > 0,
  };
}

/**
 * Currency formatter helper
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Generate a friendly text breakdown suitable for WhatsApp or iMessage
 */
export function generateShareText(summary: BillSummary, merchantName: string): string {
  let text = `🧾 Bill Split for ${merchantName || 'Our Meal'}\n`;
  text += `Subtotal: ${formatCurrency(summary.totalSubtotal)} | Tax: ${formatCurrency(summary.tax)} | Tip: ${formatCurrency(summary.tip)}\n`;
  text += `Grand Total: ${formatCurrency(summary.grandTotal)}\n\n`;
  text += `👥 Who owes what:\n`;

  const names = Object.keys(summary.splits);
  if (names.length === 0) {
    text += `No items assigned yet.\n`;
    return text;
  }

  names.forEach((name) => {
    const s = summary.splits[name];
    if (s.subtotal > 0) {
      text += `• ${s.name}: ${formatCurrency(s.total)} `;
      text += `(Items: ${formatCurrency(s.subtotal)} + Tax: ${formatCurrency(s.taxShare)} + Tip: ${formatCurrency(s.tipShare)})\n`;
      const itemNames = s.items.map((i) =>
        i.coAssigneesCount > 1
          ? `${i.itemName} (shared 1/${i.coAssigneesCount})`
          : i.itemName
      );
      if (itemNames.length > 0) {
        text += `   [${itemNames.join(', ')}]\n`;
      }
    }
  });

  if (summary.unassignedSubtotal > 0) {
    text += `\n⚠️ Unassigned remaining: ${formatCurrency(summary.unassignedSubtotal)}\n`;
  }

  text += `\nCalculated with SplitSense AI`;
  return text;
}
