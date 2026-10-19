import type { ReceiptData, ReceiptItem } from '../types/receipt.ts';

export interface CommandParseResult {
  reply: string;
  itemUpdates: { itemId: string; assignedTo: string[]; action: 'replace' | 'add' | 'remove' }[];
  tipUpdate?: { type: 'percentage' | 'amount'; value: number };
  newParticipants: string[];
  suggestedActions: string[];
}

/**
 * Fallback / fast local parser for common natural language commands:
 * - "Dhruv had the nachos"
 * - "Sarah and Sue shared the pizza"
 * - "Alex and Bob split the fish tacos"
 * - "Add 18% tip" / "Tip is $15"
 * - "Split unassigned items equally"
 */
export function parseCommandLocally(
  message: string,
  receipt: ReceiptData,
  knownParticipants: string[] = []
): CommandParseResult {
  const text = message.trim();
  const lower = text.toLowerCase();
  const itemUpdates: CommandParseResult['itemUpdates'] = [];
  const newParticipants: string[] = [];
  let reply = '';
  let tipUpdate: CommandParseResult['tipUpdate'] | undefined;

  // 1. Tip commands: "Add 18% tip", "Tip is 20%", "Tip 15 dollars"
  const tipPercentMatch = lower.match(/(?:tip|add)\s*(?:is\s*)?(\d+(?:\.\d+)?)\s*%/i);
  if (tipPercentMatch) {
    const pct = parseFloat(tipPercentMatch[1]);
    tipUpdate = { type: 'percentage', value: pct };
    reply = `Updated tip to ${pct}%! Proportional shares have been recalculated.`;
    return {
      reply,
      itemUpdates: [],
      tipUpdate,
      newParticipants: [],
      suggestedActions: ['Who owes what?', 'Split unassigned items equally'],
    };
  }

  const tipDollarMatch = lower.match(/(?:tip|add tip)\s*(?:is\s*)?\$(\d+(?:\.\d+)?)/i);
  if (tipDollarMatch) {
    const amt = parseFloat(tipDollarMatch[1]);
    tipUpdate = { type: 'amount', value: amt };
    reply = `Set tip to $${amt.toFixed(2)}! Proportional shares updated.`;
    return {
      reply,
      itemUpdates: [],
      tipUpdate,
      newParticipants: [],
      suggestedActions: ['Who owes what?', 'Show full breakdown'],
    };
  }

  // 2. "Split unassigned items equally"
  if (lower.includes('split unassigned') || lower.includes('split remaining') || lower.includes('split everything')) {
    const allPeople = new Set(knownParticipants);
    receipt.items.forEach((i) => i.assignedTo.forEach((p) => allPeople.add(p)));
    const peopleList = Array.from(allPeople);

    if (peopleList.length === 0) {
      return {
        reply: "Please assign at least one person first so I know who to split the remaining items among!",
        itemUpdates: [],
        newParticipants: [],
        suggestedActions: ['Dhruv had the nachos', 'Sarah had the pizza'],
      };
    }

    const unassigned = receipt.items.filter((i) => i.assignedTo.length === 0);
    if (unassigned.length === 0) {
      return {
        reply: "All items are already assigned! Check the summary on the right to see everyone's totals.",
        itemUpdates: [],
        newParticipants: [],
        suggestedActions: ['Who owes what?', 'Copy summary for WhatsApp'],
      };
    }

    unassigned.forEach((item) => {
      itemUpdates.push({
        itemId: item.id,
        assignedTo: peopleList,
        action: 'replace',
      });
    });

    return {
      reply: `Split ${unassigned.length} remaining item(s) equally among ${peopleList.join(', ')}.`,
      itemUpdates,
      newParticipants: [],
      suggestedActions: ['Who owes what?', 'Add 20% tip'],
    };
  }

  // 3. Find people in sentence: "Dhruv had the nachos", "Sarah and Sue shared the pizza"
  // Look for patterns like "<Names> had/shared/split/ordered <item>"
  const splitKeywords = [' had ', ' shared ', ' split ', ' ordered ', ' ate ', ' got ', ' took '];
  let foundKeyword = '';
  let splitIndex = -1;

  for (const kw of splitKeywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
      splitIndex = idx;
      foundKeyword = kw;
    }
  }

  if (splitIndex !== -1) {
    const subjectPart = text.slice(0, splitIndex).trim();
    const objectPart = text.slice(splitIndex + foundKeyword.length).trim();

    // Extract names from subjectPart (e.g. "Sarah and Sue", "Dhruv, Alex and Bob", "Dhruv")
    const names = subjectPart
      .split(/\s*(?:,|&|\band\b)\s*/i)
      .map((n) => n.trim())
      .filter((n) => n.length > 0 && !['the', 'all', 'everyone', 'both'].includes(n.toLowerCase()));

    // Capitalize names properly
    const cleanNames = names.map((n) => n.charAt(0).toUpperCase() + n.slice(1));
    cleanNames.forEach((n) => {
      if (!knownParticipants.includes(n)) newParticipants.push(n);
    });

    // Find matching items from objectPart
    const matchedItems: ReceiptItem[] = [];
    const objLower = objectPart.toLowerCase();

    receipt.items.forEach((item) => {
      const itemLower = item.name.toLowerCase();
      // Check full match, partial match, or token match
      const itemWords = itemLower.split(/\s+/).filter((w) => w.length > 3);
      const isMatch =
        objLower.includes(itemLower) ||
        itemWords.some((word) => objLower.includes(word));

      if (isMatch) {
        matchedItems.push(item);
      }
    });

    if (matchedItems.length > 0 && cleanNames.length > 0) {
      matchedItems.forEach((item) => {
        itemUpdates.push({
          itemId: item.id,
          assignedTo: cleanNames,
          action: 'replace',
        });
      });

      const itemNames = matchedItems.map((i) => i.name).join(', ');
      const peopleStr = cleanNames.join(' & ');
      reply = `Assigned ${itemNames} to ${peopleStr}. Tax and tip were adjusted proportionally.`;

      return {
        reply,
        itemUpdates,
        newParticipants,
        suggestedActions: [
          'Split remaining items equally',
          'Add 18% tip',
          'Who owes what?',
        ],
      };
    }
  }

  // Default fallback if not recognized
  return {
    reply: `I heard "${text}". Try asking like "Dhruv had the nachos", "Sarah and Sue shared the pizza", or "Add 20% tip".`,
    itemUpdates: [],
    newParticipants: [],
    suggestedActions: [
      'Dhruv had the nachos',
      'Sarah and Sue shared the pizza',
      'Split unassigned items equally',
    ],
  };
}
