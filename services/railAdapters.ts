
import {
    PaymentInstruction,
    PaymentResult,
    PaymentStatus,
    RailAdapter,
    PaymentRail
} from '../types/settlement';
import { v4 as uuidv4 } from 'uuid';

// Mock implementation of ODFI (ACH) Adapter
export class MockODFIAdapter implements RailAdapter {
    async create_payment(instruction: PaymentInstruction): Promise<PaymentResult> {
        // In a real implementation, this would validate against ODFI rules
        if (!instruction.payeeId) {
            return { success: false, error: 'Missing Payee ID' };
        }
        return { success: true, transactionId: uuidv4() };
    }

    async submit_payment(paymentId: string): Promise<PaymentResult> {
        // Simulates transmission to ODFI
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, transactionId: `ODFI-${Date.now()}` });
            }, 1000);
        });
    }

    async get_status(paymentId: string): Promise<PaymentStatus> {
        return PaymentStatus.SETTLED;
    }

    async generate_payload(instruction: PaymentInstruction): Promise<string> {
        const now = new Date();
        const dateStr = now.toISOString().slice(2, 8).replace(/-/g, ''); // YYMMDD
        const timeStr = now.toISOString().slice(11, 15).replace(/:/g, ''); // HHMM
        const payeeBanking = instruction.metadata?.payeeBanking || {};

        // File Header Record (1)
        let file = `101 073000228 123456789 ${dateStr} ${timeStr} A 094101\n`;
        // Batch Header Record (5)
        file += `5225 ${instruction.payeeId.substring(0, 16).padEnd(16)} 0045678901 PPD Payment    ${dateStr} 0001 073000228 0000001\n`;
        // Entry Detail Record (6)
        if (payeeBanking.routingNumber) {
            file += `622 ${payeeBanking.routingNumber.substring(0, 8)}${payeeBanking.routingNumber.charAt(8)} ${payeeBanking.accountNumber.padEnd(17)} ${Math.round(instruction.amount * 100).toString().padStart(10, '0')} ${instruction.id.padEnd(15)} ${instruction.payeeId.substring(0, 22).padEnd(22)} 00 073000220000001\n`;
        }
        // Batch Control Record (8)
        file += `8225 000001 00073000228 000000000001 ${Math.round(instruction.amount * 100).toString().padStart(12, '0')} 000000000000 ${instruction.entityId.padEnd(10)} 073000228 0000001\n`;
        // File Control Record (9)
        file += `9000001 000001 00000001 00073000228 000000000001 ${Math.round(instruction.amount * 100).toString().padStart(12, '0')} 000000000000\n`;
        return file;
    }
}

// Manual Rail Adapter (e.g. Check, External Wire)
export class ManualRailAdapter implements RailAdapter {
    async create_payment(instruction: PaymentInstruction): Promise<PaymentResult> {
        return { success: true, transactionId: uuidv4() };
    }

    async submit_payment(paymentId: string): Promise<PaymentResult> {
        return { success: true, transactionId: `MANUAL-${Date.now()}` };
    }

    async get_status(paymentId: string): Promise<PaymentStatus> {
        return PaymentStatus.SETTLED;
    }
}

// Registry to retrieve the correct adapter
export class RailRegistry {
    private static adapters: Map<PaymentRail, RailAdapter> = new Map();

    static register(rail: PaymentRail, adapter: RailAdapter) {
        this.adapters.set(rail, adapter);
    }

    static get(rail: PaymentRail): RailAdapter {
        const adapter = this.adapters.get(rail);
        if (!adapter) {
            throw new Error(`No adapter registered for rail: ${rail}`);
        }
        return adapter;
    }
}

// Initialize Registry
RailRegistry.register(PaymentRail.ODFI_ACH, new MockODFIAdapter());
RailRegistry.register(PaymentRail.MANUAL_CHECK, new ManualRailAdapter());
RailRegistry.register(PaymentRail.WIRE, new ManualRailAdapter());
