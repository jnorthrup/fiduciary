/**
 * Session Storage
 *
 * Secure session persistence for IRS portal authentication.
 * Handles encryption, disk I/O, and session lifecycle management.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { Cookie } from 'playwright';

export interface SessionStorageConfig {
  sessionDir?: string;
  encryptionKey?: string;
}

export interface Session {
  username: string;
  authenticated: boolean;
  cookies: Cookie[];
  createdAt: number;
  expiresAt: number;
}

export interface SaveResult {
  success: boolean;
  filePath?: string;
  error?: {
    type: string;
    message: string;
  };
}

export interface LoadResult {
  success: boolean;
  session?: Session;
  error?: {
    type: string;
    message: string;
  };
}

export interface DeleteResult {
  success: boolean;
  error?: {
    type: string;
    message: string;
  };
}

export interface SessionListItem {
  username: string;
  filePath: string;
  createdAt: number;
  expiresAt: number;
}

export interface CleanupResult {
  deleted: number;
  errors: string[];
}

export class SessionStorage {
  private config: Required<SessionStorageConfig>;
  private encryptionKey: Buffer;

  constructor(config: SessionStorageConfig = {}) {
    this.config = {
      sessionDir: config.sessionDir || path.join(process.cwd(), 'test', 'session-storage'),
      encryptionKey: config.encryptionKey || process.env.SESSION_ENCRYPTION_KEY || 'default-key-change-in-production',
    };

    // Derive 32-byte key for AES-256
    this.encryptionKey = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
  }

  /**
   * Save session to disk with encryption
   */
  async saveSession(session: Session): Promise<SaveResult> {
    try {
      // Ensure session directory exists
      await fs.mkdir(this.config.sessionDir, { recursive: true });

      // Sanitize username for filename
      const sanitizedUsername = this.sanitizeUsername(session.username);
      const fileName = `irs-eservices-${sanitizedUsername}.json`;
      const filePath = path.join(this.config.sessionDir, fileName);

      // Encrypt session data
      const encrypted = this.encryptSession(JSON.stringify(session));

      // Write to disk
      await fs.writeFile(filePath, encrypted, 'utf-8');

      // Set restrictive permissions (Unix only)
      try {
        await fs.chmod(filePath, 0o600);
      } catch {
        // Windows doesn't support chmod - ignore
      }

      return { success: true, filePath };
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'save_error',
          message: error.message || 'Failed to save session',
        },
      };
    }
  }

  /**
   * Load session from disk with decryption
   */
  async loadSession(username: string): Promise<LoadResult> {
    try {
      const sanitizedUsername = this.sanitizeUsername(username);
      const fileName = `irs-eservices-${sanitizedUsername}.json`;
      const filePath = path.join(this.config.sessionDir, fileName);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          success: false,
          error: {
            type: 'file_not_found',
            message: `Session file not found for user: ${username}`,
          },
        };
      }

      // Read encrypted data
      const encrypted = await fs.readFile(filePath, 'utf-8');

      // Decrypt session data
      let decrypted: string;
      try {
        decrypted = this.decryptSession(encrypted);
      } catch (decryptError: any) {
        return {
          success: false,
          error: {
            type: 'decryption_error',
            message: 'Failed to decrypt session - wrong key or corrupted data',
          },
        };
      }

      const session: Session = JSON.parse(decrypted);

      return { success: true, session };
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'load_error',
          message: error.message || 'Failed to load session',
        },
      };
    }
  }

  /**
   * Check if session is still valid
   */
  isSessionValid(session: Session): boolean {
    if (!session.authenticated) return false;
    if (!session.expiresAt) return false;
    if (Date.now() >= session.expiresAt) return false;
    return true;
  }

  /**
   * Delete session file
   */
  async deleteSession(username: string): Promise<DeleteResult> {
    try {
      const sanitizedUsername = this.sanitizeUsername(username);
      const fileName = `irs-eservices-${sanitizedUsername}.json`;
      const filePath = path.join(this.config.sessionDir, fileName);

      await fs.unlink(filePath);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'delete_error',
          message: error.message || 'Failed to delete session',
        },
      };
    }
  }

  /**
   * List all stored sessions
   */
  async listSessions(): Promise<SessionListItem[]> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.config.sessionDir, { recursive: true });

      const files = await fs.readdir(this.config.sessionDir);
      const sessionFiles = files.filter(f => f.startsWith('irs-eservices-') && f.endsWith('.json'));

      const sessions: SessionListItem[] = [];

      for (const file of sessionFiles) {
        try {
          const filePath = path.join(this.config.sessionDir, file);
          const encrypted = await fs.readFile(filePath, 'utf-8');
          const decrypted = this.decryptSession(encrypted);
          const session: Session = JSON.parse(decrypted);

          sessions.push({
            username: session.username,
            filePath,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
          });
        } catch {
          // Skip corrupted files
          continue;
        }
      }

      return sessions;
    } catch {
      return [];
    }
  }

  /**
   * Clean up all expired sessions
   */
  async cleanupExpiredSessions(): Promise<CleanupResult> {
    const result: CleanupResult = {
      deleted: 0,
      errors: [],
    };

    try {
      const sessions = await this.listSessions();

      for (const sessionInfo of sessions) {
        // Load full session to check expiry
        const loadResult = await this.loadSession(sessionInfo.username);

        if (loadResult.success && loadResult.session) {
          if (!this.isSessionValid(loadResult.session)) {
            const deleteResult = await this.deleteSession(sessionInfo.username);
            if (deleteResult.success) {
              result.deleted++;
            } else {
              result.errors.push(`Failed to delete ${sessionInfo.username}`);
            }
          }
        }
      }

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Sanitize username for safe filename
   */
  private sanitizeUsername(username: string): string {
    // Replace unsafe characters with underscores
    return username.replace(/[^a-zA-Z0-9@.-]/g, '_');
  }

  /**
   * Encrypt session data using AES-256-GCM
   */
  private encryptSession(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex'),
    });
  }

  /**
   * Decrypt session data
   */
  private decryptSession(encrypted: string): string {
    const parsed = JSON.parse(encrypted);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(parsed.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(parsed.authTag, 'hex'));

    let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
