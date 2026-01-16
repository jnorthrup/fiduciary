export enum PaymentRail {
    ODFI_ACH = 'ODFI_ACH',
    STRIPE_CONNECT = 'STRIPE_CONNECT',
    MANUAL_CHECK = 'MANUAL_CHECK',
    WIRE = 'WIRE',
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

export interface PaymentInstruction {
    id: string;
    entityId: string;
    payeeId: string;
    amount: number;
    currency: string;
    description: string;
    rail: PaymentRail;
    executionDate: string; // ISO Date
    metadata?: Record<string, any>;
}

export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
}

export interface RailAdapter {
    /**
     * Validates and prepares the payment instruction for the specific rail.
     */
    create_payment(instruction: PaymentInstruction): Promise<PaymentResult>;

    /**
     * Submits the payment to the external provider.
     */
    submit_payment(paymentId: string): Promise<PaymentResult>;

    /**
     * Polls or checks status of a payment.
     */
    get_status(paymentId: string): Promise<PaymentStatus>;

    /**
     * Generates any necessary files (e.g. NACHA) or payloads.
     */
    generate_payload?(instruction: PaymentInstruction): Promise<string>;
}
