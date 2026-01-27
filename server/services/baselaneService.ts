/**
 * Baselane API Service
 *
 * Service module for Baselane landlord banking API integration
 * Track: baselane_api_20260124
 *
 * API Documentation: https://docs.baselane.com
 * Sandbox URL: https://sandbox-api.baselane.com/v1
 * Production URL: https://api.baselane.com/v1
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Baselane service configuration
 */
export interface BaselaneConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  apiVersion?: string;
}

/**
 * OAuth authentication token
 */
export interface BaselaneAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string[];
}

/**
 * Property address
 */
export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

/**
 * Property type
 */
export type PropertyType = 'residential' | 'multifamily' | 'commercial';

/**
 * Property entity
 */
export interface Property {
  id?: string;
  address: PropertyAddress;
  propertyType: PropertyType;
  units: number;
  nickname?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Property unit
 */
export interface Unit {
  id?: string;
  propertyId: string;
  unitNumber: string;
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  rentAmount?: number;
  securityDeposit?: number;
  isOccupied?: boolean;
}

/**
 * Tenant entity
 */
export interface Tenant {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  unitId?: string;
  propertyId?: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  securityDeposit: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Rent charge type
 */
export type ChargeType = 'rent' | 'late_fee' | 'other';

/**
 * Rent charge
 */
export interface RentCharge {
  id?: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  amount: number;
  dueDate: string;
  type: ChargeType;
  description?: string;
  status?: 'pending' | 'paid' | 'voided';
  createdAt?: string;
}

/**
 * Payment method type
 */
export type PaymentMethodType = 'bank_account' | 'card';

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Rent payment
 */
export interface Payment {
  id?: string;
  chargeId: string;
  tenantId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethodType;
  paymentMethodId?: string;
  createdAt?: string;
  completedAt?: string;
  failedReason?: string;
}

/**
 * Payment method
 */
export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: PaymentMethodType;
  isDefault?: boolean;
  bankAccount?: {
    last4: string;
    bankName: string;
    accountType: 'checking' | 'savings';
  };
  card?: {
    last4: string;
    brand: string;
    expiry: string;
  };
}

/**
 * Account balance
 */
export interface Balance {
  available: number;
  current: number;
  pending: number;
  currency: string;
  asOfDate: string;
}

/**
 * Transaction
 */
export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  category?: string;
  propertyId?: string;
  unitId?: string;
  postedDate: string;
  createdAt: string;
}

/**
 * Transfer request
 */
export interface TransferRequest {
  fromAccountId: string;
  toAccountId?: string;
  amount: number;
  memo?: string;
  // For external transfers
  routingNumber?: string;
  accountNumber?: string;
  accountType?: 'checking' | 'savings';
}

/**
 * Property performance metrics
 */
export interface PropertyPerformance {
  propertyId: string;
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  occupancyRate: number;
  averageRent: number;
  totalCollected: number;
  totalOutstanding: number;
  period: {
    start: string;
    end: string;
  };
}

/**
 * Portfolio summary
 */
export interface PortfolioSummary {
  totalProperties: number;
  totalUnits: number;
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  occupancyRate: number;
  totalTenants: number;
}

/**
 * Rent roll entry
 */
export interface RentRollEntry {
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  tenantName: string;
  monthlyRent: number;
  leaseStart: string;
  leaseEnd: string;
  balance: number;
  status: 'current' | 'late' | 'paid_ahead';
}

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'rent.payment.completed'
  | 'rent.payment.failed'
  | 'rent.charge.created'
  | 'tenant.created'
  | 'tenant.updated'
  | 'banking.transaction.posted'
  | 'property.created'
  | 'property.updated';

/**
 * Webhook payload
 */
export interface WebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
  signature: string;
}

/**
 * API error response
 */
export interface BaselaneError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: BaselaneError;
  success: boolean;
}

// ============================================================================
// BASELANE SERVICE CLASS
// ============================================================================

/**
 * Baselane API Service Class
 *
 * Provides methods for interacting with the Baselane landlord banking API.
 * Handles authentication, rate limiting, and error handling.
 */
export class BaselaneService {
  private config: BaselaneConfig;
  private authToken: BaselaneAuthToken | null = null;
  private baseUrl: string;

  /**
   * Create a new Baselane service instance
   *
   * @param config - Service configuration
   */
  constructor(config: BaselaneConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.baselane.com/v1'
      : 'https://sandbox-api.baselane.com/v1';
  }

  /**
   * Get the base URL for API requests
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the current configuration
   */
  getConfig(): BaselaneConfig {
    return { ...this.config };
  }

  /**
   * Set the authentication token (for testing or manual token management)
   *
   * @param token - Authentication token
   */
  setAuthToken(token: BaselaneAuthToken | null): void {
    this.authToken = token;
  }

  /**
   * Get the current authentication token
   */
  getAuthToken(): BaselaneAuthToken | null {
    return this.authToken;
  }

  /**
   * Make an authenticated API request
   *
   * @param url - Full API URL
   * @param options - Fetch options
   * @returns Promise resolving to fetch Response
   */
  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    let authHeader: string;

    // Use service's own token if available (for testing), otherwise get from auth manager
    if (this.authToken && this.authToken.accessToken) {
      authHeader = `Bearer ${this.authToken.accessToken}`;
    } else {
      // Import here to avoid circular dependency
      const { getAuthHeader } = await import('./baselaneAuth.js');
      authHeader = await getAuthHeader(this.config);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
        ...options.headers
      }
    });

    return response;
  }

  /**
   * Handle API errors and return standardized ApiResponse
   *
   * @param message - Error message prefix
   * @param error - Error object
   * @returns ApiResponse with error details
   */
  private handleError<T>(message: string, error: unknown): ApiResponse<T> {
    console.error(`[Baselane Service] ${message}:`, error);

    const apiError: BaselaneError = {
      code: 'API_ERROR',
      message: typeof error === 'string' ? error : error instanceof Error ? error.message : 'Unknown error',
      requestId: Date.now().toString()
    };

    return {
      success: false,
      error: apiError
    };
  }

  // ============================================================================
  // PROPERTY MANAGEMENT (Phase 3)
  // ============================================================================

  /**
   * List all properties
   *
   * GET /properties
   */
  async getProperties(): Promise<ApiResponse<Property[]>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/properties`, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.properties || data
      };
    } catch (error) {
      return this.handleError('Failed to get properties', error);
    }
  }

  /**
   * Get a property by ID
   *
   * GET /properties/{propertyId}
   */
  async getProperty(propertyId: string): Promise<ApiResponse<Property>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/properties/${propertyId}`, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.property || data
      };
    } catch (error) {
      return this.handleError(`Failed to get property ${propertyId}`, error);
    }
  }

  /**
   * Create a new property
   *
   * POST /properties
   */
  async createProperty(property: Omit<Property, 'id'>): Promise<ApiResponse<Property>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/properties`, {
        method: 'POST',
        body: JSON.stringify(property)
      });

      const data = await response.json();

      return {
        success: true,
        data: data.property || data
      };
    } catch (error) {
      return this.handleError('Failed to create property', error);
    }
  }

  /**
   * Update a property
   *
   * PATCH /properties/{propertyId}
   */
  async updateProperty(propertyId: string, updates: Partial<Property>): Promise<ApiResponse<Property>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/properties/${propertyId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      return {
        success: true,
        data: data.property || data
      };
    } catch (error) {
      return this.handleError(`Failed to update property ${propertyId}`, error);
    }
  }

  /**
   * Delete a property
   *
   * DELETE /properties/{propertyId}
   */
  async deleteProperty(propertyId: string): Promise<ApiResponse<void>> {
    try {
      await this.makeRequest(`${this.baseUrl}/properties/${propertyId}`, {
        method: 'DELETE'
      });

      return {
        success: true
      };
    } catch (error) {
      return this.handleError(`Failed to delete property ${propertyId}`, error);
    }
  }

  /**
   * List units for a property
   *
   * GET /properties/{propertyId}/units
   */
  async listUnits(propertyId: string): Promise<ApiResponse<Unit[]>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/properties/${propertyId}/units`, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.units || data
      };
    } catch (error) {
      return this.handleError(`Failed to get units for property ${propertyId}`, error);
    }
  }

  /**
   * Create a unit in a property
   *
   * POST /properties/{propertyId}/units
   */
  async createUnit(propertyId: string, unit: Omit<Unit, 'id'>): Promise<ApiResponse<Unit>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/properties/${propertyId}/units`, {
        method: 'POST',
        body: JSON.stringify(unit)
      });

      const data = await response.json();

      return {
        success: true,
        data: data.unit || data
      };
    } catch (error) {
      return this.handleError(`Failed to create unit for property ${propertyId}`, error);
    }
  }

  /**
   * Update a unit
   *
   * PATCH /properties/{propertyId}/units/{unitId}
   */
  async updateUnit(propertyId: string, unitId: string, updates: Partial<Unit>): Promise<ApiResponse<Unit>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/properties/${propertyId}/units/${unitId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      return {
        success: true,
        data: data.unit || data
      };
    } catch (error) {
      return this.handleError(`Failed to update unit ${unitId}`, error);
    }
  }

  // ============================================================================
  // TENANT MANAGEMENT (Phase 4)
  // ============================================================================

  /**
   * List all tenants
   *
   * GET /tenants
   */
  async getTenants(): Promise<ApiResponse<Tenant[]>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/tenants`, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.tenants || data
      };
    } catch (error) {
      return this.handleError('Failed to get tenants', error);
    }
  }

  /**
   * Get a tenant by ID
   *
   * GET /tenants/{tenantId}
   */
  async getTenant(tenantId: string): Promise<ApiResponse<Tenant>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/tenants/${tenantId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        return this.handleError(`Failed to get tenant ${tenantId}`, `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.tenant || data
      };
    } catch (error) {
      return this.handleError(`Failed to get tenant ${tenantId}`, error);
    }
  }

  /**
   * Create a new tenant
   *
   * POST /tenants
   */
  async createTenant(tenant: Omit<Tenant, 'id'>): Promise<ApiResponse<Tenant>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/tenants`, {
        method: 'POST',
        body: JSON.stringify(tenant)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Preserve API error structure if available
        if (errorData.error) {
          return {
            success: false,
            error: {
              code: errorData.error.code || 'API_ERROR',
              message: errorData.error.message || 'Failed to create tenant',
              details: errorData.error.details,
              requestId: errorData.requestId || Date.now().toString()
            }
          };
        }
        return this.handleError('Failed to create tenant', `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.tenant || data
      };
    } catch (error) {
      return this.handleError('Failed to create tenant', error);
    }
  }

  /**
   * Update a tenant
   *
   * PATCH /tenants/{tenantId}
   */
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/tenants/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        return this.handleError(`Failed to update tenant ${tenantId}`, `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.tenant || data
      };
    } catch (error) {
      return this.handleError(`Failed to update tenant ${tenantId}`, error);
    }
  }

  /**
   * Delete a tenant
   *
   * DELETE /tenants/{tenantId}
   */
  async deleteTenant(tenantId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/tenants/${tenantId}`, {
        method: 'DELETE'
      });

      return {
        success: true
      };
    } catch (error) {
      return this.handleError(`Failed to delete tenant ${tenantId}`, error);
    }
  }

  // ============================================================================
  // RENT COLLECTION (Phase 5)
  // ============================================================================

  /**
   * Create a rent charge
   *
   * POST /rent/charges
   */
  async createRentCharge(charge: Omit<RentCharge, 'id'>): Promise<ApiResponse<RentCharge>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/rent/charges`, {
        method: 'POST',
        body: JSON.stringify(charge)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error) {
          return {
            success: false,
            error: {
              code: errorData.error.code || 'API_ERROR',
              message: errorData.error.message || 'Failed to create rent charge',
              details: errorData.error.details,
              requestId: errorData.requestId || Date.now().toString()
            }
          };
        }
        return this.handleError('Failed to create rent charge', `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.charge || data
      };
    } catch (error) {
      return this.handleError('Failed to create rent charge', error);
    }
  }

  /**
   * List rent charges
   *
   * GET /rent/charges?tenantId={tenantId}
   */
  async getRentCharges(tenantId?: string): Promise<ApiResponse<RentCharge[]>> {
    try {
      let url = `${this.baseUrl}/rent/charges`;
      if (tenantId) {
        url += `?tenantId=${encodeURIComponent(tenantId)}`;
      }

      const response = await this.makeRequest(url, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.charges || data
      };
    } catch (error) {
      return this.handleError('Failed to get rent charges', error);
    }
  }

  /**
   * Void a rent charge
   *
   * DELETE /rent/charges/{chargeId}
   */
  async voidRentCharge(chargeId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/rent/charges/${chargeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        return this.handleError(`Failed to void rent charge ${chargeId}`, `HTTP ${response.status}`);
      }

      return {
        success: true
      };
    } catch (error) {
      return this.handleError(`Failed to void rent charge ${chargeId}`, error);
    }
  }

  /**
   * Initiate a payment
   *
   * POST /rent/payments
   */
  async initiatePayment(payment: Omit<Payment, 'id' | 'status' | 'createdAt' | 'completedAt'>): Promise<ApiResponse<Payment>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/rent/payments`, {
        method: 'POST',
        body: JSON.stringify(payment)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error) {
          return {
            success: false,
            error: {
              code: errorData.error.code || 'API_ERROR',
              message: errorData.error.message || 'Failed to initiate payment',
              details: errorData.error.details,
              requestId: errorData.requestId || Date.now().toString()
            }
          };
        }
        return this.handleError('Failed to initiate payment', `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.payment || data
      };
    } catch (error) {
      return this.handleError('Failed to initiate payment', error);
    }
  }

  /**
   * List payments
   *
   * GET /rent/payments?tenantId={tenantId}
   */
  async getPayments(tenantId?: string): Promise<ApiResponse<Payment[]>> {
    try {
      let url = `${this.baseUrl}/rent/payments`;
      if (tenantId) {
        url += `?tenantId=${encodeURIComponent(tenantId)}`;
      }

      const response = await this.makeRequest(url, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.payments || data
      };
    } catch (error) {
      return this.handleError('Failed to get payments', error);
    }
  }

  /**
   * Get payment status
   *
   * GET /rent/payments/{paymentId}
   */
  async getPaymentStatus(paymentId: string): Promise<ApiResponse<Payment>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/rent/payments/${paymentId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        return this.handleError(`Failed to get payment status ${paymentId}`, `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.payment || data
      };
    } catch (error) {
      return this.handleError(`Failed to get payment status ${paymentId}`, error);
    }
  }

  /**
   * Refund a payment
   *
   * POST /rent/payments/{paymentId}/refund
   */
  async refundPayment(paymentId: string, amount: number, reason?: string): Promise<ApiResponse<Payment>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/rent/payments/${paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount, reason })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error) {
          return {
            success: false,
            error: {
              code: errorData.error.code || 'API_ERROR',
              message: errorData.error.message || 'Failed to refund payment',
              details: errorData.error.details,
              requestId: errorData.requestId || Date.now().toString()
            }
          };
        }
        return this.handleError(`Failed to refund payment ${paymentId}`, `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.payment || data
      };
    } catch (error) {
      return this.handleError(`Failed to refund payment ${paymentId}`, error);
    }
  }

  /**
   * List payment methods for a tenant
   *
   * GET /tenants/{tenantId}/payment-methods
   */
  async listPaymentMethods(tenantId: string): Promise<ApiResponse<PaymentMethod[]>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/tenants/${tenantId}/payment-methods`, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.payment_methods || data
      };
    } catch (error) {
      return this.handleError(`Failed to get payment methods for tenant ${tenantId}`, error);
    }
  }

  /**
   * Add bank account payment method
   *
   * POST /tenants/{tenantId}/payment-methods/bank-account
   */
  async addBankAccount(
    tenantId: string,
    accountDetails: {
      accountNumber: string;
      routingNumber: string;
      accountType: 'checking' | 'savings';
    }
  ): Promise<ApiResponse<PaymentMethod>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/tenants/${tenantId}/payment-methods/bank-account`, {
        method: 'POST',
        body: JSON.stringify(accountDetails)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error) {
          return {
            success: false,
            error: {
              code: errorData.error.code || 'API_ERROR',
              message: errorData.error.message || 'Failed to add bank account',
              details: errorData.error.details,
              requestId: errorData.requestId || Date.now().toString()
            }
          };
        }
        return this.handleError('Failed to add bank account', `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.payment_method || data
      };
    } catch (error) {
      return this.handleError('Failed to add bank account', error);
    }
  }

  /**
   * Verify payment method with micro-deposits
   *
   * POST /tenants/{tenantId}/payment-methods/{methodId}/verify
   */
  async verifyPaymentMethod(
    tenantId: string,
    methodId: string,
    verificationDetails: {
      amount1: number;
      amount2: number;
    }
  ): Promise<ApiResponse<PaymentMethod>> {
    try {
      const response = await this.makeRequest(
        `${this.baseUrl}/tenants/${tenantId}/payment-methods/${methodId}/verify`,
        {
          method: 'POST',
          body: JSON.stringify(verificationDetails)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error) {
          return {
            success: false,
            error: {
              code: errorData.error.code || 'API_ERROR',
              message: errorData.error.message || 'Failed to verify payment method',
              details: errorData.error.details,
              requestId: errorData.requestId || Date.now().toString()
            }
          };
        }
        return this.handleError('Failed to verify payment method', `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.payment_method || data
      };
    } catch (error) {
      return this.handleError('Failed to verify payment method', error);
    }
  }

  // ============================================================================
  // BANKING OPERATIONS (Phase 6)
  // ============================================================================

  /**
   * Get account balance
   *
   * GET /banking/accounts/{accountId}/balance
   */
  async getBalance(accountId: string): Promise<ApiResponse<Balance>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/banking/accounts/${accountId}/balance`, {
        method: 'GET'
      });

      if (!response.ok) {
        return this.handleError(`Failed to get balance for account ${accountId}`, `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.balance || data
      };
    } catch (error) {
      return this.handleError(`Failed to get balance for account ${accountId}`, error);
    }
  }

  /**
   * List transactions
   *
   * GET /banking/accounts/{accountId}/transactions
   */
  async getTransactions(accountId: string, options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Transaction[]>> {
    try {
      let url = `${this.baseUrl}/banking/accounts/${accountId}/transactions`;
      const params = new URLSearchParams();

      if (options?.startDate) {
        params.append('startDate', options.startDate);
      }
      if (options?.endDate) {
        params.append('endDate', options.endDate);
      }
      if (options?.limit !== undefined) {
        params.append('limit', options.limit.toString());
      }
      if (options?.offset !== undefined) {
        params.append('offset', options.offset.toString());
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await this.makeRequest(url, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.transactions || data
      };
    } catch (error) {
      return this.handleError(`Failed to get transactions for account ${accountId}`, error);
    }
  }

  /**
   * Categorize a transaction
   *
   * PATCH /banking/transactions/{transactionId}
   */
  async categorizeTransaction(transactionId: string, category: string, propertyId?: string): Promise<ApiResponse<Transaction>> {
    try {
      const updateData: { category: string; propertyId?: string } = { category };
      if (propertyId) {
        updateData.propertyId = propertyId;
      }

      const response = await this.makeRequest(`${this.baseUrl}/banking/transactions/${transactionId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error) {
          return {
            success: false,
            error: {
              code: errorData.error.code || 'API_ERROR',
              message: errorData.error.message || 'Failed to categorize transaction',
              details: errorData.error.details,
              requestId: errorData.requestId || Date.now().toString()
            }
          };
        }
        return this.handleError(`Failed to categorize transaction ${transactionId}`, `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.transaction || data
      };
    } catch (error) {
      return this.handleError(`Failed to categorize transaction ${transactionId}`, error);
    }
  }

  /**
   * Initiate a transfer
   *
   * POST /banking/transfers or /banking/transfers/external
   */
  async initiateTransfer(transfer: TransferRequest): Promise<ApiResponse<{ transferId: string }>> {
    try {
      // Determine if internal or external transfer
      const isExternal = !!transfer.routingNumber;
      const endpoint = isExternal ? '/banking/transfers/external' : '/banking/transfers';

      const response = await this.makeRequest(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(transfer)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error) {
          return {
            success: false,
            error: {
              code: errorData.error.code || 'API_ERROR',
              message: errorData.error.message || 'Failed to initiate transfer',
              details: errorData.error.details,
              requestId: errorData.requestId || Date.now().toString()
            }
          };
        }
        return this.handleError('Failed to initiate transfer', `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: { transferId: data.transferId || data.id }
      };
    } catch (error) {
      return this.handleError('Failed to initiate transfer', error);
    }
  }

  // ============================================================================
  // REPORTING (Phase 10)
  // ============================================================================

  /**
   * Get property performance report
   *
   * GET /reports/properties/{propertyId}
   */
  async getPropertyPerformance(propertyId: string, startDate: string, endDate: string): Promise<ApiResponse<PropertyPerformance>> {
    try {
      const url = `${this.baseUrl}/reports/properties/${propertyId}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

      const response = await this.makeRequest(url, {
        method: 'GET'
      });

      if (!response.ok) {
        return this.handleError(`Failed to get property performance for ${propertyId}`, `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.performance || data
      };
    } catch (error) {
      return this.handleError(`Failed to get property performance for ${propertyId}`, error);
    }
  }

  /**
   * Get portfolio summary
   *
   * GET /reports/portfolio
   */
  async getPortfolioSummary(): Promise<ApiResponse<PortfolioSummary>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/reports/portfolio`, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.summary || data
      };
    } catch (error) {
      return this.handleError('Failed to get portfolio summary', error);
    }
  }

  /**
   * Get rent roll report
   *
   * GET /reports/rent-roll
   */
  async getRentRoll(): Promise<ApiResponse<RentRollEntry[]>> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/reports/rent-roll`, {
        method: 'GET'
      });

      const data = await response.json();

      return {
        success: true,
        data: data.rentRoll || data
      };
    } catch (error) {
      return this.handleError('Failed to get rent roll report', error);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BaselaneService;
