import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBillSummary, formatCurrency, generateShareText } from './splitCalculator.ts';
import type { ReceiptData } from '../types/receipt.ts';

test('splits items correctly for individual and shared orders', () => {
  const receipt: ReceiptData = {
    id: 'test-1',
    merchantName: 'Taco Fiesta',
    items: [
      { id: '1', name: 'Nachos', price: 12.00, quantity: 1, assignedTo: ['Dhruv'] },
      { id: '2', name: 'Pizza', price: 20.00, quantity: 1, assignedTo: ['Sarah', 'Sue'] },
      { id: '3', name: 'Churros', price: 6.00, quantity: 1, assignedTo: [] },
    ],
    subtotal: 38.00,
    tax: 3.80, // 10% tax
    tip: 7.60, // 20% tip
    tipType: 'amount',
    total: 49.40,
  };

  const summary = calculateBillSummary(receipt);

  // Subtotal check
  assert.equal(summary.totalSubtotal, 38.00);
  assert.equal(summary.tax, 3.80);
  assert.equal(summary.tip, 7.60);
  assert.equal(summary.grandTotal, 49.40);

  // Dhruv ordered Nachos ($12.00)
  const dhruv = summary.splits['Dhruv'];
  assert.ok(dhruv, 'Dhruv split should exist');
  assert.equal(dhruv.subtotal, 12.00);
  // Dhruv's share of tax = 3.80 * (12 / 38) = 1.20
  assert.equal(dhruv.taxShare, 1.20);
  // Dhruv's share of tip = 7.60 * (12 / 38) = 2.40
  assert.equal(dhruv.tipShare, 2.40);
  assert.equal(dhruv.total, 15.60);

  // Sarah and Sue shared Pizza ($20.00 / 2 = $10.00 each)
  const sarah = summary.splits['Sarah'];
  const sue = summary.splits['Sue'];
  assert.ok(sarah, 'Sarah split should exist');
  assert.ok(sue, 'Sue split should exist');
  assert.equal(sarah.subtotal, 10.00);
  assert.equal(sue.subtotal, 10.00);

  // Sarah's tax share = 3.80 * (10 / 38) = 1.00
  assert.equal(sarah.taxShare, 1.00);
  // Sarah's tip share = 7.60 * (10 / 38) = 2.00
  assert.equal(sarah.tipShare, 2.00);
  assert.equal(sarah.total, 13.00);

  // Unassigned items check
  assert.equal(summary.unassignedSubtotal, 6.00);
  assert.equal(summary.unassignedItemsCount, 1);
  assert.equal(summary.isFullyAssigned, false);
});

test('handles zero subtotal and empty receipt gracefully', () => {
  const receipt: ReceiptData = {
    id: 'empty',
    merchantName: 'Empty',
    items: [],
    subtotal: 0,
    tax: 0,
    tip: 0,
    tipType: 'amount',
    total: 0,
  };

  const summary = calculateBillSummary(receipt);
  assert.equal(summary.totalSubtotal, 0);
  assert.equal(summary.grandTotal, 0);
  assert.equal(summary.percentAssigned, 0);
  assert.equal(summary.isFullyAssigned, false);
});

test('currency formatting and share text work properly', () => {
  assert.equal(formatCurrency(15.5), '$15.50');
  assert.equal(formatCurrency(0), '$0.00');

  const receipt: ReceiptData = {
    id: 'test-2',
    merchantName: 'Cafe Luna',
    items: [
      { id: '1', name: 'Espresso', price: 4.00, quantity: 1, assignedTo: ['Alex'] },
    ],
    subtotal: 4.00,
    tax: 0.40,
    tip: 1.00,
    tipType: 'amount',
    total: 5.40,
  };
  const summary = calculateBillSummary(receipt);
  const shareText = generateShareText(summary, 'Cafe Luna');
  assert.ok(shareText.includes('Alex: $5.40'));
  assert.ok(shareText.includes('Items: $4.00'));
});

test('natural language command parser handles individual and shared assignments', async () => {
  const { parseCommandLocally } = await import('./commandParser.ts');
  const receipt: ReceiptData = {
    id: 'test-nlp',
    merchantName: 'Taqueria',
    items: [
      { id: 'item-1', name: 'Loaded Beef Nachos', price: 13.50, quantity: 1, assignedTo: [] },
      { id: 'item-2', name: 'Wood-Fired Pizza Special', price: 22.00, quantity: 1, assignedTo: [] },
    ],
    subtotal: 35.50,
    tax: 3.55,
    tip: 7.10,
    tipType: 'percentage',
    total: 46.15,
  };

  // Test 1: "Dhruv had the nachos"
  const res1 = parseCommandLocally('Dhruv had the nachos', receipt, []);
  assert.equal(res1.itemUpdates.length, 1);
  assert.equal(res1.itemUpdates[0].itemId, 'item-1');
  assert.deepEqual(res1.itemUpdates[0].assignedTo, ['Dhruv']);
  assert.ok(res1.reply.includes('Dhruv'));

  // Test 2: "Sarah and Sue shared the pizza"
  const res2 = parseCommandLocally('Sarah and Sue shared the pizza', receipt, ['Dhruv']);
  assert.equal(res2.itemUpdates.length, 1);
  assert.equal(res2.itemUpdates[0].itemId, 'item-2');
  assert.deepEqual(res2.itemUpdates[0].assignedTo, ['Sarah', 'Sue']);
  assert.ok(res2.reply.includes('Sarah & Sue'));

  // Test 3: "Add 18% tip"
  const res3 = parseCommandLocally('Add 18% tip', receipt, ['Dhruv', 'Sarah', 'Sue']);
  assert.equal(res3.tipUpdate?.value, 18);
  assert.equal(res3.tipUpdate?.type, 'percentage');
});

