// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export enum PaymentRail {
    ODFI_ACH = 'ODFI_ACH',
    ODFI_ACH_SAMEDAY = 'ODFI_ACH_SAMEDAY',
    STRIPE_CONNECT = 'STRIPE_CONNECT',
    MANUAL_CHECK = 'MANUAL_CHECK',
    WIRE = 'WIRE',
    WIRE_INTL = 'WIRE_INTL',
    RTP = 'RTP'
}

export enum PaymentStatus {
    CREATED = 'CREATED',
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    SUBMITTED = 'SUBMITTED',
    IN_TRANSIT = 'IN_TRANSIT',
    SETTLED = 'SETTLED',
    FAILED = 'FAILED',
    RETURNED = 'RETURNED'
}

export enum FIIdentifier {
    BANK_PRIMARY = 'BANK_PRIMARY',
    BANK_SECONDARY = 'BANK_SECONDARY'
}

// ═══════════════════════════════════════════════════════════════
// LAYER 1: TrustOS (Rail-Agnostic Intent)
// ═══════════════════════════════════════════════════════════════

export type PaymentPurpose = 'disbursement' | 'vendor' | 'tax' | 'transfer' | 'refund';
export type PaymentUrgency = 'batch' | 'sameday' | 'immediate';
export type CostTolerance = 'lowest' | 'balanced' | 'fastest';

export interface PaymentIntent {
    intent_id: string;
    entity_id: string;
    payee_id: string;
    amount: number;
    currency: string;
    purpose: PaymentPurpose;
    urgency: PaymentUrgency;
    cost_tolerance: CostTolerance;
    effective_date?: string;
    memo?: string;
    idempotency_key: string;
    created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// LAYER 2: Payee Coordinates (Polymorphic by Rail)
// ═══════════════════════════════════════════════════════════════

export interface ACHCoordinates {
    type: 'ach';
    routing_number: string;
    account_number: string;
    account_type: 'checking' | 'savings';
    account_holder: string;
}

export interface WireDomesticCoordinates {
    type: 'wire_domestic';
    routing_number: string;
    account_number: string;
    bank_name: string;
    bank_address: string;
    account_holder: string;
}

export interface WireIntlCoordinates {
    type: 'wire_intl';
    swift_bic: string;
    iban?: string;
    account_number: string;
    bank_name: string;
    bank_address: string;
    intermediary?: {
        swift_bic: string;
        bank_name: string;
    };
    account_holder: string;
}

export interface RTPCoordinates {
    type: 'rtp';
    routing_number: string;
    account_number: string;
    account_holder: string;
}

export interface CheckCoordinates {
    type: 'check';
    payee_name: string;
    mail_address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
}

export type PayeeCoordinates =
    | ACHCoordinates
    | WireDomesticCoordinates
    | WireIntlCoordinates
    | RTPCoordinates
    | CheckCoordinates;

// ═══════════════════════════════════════════════════════════════
// LAYER 3: Rail Selection
// ═══════════════════════════════════════════════════════════════

export interface RailCandidate {
    rail: PaymentRail;
    fi: FIIdentifier;
    score: number;
    reason: string;
    estimated_cost_cents: number;
    settlement_speed: 'T0' | 'T1' | 'T2' | 'T3+';
    available: boolean;
    unavailable_reason?: string;
}

export interface RailSelector {
    rank(intent: PaymentIntent, coordinates: PayeeCoordinates): RailCandidate[];
}

// ═══════════════════════════════════════════════════════════════
// LAYER 4: Execution (Gateway Layer)
// ═══════════════════════════════════════════════════════════════

export interface Execution {
    exec_id: string;
    intent_id: string;
    rail: PaymentRail;
    fi: FIIdentifier;
    status: PaymentStatus;
    fi_reference?: string;
    submitted_at?: string;
    settled_at?: string;
    return_code?: string;
    return_reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// LAYER 5: Adapter Separation (Agnostic)
// ═══════════════════════════════════════════════════════════════

export interface FormattedPayload {
    rail: PaymentRail;
    format: 'nacha' | 'iso20022' | 'swift_mt103' | 'json' | 'pdf_check';
    content: string | Uint8Array;
    filename?: string;
}

export interface RailFormatter {
    rail: PaymentRail;
    format(intent: PaymentIntent, coordinates: PayeeCoordinates, exec: Execution): FormattedPayload;
    parse_response(raw: unknown): { status: PaymentStatus; reference?: string; error?: string };
}

export interface TransmitResult {
    success: boolean;
    fi_reference?: string;
    error?: string;
    raw_response?: unknown;
}

export interface FIConnector {
    fi: FIIdentifier;
    supported_rails: PaymentRail[];
    transmit(payload: FormattedPayload): Promise<TransmitResult>;
    check_status(fi_reference: string): Promise<{ status: PaymentStatus; updated_at: string }>;
}

// ═══════════════════════════════════════════════════════════════
// LEGACY (Deprecate after migration)
// ═══════════════════════════════════════════════════════════════

/** @deprecated Use PaymentIntent + Execution */
export interface PaymentInstruction {
    id: string;
    entityId: string;
    payeeId: string;
    amount: number;
    currency: string;
    description: string;
    rail: PaymentRail;
    executionDate: string;
    metadata?: Record<string, unknown>;
}

/** @deprecated Use TransmitResult */
export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
}

/** @deprecated Use RailFormatter + FIConnector */
export interface RailAdapter {
    create_payment(instruction: PaymentInstruction): Promise<PaymentResult>;
    submit_payment(paymentId: string): Promise<PaymentResult>;
    get_status(paymentId: string): Promise<PaymentStatus>;
    generate_payload?(instruction: PaymentInstruction): Promise<string>;
}
