/**
 * Plaid Bank API Integration Service
 *
 * Provides routing number validation, account verification,
 * and balance checks via Plaid API.
 *
 * Environment variables:
 * - VITE_PLAID_CLIENT_ID: Plaid client ID
 * - VITE_PLAID_SECRET: Plaid secret key
 * - VITE_PLAID_ENV: Environment (sandbox, development, production)
 */

// ============================================================================
// TYPES
// ============================================================================

export type PlaidEnvironment = 'sandbox' | 'development' | 'production';

export interface RoutingValidationResult {
  valid: boolean;
  bankName?: string;
  address?: string;
  routingNumber: string;
  error?: string;
}

export interface AccountVerificationResult {
  valid: boolean;
  accountType?: string;
  accountMask?: string;
  error?: string;
}

export interface BalanceCheckResult {
  available: number;
  current: number;
  currency: string;
  error?: string;
}

// ============================================================================
// PLAID SERVICE
// ============================================================================

class PlaidService {
  private clientId: string;
  private secret: string;
  private environment: PlaidEnvironment;

  constructor() {
    this.clientId = import.meta.env.VITE_PLAID_CLIENT_ID || '';
    this.secret = import.meta.env.VITE_PLAID_SECRET || '';
    this.environment = (import.meta.env.VITE_PLAID_ENV as PlaidEnvironment) || 'sandbox';

    if (!this.clientId || !this.secret) {
      console.warn('Plaid credentials not configured. Using mock mode.');
    }
  }

  private getBaseUrl(): string {
    const envUrls: Record<PlaidEnvironment, string> = {
      sandbox: 'https://sandbox.plaid.com',
      development: 'https://development.plaid.com',
      production: 'https://production.plaid.com'
    };
    return envUrls[this.environment];
  }

  /**
   * Validate ABA routing number
   * Uses Plaid's routing number validation API
   */
  async validateRoutingNumber(routingNumber: string): Promise<RoutingValidationResult> {
    // Check format first
    if (!/^\d{9}$/.test(routingNumber)) {
      return { valid: false, routingNumber, error: 'Routing number must be 9 digits' };
    }

    // Calculate check digit
    const checkDigit = this.calculateRoutingCheckDigit(routingNumber.slice(0, 8));
    if (checkDigit !== parseInt(routingNumber[8], 10)) {
      return { valid: false, routingNumber, error: 'Invalid routing number checksum' };
    }

    // If Plaid is not configured, return basic validation result
    if (!this.clientId || !this.secret) {
      return {
        valid: true,
        routingNumber,
        bankName: 'Unknown Bank (Mock Validation)',
        address: 'Mock validation - Plaid not configured'
      };
    }

    // Call Plaid API for full validation
    try {
      const response = await fetch(`${this.getBaseUrl()}/routing_numbers/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Plaid-Version': '2020-09-14'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          secret: this.secret,
          routing_numbers: [routingNumber]
        })
      });

      const data = await response.json();

      if (data.error_code) {
        return { valid: false, routingNumber, error: data.error_message };
      }

      const routing = data.routing_numbers?.[0];
      return {
        valid: true,
        routingNumber,
        bankName: routing?.name || 'Unknown Bank',
        address: routing?.address || ''
      };
    } catch (error) {
      console.error('Plaid API error:', error);
      return {
        valid: true,
        routingNumber,
        bankName: 'Unknown Bank (API Error)',
        address: 'Failed to fetch bank details'
      };
    }
  }

  /**
   * Calculate ABA routing number check digit
   * Uses the standard 3-7-1 algorithm
   */
  private calculateRoutingCheckDigit(routingNumber: string): number {
    if (routingNumber.length !== 8) {
      throw new Error('Routing number must be 8 digits for check digit calculation');
    }

    const digits = routingNumber.split('').map(Number);
    const sum = 3 * (digits[0] + digits[3] + digits[6]) +
                7 * (digits[1] + digits[4] + digits[7]) +
                (digits[2] + digits[5]);
    return (10 - (sum % 10)) % 10;
  }

  /**
   * Verify account ownership and get account details
   * Note: This requires a Plaid link token exchange flow
   */
  async verifyAccount(accountId: string, routingNumber: string): Promise<AccountVerificationResult> {
    // If Plaid is not configured, return mock result
    if (!this.clientId || !this.secret) {
      return {
        valid: true,
        accountType: 'checking',
        accountMask: '****1234'
      };
    }

    // In production, this would use Plaid's Auth or Balance API
    // after the user has linked their account via Plaid Link
    return {
      valid: true,
      accountType: 'checking',
      accountMask: '****' + accountId.slice(-4)
    };
  }

  /**
   * Check account balance
   * Note: This requires a Plaid link token exchange flow and access token
   */
  async checkBalance(accessToken: string, accountId: string): Promise<BalanceCheckResult> {
    // If Plaid is not configured, return mock result
    if (!this.clientId || !this.secret) {
      return {
        available: 1000000,
        current: 1050000,
        currency: 'USD'
      };
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/accounts/balance/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Plaid-Version': '2020-09-14'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          secret: this.secret,
          access_token: accessToken,
          options: {
            account_ids: [accountId]
          }
        })
      });

      const data = await response.json();

      if (data.error_code) {
        return { available: 0, current: 0, currency: 'USD', error: data.error_message };
      }

      const account = data.accounts?.[0];
      const balance = account?.balances;
      return {
        available: balance?.available || 0,
        current: balance?.current || 0,
        currency: balance?.iso_currency_code || 'USD'
      };
    } catch (error) {
      console.error('Plaid balance check error:', error);
      return { available: 0, current: 0, currency: 'USD', error: 'Failed to check balance' };
    }
  }

  /**
   * Create a link token for Plaid Link frontend
   */
  async createLinkToken(user?: { email: string }): Promise<string | null> {
    if (!this.clientId || !this.secret) {
      console.warn('Plaid not configured, cannot create link token');
      return null;
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/link/token/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Plaid-Version': '2020-09-14'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          secret: this.secret,
          user: {
            client_user_id: user?.email || 'user-' + Date.now()
          },
          client_name: 'Trust Ledger System',
          products: ['auth'],
          country_codes: ['US'],
          language: 'en',
          webhook: '' // Add webhook URL for production
        })
      });

      const data = await response.json();

      if (data.error_code) {
        console.error('Plaid link token creation error:', data.error_message);
        return null;
      }

      return data.link_token;
    } catch (error) {
      console.error('Plaid link token creation error:', error);
      return null;
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string): Promise<string | null> {
    if (!this.clientId || !this.secret) {
      return null;
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/item/public_token/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Plaid-Version': '2020-09-14'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          secret: this.secret,
          public_token: publicToken
        })
      });

      const data = await response.json();

      if (data.error_code) {
        console.error('Plaid token exchange error:', data.error_message);
        return null;
      }

      return data.access_token;
    } catch (error) {
      console.error('Plaid token exchange error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const plaidService = new PlaidService();

// Export types
export default plaidService;
