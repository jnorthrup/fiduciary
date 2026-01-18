/**
 * PWA Secure Storage Service
 *
 * Provides secure credential storage for PWA applications using:
 * - Web Credential Management API (when available)
 * - Encrypted localStorage fallback
 * - Secure session storage
 */

// ============================================================================
// Types
// ============================================================================

export interface StoredCredential {
  id: string;
  type: 'TCC' | 'BEARER_TOKEN' | 'API_KEY';
  name: string;
  value: string;
  metadata?: {
    expiresAt?: number;
    transmitterId?: string;
    softwareId?: string;
  };
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Encryption Utilities (for localStorage fallback)
// ============================================================================

/**
 * Simple XOR encryption for localStorage (NOT for production secrets)
 * In production, use proper encryption like Web Crypto API
 */
function encrypt(text: string, key: string): string {
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(key);

  const encrypted = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  return btoa(String.fromCharCode(...encrypted));
}

function decrypt(encoded: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const encrypted = atob(encoded);

  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted.charCodeAt(i) ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(decrypted);
}

/**
 * Generate a deterministic key from browser fingerprint
 */
function getStorageKey(): string {
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');

  // Simple hash to create a consistent key
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `cred_${hash.toString(36)}`;
}

// ============================================================================
// Credential Management API (when available)
// ============================================================================

/**
 * Check if Web Credential Management API is available
 */
function isCredentialManagerAvailable(): boolean {
  return 'credentials' in navigator && 'PasswordCredential' in window;
}

/**
 * Store credential using Web Credential Management API
 */
async function storeWithCredentialAPI(credential: StoredCredential): Promise<boolean> {
  if (!isCredentialManagerAvailable()) return false;

  try {
    const passwordCredential = new PasswordCredential({
      id: credential.id,
      name: credential.name,
      password: credential.value,
    });

    await navigator.credentials.store(passwordCredential);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve credential using Web Credential Management API
 */
async function getWithCredentialAPI(id: string): Promise<StoredCredential | null> {
  if (!isCredentialManagerAvailable()) return null;

  try {
    const result = await navigator.credentials.get({ password: { id } });

    if (result && result instanceof PasswordCredential) {
      return {
        id: result.id,
        type: result.id.startsWith('TCC') ? 'TCC' : 'BEARER_TOKEN',
        name: result.name,
        value: result.password,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

// ============================================================================
// LocalStorage with Encryption (fallback)
// ============================================================================

const STORAGE_KEY = 'irs_credentials';

/**
 * Get all stored credentials from localStorage
 */
function getStoredCredentialsMap(): Record<string, StoredCredential> {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) return {};

    const key = getStorageKey();
    const decrypted = decrypt(encrypted, key);
    return JSON.parse(decrypted);
  } catch {
    return {};
  }
}

/**
 * Save credentials map to localStorage
 */
function saveStoredCredentialsMap(map: Record<string, StoredCredential>): void {
  try {
    const key = getStorageKey();
    const json = JSON.stringify(map);
    const encrypted = encrypt(json, key);
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (e) {
    console.error('Failed to save credentials:', e);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Store a credential securely
 */
export async function storeCredential(credential: Omit<StoredCredential, 'createdAt' | 'updatedAt'>): Promise<boolean> {
  const storedCred: StoredCredential = {
    ...credential,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Try Web Credential API first
  const apiSuccess = await storeWithCredentialAPI(storedCred);
  if (apiSuccess) return true;

  // Fall back to encrypted localStorage
  const map = getStoredCredentialsMap();
  map[credential.id] = storedCred;
  saveStoredCredentialsMap(map);

  return true;
}

/**
 * Retrieve a stored credential by ID
 */
export async function getCredential(id: string): Promise<StoredCredential | null> {
  // Try Web Credential API first
  const apiResult = await getWithCredentialAPI(id);
  if (apiResult) return apiResult;

  // Fall back to encrypted localStorage
  const map = getStoredCredentialsMap();
  return map[id] || null;
}

/**
 * List all stored credentials of a specific type
 */
export async function listCredentials(type?: StoredCredential['type']): Promise<StoredCredential[]> {
  // For Credential Manager API, we'd need to list all (not well supported)
  // So we use localStorage for listing
  const map = getStoredCredentialsMap();
  const credentials = Object.values(map);

  if (type) {
    return credentials.filter(c => c.type === type);
  }

  return credentials;
}

/**
 * Delete a stored credential
 */
export async function deleteCredential(id: string): Promise<boolean> {
  // Try to remove from Credential Manager API
  if (isCredentialManagerAvailable()) {
    try {
      const cred = await getWithCredentialAPI(id);
      if (cred) {
        await navigator.credentials.store(cred);
      }
    } catch {
      // Continue to localStorage cleanup
    }
  }

  // Remove from localStorage
  const map = getStoredCredentialsMap();
  delete map[id];
  saveStoredCredentialsMap(map);

  return true;
}

/**
 * Clear all stored credentials
 */
export async function clearAllCredentials(): Promise<void> {
  // Clear localStorage
  localStorage.removeItem(STORAGE_KEY);

  // Note: Credential Manager API doesn't provide a clear-all method
  // In practice, users would manage these through browser settings
}

// ============================================================================
// TCC-Specific Helpers
// ============================================================================

/**
 * Store TCC credential
 */
export async function storeTCC(tcc: string, name: string, transmitterId?: string): Promise<void> {
  await storeCredential({
    id: `tcc_${Date.now()}`,
    type: 'TCC',
    name: name || `TCC (${tcc.slice(0, 6)}...)`,
    value: tcc,
    metadata: {
      transmitterId: transmitterId || tcc,
    },
  });
}

/**
 * Get stored TCC credentials
 */
export async function getStoredTCCs(): Promise<StoredCredential[]> {
  return listCredentials('TCC');
}

/**
 * Check if any TCC is stored
 */
export async function hasStoredTCC(): Promise<boolean> {
  const tccs = await getStoredTCCs();
  return tccs.length > 0;
}

/**
 * Auto-fill from stored TCC
 */
export async function autoFillTCC(): Promise<{ tcc: string; name: string } | null> {
  const tccs = await getStoredTCCs();
  if (tccs.length === 0) return null;

  // Use the most recently stored TCC
  const latestTCC = tccs.sort((a, b) => b.createdAt - a.createdAt)[0];
  return {
    tcc: latestTCC.value,
    name: latestTCC.name,
  };
}

// ============================================================================
// Bearer Token Helpers
// ============================================================================

/**
 * Store bearer token
 */
export async function storeBearerToken(token: string, name: string): Promise<void> {
  await storeCredential({
    id: `bearer_${Date.now()}`,
    type: 'BEARER_TOKEN',
    name: name || 'Bearer Token',
    value: token,
  });
}

/**
 * Get stored bearer tokens
 */
export async function getStoredBearerTokens(): Promise<StoredCredential[]> {
  return listCredentials('BEARER_TOKEN');
}
