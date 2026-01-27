/**
 * Baselane Settlement Integration
 *
 * Creates payment orders for property expenses and reconciles transactions
 * Track: baselane_api_20260124
 */

import type { Transaction } from './baselaneService.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of creating a payment order
 */
export interface PaymentOrderResult {
  success: boolean;
  paymentOrderId?: string;
  baselaneTransactionId: string;
  baselanePropertyId?: string;
  amount: number;
  propertyId?: string;
  entityId?: string;
  created: boolean;
  message?: string;
  metadata?: {
    description?: string;
    category?: string;
    postedDate?: string;
  };
}

/**
 * Result of reconciling a transaction
 */
export interface ReconciliationResult {
  success: boolean;
  paymentOrderId: string;
  baselaneTransactionId: string;
  paymentOrderStatus: 'paid' | 'failed' | 'refunded' | 'pending';
  paidAt?: string;
  failedReason?: string;
  refundedAt?: string;
  refundAmount?: number;
}

/**
 * Payment order configuration
 */
export interface PaymentOrderConfig {
  entityId: string;
  vendorId: string;
  expenseCategoryId: string;
}

/**
 * Payment order stored in settlement system
 */
export interface PaymentOrder {
  paymentOrderId: string;
  baselaneTransactionId: string;
  baselanePropertyId?: string;
  propertyId?: string;
  entityId: string;
  vendorId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  description: string;
  category: string;
  createdAt: string;
  paidAt?: string;
  failedReason?: string;
  refundedAt?: string;
  refundAmount?: number;
}

// ============================================================================
// STORAGE
// ============================================================================

const PAYMENT_ORDER_STORAGE_KEY = 'baselane_payment_orders';

/**
 * Get all payment orders
 */
async function getPaymentOrders(): Promise<PaymentOrder[]> {
  const stored = globalThis[PAYMENT_ORDER_STORAGE_KEY];
  return stored || [];
}

/**
 * Save payment order
 */
async function savePaymentOrder(order: PaymentOrder): Promise<void> {
  const orders = await getPaymentOrders();
  const existingIndex = orders.findIndex(o => o.baselaneTransactionId === order.baselaneTransactionId);

  if (existingIndex >= 0) {
    orders[existingIndex] = order;
  } else {
    orders.push(order);
  }

  globalThis[PAYMENT_ORDER_STORAGE_KEY] = orders;
}

// ============================================================================
// SETTLEMENT OPERATIONS
// ============================================================================

/**
 * Create payment order from Baselane expense transaction
 *
 * Converts a Baselane debit transaction (expense) into a settlement
 * payment order for vendor payment.
 */
export async function createPaymentOrderForExpense(
  transaction: Transaction,
  config: PaymentOrderConfig
): Promise<PaymentOrderResult> {
  // Only process debit transactions (expenses)
  if (transaction.type !== 'debit') {
    console.log('[Baselane Settlement] Skipping non-debit transaction:', transaction.id);
    return {
      success: true,
      created: false,
      baselaneTransactionId: transaction.id,
      amount: Math.abs(transaction.amount),
      message: 'Not an expense transaction (credit/income)'
    };
  }

  // Only process transactions with property mapping
  if (!transaction.propertyId) {
    console.log('[Baselane Settlement] Skipping transaction without property:', transaction.id);
    return {
      success: true,
      created: false,
      baselaneTransactionId: transaction.id,
      amount: Math.abs(transaction.amount),
      message: 'Transaction not linked to a property'
    };
  }

  try {
    const paymentOrderId = `po-${transaction.id}-${Date.now()}`;
    const amount = Math.abs(transaction.amount);

    const paymentOrder: PaymentOrder = {
      paymentOrderId,
      baselaneTransactionId: transaction.id,
      baselanePropertyId: transaction.propertyId,
      propertyId: transaction.propertyId,
      entityId: config.entityId,
      vendorId: config.vendorId,
      amount,
      status: 'pending',
      description: transaction.description,
      category: transaction.category || 'uncategorized',
      createdAt: new Date().toISOString()
    };

    await savePaymentOrder(paymentOrder);

    console.log('[Baselane Settlement] Created payment order:', {
      paymentOrderId,
      baselaneTransactionId: transaction.id,
      amount,
      propertyId: transaction.propertyId
    });

    return {
      success: true,
      paymentOrderId,
      baselaneTransactionId: transaction.id,
      baselanePropertyId: transaction.propertyId,
      amount,
      propertyId: transaction.propertyId,
      entityId: config.entityId,
      created: true,
      metadata: {
        description: transaction.description,
        category: transaction.category,
        postedDate: transaction.postedDate
      }
    };
  } catch (error) {
    console.error('[Baselane Settlement] Failed to create payment order:', {
      baselaneTransactionId: transaction.id,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      baselaneTransactionId: transaction.id,
      amount: Math.abs(transaction.amount),
      created: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Reconcile Baselane transaction with payment order
 *
 * Updates payment order status based on Baselane payment outcome.
 */
export async function reconcileTransactionWithPaymentOrder(
  baselaneTransactionId: string,
  reconciliation: {
    status: 'paid' | 'failed' | 'refunded';
    paidAt?: string;
    failedReason?: string;
    refundedAt?: string;
    refundAmount?: number;
  }
): Promise<ReconciliationResult> {
  const orders = await getPaymentOrders();
  const order = orders.find(o => o.baselaneTransactionId === baselaneTransactionId);

  if (!order) {
    console.warn('[Baselane Settlement] Payment order not found for transaction:', baselaneTransactionId);
    return {
      success: false,
      paymentOrderId: '',
      baselaneTransactionId,
      paymentOrderStatus: 'pending'
    };
  }

  // Update order status
  order.status = reconciliation.status;

  if (reconciliation.paidAt) {
    order.paidAt = reconciliation.paidAt;
  }

  if (reconciliation.failedReason) {
    order.failedReason = reconciliation.failedReason;
  }

  if (reconciliation.refundedAt) {
    order.refundedAt = reconciliation.refundedAt;
  }

  if (reconciliation.refundAmount) {
    order.refundAmount = reconciliation.refundAmount;
  }

  await savePaymentOrder(order);

  console.log('[Baselane Settlement] Reconciled payment order:', {
    paymentOrderId: order.paymentOrderId,
    baselaneTransactionId,
    status: reconciliation.status
  });

  return {
    success: true,
    paymentOrderId: order.paymentOrderId,
    baselaneTransactionId,
    paymentOrderStatus: order.status,
    paidAt: order.paidAt,
    failedReason: order.failedReason,
    refundedAt: order.refundedAt,
    refundAmount: order.refundAmount
  };
}

/**
 * Get payment order for a Baselane transaction
 *
 * Retrieves the settlement payment order that was created for a specific
 * Baselane transaction.
 */
export async function getPaymentOrderForTransaction(
  baselaneTransactionId: string
): Promise<PaymentOrder | null> {
  const orders = await getPaymentOrders();
  return orders.find(o => o.baselaneTransactionId === baselaneTransactionId) || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createPaymentOrderForExpense,
  reconcileTransactionWithPaymentOrder,
  getPaymentOrderForTransaction
};
