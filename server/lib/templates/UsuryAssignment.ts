import { AffidavitTemplate } from '../affidavit-template';
import { Affidavit, Claim } from '../../../types/admin-process';

export const UsuryAssignmentTemplate: AffidavitTemplate = {
    name: 'UsuryAssignment',
    description: 'Affidavit of Usury Violation and Assignment of Claim',
    render: (variables: Record<string, any>): Partial<Affidavit> => {
        const {
            affiantName,
            loanId,
            interestRate,
            stateLimit,
            state,
            lenderName,
            calculationDate
        } = variables;

        // Validation moved to AffidavitValidator
        const timestamp = new Date().toISOString();

        let rateDiff = 0;
        if (interestRate && stateLimit) {
            rateDiff = parseFloat(interestRate) - parseFloat(stateLimit);
            // We could still throw here for logic error, but maybe better to just let the drafted claim show the bad math?
            // For now, if inputs are present but invalid (rateDiff <= 0), we might want to alert contextually.
            // But let's allow the draft to form.
        }

        const claims: Claim[] = [
            {
                id: 'claim-rate-fact',
                description: `The interest rate charged on Loan ${loanId || '[ID]'} by ${lenderName || '[Lender]'} is ${interestRate}%, as calculated on ${calculationDate || timestamp}.`,
                legalBasis: 'Loan Documents / Periodic Statement',
                supportingCitations: [],
                timestamp
            },
            {
                id: 'claim-limit-fact',
                description: `The maximum legal interest rate for this type of loan in the State of ${state} is ${stateLimit}%.`,
                legalBasis: `${state} Usury Statutes`,
                supportingCitations: [], // Ideally would lookup specific state statute here
                timestamp
            },
            {
                id: 'claim-violation',
                description: `The charged rate exceeds the legal limit by ${rateDiff.toFixed(2)}%, constituting a usurious transaction.`,
                legalBasis: 'Mathematical Calculation',
                supportingCitations: [],
                timestamp
            },
            {
                id: 'claim-assignment',
                description: `I hereby assign all rights, title, and interest in the claim for usury penalties/damages against ${lenderName || 'Lender'} to the Trustee/Assignee named herein.`,
                legalBasis: 'Right of Assignment',
                supportingCitations: [],
                timestamp
            }
        ];

        return {
            title: `Affidavit of Usury Violation`,
            affiant: {
                name: affiantName,
                entityType: 'Individual',
                capacity: 'Borrower / Assignor',
                address: {
                    street: '', city: '', state: '', zip: ''
                }
            },
            claims,
            timestamp,
            version: 1,
            status: 'Draft'
        };
    }
};
