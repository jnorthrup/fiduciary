/**
 * BSO Proxy Server
 *
 * Handles SSA Business Services Online (BSO) API interactions.
 * Supports both mock mode (for development/testing) and real mode (for production).
 *
 * Based on IRIS A2A proxy pattern for consistency.
 */

import { interpretBSOError, type ErrorContext } from '../lib/bso/errors';
import { interpretBSOError as interpretBSOErrorAI } from '../lib/bso/aiErrorInterpreter';
import type { BSORole, BSOSubmission } from '../types';

/**
 * BSO API configuration
 */
export interface BSOProxyConfig {
  /** Mock mode uses simulated responses; real mode connects to SSA */
  mockMode?: boolean;
  /** Base URL for SSA BSO services (only used in real mode) */
  baseUrl?: string;
  /** Authentication credentials (only used in real mode) */
  credentials?: {
    username: string;
    password: string;
  };
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * BSO session information
 */
export interface BSOSession {
  /** Session token for authenticated requests */
  token: string;
  /** Session expiration timestamp */
  expiresAt: number;
  /** Associated user ID */
  userId?: string;
  /** Associated employer IDs */
  employerIds?: string[];
}

/**
 * W-2 submission request
 */
export interface W2SubmissionRequest {
  /** Employer EIN */
  ein: string;
  /** Tax year for submission */
  taxYear: string;
  /** EFW2 file content */
  fileContent: string;
  /** Submission filename */
  filename?: string;
}

/**
 * Submission status response
 */
export interface SubmissionStatus {
  /** Batch ID for tracking */
  batchId: string;
  /** Current status */
  status: 'Pending' | 'Processing' | 'Pass' | 'Errors' | 'Rejected';
  /** AccuWage validation status */
  accuWageStatus?: 'Pass' | 'Errors' | 'Pending';
  /** Error details if validation failed */
  errors?: Array<{
    code: string;
    message: string;
    lineNumber?: number;
  }>;
  /** Submission timestamp */
  submittedAt?: string;
  /** Last updated timestamp */
  updatedAt?: string;
}

/**
 * BSO notice information
 */
export interface BSONotice {
  /** Notice ID */
  id: string;
  /** Notice category */
  category: 'Enforcement' | 'Unpostable' | 'Informational';
  /** Notice subject */
  subject: string;
  /** Notice content/body */
  content: string;
  /** Notice date */
  date: string;
  /** Associated employer EIN */
  ein?: string;
  /** Whether notice has been read */
  read: boolean;
  /** Required action deadline */
  deadline?: string;
}

/**
 * BSO Proxy Server
 */
export class BSOProxy {
  private config: Required<Pick<BSOProxyConfig, 'mockMode' | 'timeout'>>;
  private credentials: BSOProxyConfig['credentials'];
  private session: BSOSession | null = null;

  constructor(config: BSOProxyConfig = {}) {
    this.config = {
      mockMode: config.mockMode ?? true,
      timeout: config.timeout ?? 30000
    };
    this.credentials = config.credentials;
  }

  /**
   * Set or update the current BSO session
   */
  setSession(session: BSOSession): void {
    this.session = session;
  }

  /**
   * Get the current session (if authenticated)
   */
  getSession(): BSOSession | null {
    if (!this.session) return null;

    // Check if session expired
    if (Date.now() > this.session.expiresAt) {
      this.session = null;
      return null;
    }

    return this.session;
  }

  /**
   * Clear the current session (logout)
   */
  clearSession(): void {
    this.session = null;
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  /**
   * User Registration - Step 1 of BSO enrollment
   * Registers a new user with BSO services
   */
  async registerUser(params: {
    username: string;
    email: string;
    password: string;
    securityQuestions: Array<{
      question: string;
      answer: string;
    }>;
  }): Promise<{ userId: string; status: string; activationCode?: string }> {
    if (this.config.mockMode) {
      // Mock response for user registration
      await this.delay(500);
      return {
        userId: `BSO-USER-${Date.now()}`,
        status: 'Pending',
        activationCode: 'MOCK-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      };
    }

    // Real BSO API call would go here
    throw new Error('Real BSO API not yet implemented');
  }

  /**
   * Employer Linking - Link an employer to the user's BSO account
   */
  async linkEmployer(params: {
    userId: string;
    ein: string;
    employerName: string;
    role: 'Administrator' | 'Preparer' | 'Reporter';
  }): Promise<{ status: string; linkedEmployerId: string }> {
    if (this.config.mockMode) {
      await this.delay(300);
      return {
        status: 'Active',
        linkedEmployerId: `BSO-EMP-${params.ein}`
      };
    }

    throw new Error('Real BSO API not yet implemented');
  }

  /**
   * Service Provisioning - Request access to BSO services for an employer
   */
  async provisionServices(params: {
    userId: string;
    ein: string;
    services: ('W-2' | 'W-2c')[];
  }): Promise<{ status: string; provisionedServices: string[] }> {
    if (this.config.mockMode) {
      await this.delay(400);
      return {
        status: 'Active',
        provisionedServices: params.services
      };
    }

    throw new Error('Real BSO API not yet implemented');
  }

  /**
   * Account Activation - Activate a BSO account with activation code
   */
  async activateAccount(params: {
    userId: string;
    activationCode: string;
  }): Promise<{ status: string; token?: string }> {
    if (this.config.mockMode) {
      await this.delay(300);
      // Create session on successful activation
      const session: BSOSession = {
        token: `BSO-TOKEN-${Date.now()}`,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        userId: params.userId
      };
      this.setSession(session);
      return {
        status: 'Active',
        token: session.token
      };
    }

    throw new Error('Real BSO API not yet implemented');
  }

  /**
   * W-2 Submission Upload - Submit EFW2 file to SSA BSO
   */
  async submitW2(params: W2SubmissionRequest): Promise<{ batchId: string; status: string }> {
    if (this.config.mockMode) {
      await this.delay(1000);
      const batchId = `BSO-BATCH-${Date.now()}`;
      return {
        batchId,
        status: 'Pending'
      };
    }

    throw new Error('Real BSO API not yet implemented');
  }

  /**
   * Submission Status Check - Check status of a W-2 submission
   */
  async getSubmissionStatus(batchId: string): Promise<SubmissionStatus> {
    if (this.config.mockMode) {
      await this.delay(300);
      // Simulate various statuses based on batch ID
      const hash = parseInt(batchId.split('-').pop() || '0', 10);
      const statuses: SubmissionStatus['status'][] = ['Pending', 'Processing', 'Pass', 'Errors'];
      const status = statuses[hash % statuses.length];

      return {
        batchId,
        status,
        accuWageStatus: status === 'Pass' ? 'Pass' : status === 'Errors' ? 'Errors' : 'Pending',
        submittedAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
        errors: status === 'Errors' ? [
          { code: 'BSO-107', message: 'Record count mismatch', lineNumber: 5 },
          { code: 'BSO-108', message: 'Financial totals mismatch', lineNumber: 10 }
        ] : undefined
      };
    }

    throw new Error('Real BSO API not yet implemented');
  }

  /**
   * Notice Retrieval - Retrieve EDC notices from BSO
   */
  async getNotices(params: {
    ein?: string;
    category?: BSONotice['category'];
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<BSONotice[]> {
    if (this.config.mockMode) {
      await this.delay(400);
      return [
        {
          id: 'NOTICE-001',
          category: 'Informational',
          subject: 'W-2 Filing Deadline Reminder',
          content: 'Remember to file your W-2 forms by January 31st.',
          date: new Date().toISOString(),
          read: false
        },
        {
          id: 'NOTICE-002',
          category: 'Enforcement',
          subject: 'Late Filing Penalty Notice',
          content: 'Your W-2 submission was filed late. A penalty may apply.',
          date: new Date(Date.now() - 86400000).toISOString(),
          read: false,
          deadline: new Date(Date.now() + 30 * 86400000).toISOString()
        }
      ];
    }

    throw new Error('Real BSO API not yet implemented');
  }

  /**
   * Interpret a BSO error code with AI assistance
   */
  async interpretError(errorCode: string, context?: ErrorContext): Promise<string> {
    try {
      const result = await interpretBSOErrorAI(errorCode, context);
      return `**${result.errorCode}**: ${result.explanation}\n\n**Next Steps:**\n${result.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
    } catch {
      // Fallback to static mapping
      const error = interpretBSOError(errorCode);
      return `**${error.code}**: ${error.message}\n\n**Resolution:** ${error.resolution}`;
    }
  }

  /**
   * Simulate network delay for mock mode
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a new BSO proxy instance
 */
export function createBSOProxy(config?: BSOProxyConfig): BSOProxy {
  return new BSOProxy(config);
}

/**
 * Default BSO proxy instance (mock mode enabled)
 */
export const bsoProxy = new BSOProxy({ mockMode: true });
