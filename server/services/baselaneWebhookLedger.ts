/**
 * Baselane Webhook Ledger Integration
 *
 * Handles webhook events and automatically posts to ledger
 * Track: baselane_api_20260124
 */

import type { WebhookPayload } from './baselaneService.js';
import { postRentPaymentToLedger, type LedgerAccountMapping } from './baselaneLedger.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of handling a webhook event
 */
export interface WebhookHandlerResult {
  success: boolean;
  processed: boolean;
  journalEntryId?: string;
  message?: string;
}

/**
 * Account configuration for webhook processing
 */
export interface WebhookAccountConfig {
  cashAccountId: string;
  rentalIncomeAccountId: string;
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle rent payment webhook event
 *
 * Processes rent.payment.completed webhooks and automatically
 * posts completed payments to the ledger.
 *
 * Uses fire-and-forget pattern - errors are logged but don't fail the webhook.
 */
export async function handleRentPaymentWebhook(
  payload: WebhookPayload,
  accounts: WebhookAccountConfig
): Promise<WebhookHandlerResult> {
  try {
    // Only process completed payment events
    if (payload.eventType !== 'rent.payment.completed') {
      console.log('[Baselane Webhook] Skipping non-completed payment event:', payload.eventType);
      return {
        success: true,
        processed: false,
        message: `Not a completed payment event: ${payload.eventType}`
      };
    }

    // Extract payment data from webhook
    const paymentData = payload.data as {
      paymentId: string;
      tenantId?: string;
      amount?: number;
      propertyId?: string;
      status?: string;
    };

    // Skip if payment is not completed
    if (paymentData.status !== 'completed') {
      console.log('[Baselane Webhook] Payment not completed:', paymentData.paymentId);
      return {
        success: true,
        processed: false,
        message: 'Payment status is not completed'
      };
    }

    // Skip if missing payment ID
    if (!paymentData.paymentId) {
      console.error('[Baselane Webhook] Missing payment ID in webhook data');
      return {
        success: true,
        processed: false,
        message: 'Missing payment ID'
      };
    }

    // Get property ID for account mapping
    const propertyId = paymentData.propertyId || 'default';

    // Create account mapping
    const accountMapping: LedgerAccountMapping = {
      propertyId,
      cashAccountId: accounts.cashAccountId,
      rentalIncomeAccountId: accounts.rentalIncomeAccountId
    };

    // Construct payment object for ledger posting
    const payment = {
      id: paymentData.paymentId,
      chargeId: `${paymentData.paymentId}-charge`,
      tenantId: paymentData.tenantId || 'unknown',
      amount: paymentData.amount || 0,
      status: 'completed' as const,
      paymentMethod: 'bank_account' as const,
      createdAt: payload.timestamp,
      completedAt: payload.timestamp
    };

    // Post to ledger
    const result = await postRentPaymentToLedger(payment, accountMapping);

    console.log('[Baselane Webhook] Processed rent payment webhook:', {
      eventId: payload.eventId,
      paymentId: paymentData.paymentId,
      journalEntryId: result.journalEntryId,
      amount: paymentData.amount
    });

    return {
      success: true,
      processed: true,
      journalEntryId: result.journalEntryId
    };
  } catch (error) {
    // Fire-and-forget: log error but don't fail the webhook
    console.error('[Baselane Webhook] Failed to process rent payment webhook:', {
      eventId: payload.eventId,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: true, // Return true for fire-and-forget pattern
      processed: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Handle tenant created webhook event
 *
 * Logs tenant creation events for potential CRM sync.
 * Does not post to ledger.
 */
export async function handleTenantCreatedWebhook(
  payload: WebhookPayload
): Promise<WebhookHandlerResult> {
  if (payload.eventType !== 'tenant.created') {
    return {
      success: true,
      processed: false,
      message: `Not a tenant created event: ${payload.eventType}`
    };
  }

  const tenantData = payload.data as {
    tenantId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  console.log('[Baselane Webhook] Tenant created:', {
    eventId: payload.eventId,
    tenantId: tenantData.tenantId,
    name: `${tenantData.firstName} ${tenantData.lastName}`.trim()
  });

  return {
    success: true,
    processed: true,
    message: 'Tenant creation logged'
  };
}

/**
 * Handle property created webhook event
 *
 * Logs property creation events for potential entity sync.
 */
export async function handlePropertyCreatedWebhook(
  payload: WebhookPayload
): Promise<WebhookHandlerResult> {
  if (payload.eventType !== 'property.created') {
    return {
      success: true,
      processed: false,
      message: `Not a property created event: ${payload.eventType}`
    };
  }

  const propertyData = payload.data as {
    propertyId: string;
    nickname?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
    };
  };

  console.log('[Baselane Webhook] Property created:', {
    eventId: payload.eventId,
    propertyId: propertyData.propertyId,
    nickname: propertyData.nickname,
    address: propertyData.address
  });

  return {
    success: true,
    processed: true,
    message: 'Property creation logged'
  };
}

// ============================================================================
// WEBHOOK ROUTER
// ============================================================================

/**
 * Route webhook event to appropriate handler
 *
 * Main entry point for processing Baselane webhooks.
 */
export async function routeWebhookEvent(
  payload: WebhookPayload,
  accounts: WebhookAccountConfig
): Promise<WebhookHandlerResult> {
  switch (payload.eventType) {
    case 'rent.payment.completed':
      return await handleRentPaymentWebhook(payload, accounts);

    case 'rent.payment.failed':
      // Log failed payment events but don't post to ledger
      console.log('[Baselane Webhook] Rent payment failed:', {
        eventId: payload.eventId,
        paymentId: (payload.data as { paymentId: string }).paymentId,
        reason: (payload.data as { failedReason?: string }).failedReason
      });
      return {
        success: true,
        processed: true,
        message: 'Failed payment logged'
      };

    case 'tenant.created':
    case 'tenant.updated':
      return await handleTenantCreatedWebhook(payload);

    case 'property.created':
    case 'property.updated':
      return await handlePropertyCreatedWebhook(payload);

    case 'banking.transaction.posted':
      console.log('[Baselane Webhook] Banking transaction posted (no ledger action):', payload.eventId);
      return {
        success: true,
        processed: true,
        message: 'Banking transaction logged'
      };

    default:
      console.log('[Baselane Webhook] Unhandled event type:', payload.eventType);
      return {
        success: true,
        processed: false,
        message: `Unhandled event type: ${payload.eventType}`
      };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  handleRentPaymentWebhook,
  handleTenantCreatedWebhook,
  handlePropertyCreatedWebhook,
  routeWebhookEvent
};
