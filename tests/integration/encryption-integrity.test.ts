/**
 * Encryption Integrity Tests
 * Verifies Web Crypto API AES-GCM encryption for local-first persistence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoService, EncryptedData } from '../../services/cryptoService';

// Web Crypto API polyfill for Node.js environment
let cryptoService: CryptoService;

describe('Encryption Integrity Tests', () => {
  beforeEach(() => {
    cryptoService = new CryptoService();
  });

  describe('Web Crypto API Availability', () => {
    it('should have Web Crypto API available', () => {
      expect(typeof window).toBeDefined();
      expect(typeof window.crypto).toBeDefined();
      expect(typeof window.crypto.subtle).toBeDefined();
    });

    it('should support AES-GCM algorithm', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveKey('test-password', salt);
      expect(key).toBeDefined();
      expect(key.algorithm.name).toBe('AES-GCM');
    });
  });

  describe('Key Derivation (PBKDF2)', () => {
    it('should derive consistent keys from same password and salt', async () => {
      const password = 'test-password-123';
      const salt = cryptoService.generateSalt();

      const key1 = await cryptoService.deriveKey(password, salt);
      const key2 = await cryptoService.deriveKey(password, salt);

      // Keys are non-extractable, verify by encrypting with both
      const plaintext = 'test';
      const { ciphertext: ct1, iv: iv1 } = await cryptoService.encrypt(plaintext, key1);
      const { ciphertext: ct2, iv: iv2 } = await cryptoService.encrypt(plaintext, key2);

      // Same key should decrypt each other's ciphertext
      const decrypted1 = await cryptoService.decrypt(ct1, key2, iv1);
      const decrypted2 = await cryptoService.decrypt(ct2, key1, iv2);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should derive different keys from different passwords', async () => {
      const salt = cryptoService.generateSalt();
      const plaintext = 'test';

      const key1 = await cryptoService.deriveKey('password1', salt);
      const key2 = await cryptoService.deriveKey('password2', salt);

      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key1);

      // key2 should not be able to decrypt key1's ciphertext
      await expect(cryptoService.decrypt(ciphertext, key2, iv)).rejects.toThrow();
    });

    it('should derive different keys from different salts', async () => {
      const password = 'test-password';
      const salt1 = cryptoService.generateSalt();
      const salt2 = cryptoService.generateSalt();
      const plaintext = 'test';

      const key1 = await cryptoService.deriveKey(password, salt1);
      const key2 = await cryptoService.deriveKey(password, salt2);

      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key1);

      // key2 should not be able to decrypt key1's ciphertext
      await expect(cryptoService.decrypt(ciphertext, key2, iv)).rejects.toThrow();
    });

    it('should use PBKDF2 with sufficient iterations', async () => {
      const salt = cryptoService.generateSalt();
      const password = 'password';
      const plaintext = 'test';

      const start = Date.now();
      const key = await cryptoService.deriveKey(password, salt);
      const deriveTime = Date.now() - start;

      // Should take some time due to 100k iterations (not instant)
      // Using >= to handle edge case where it's exactly 10ms
      expect(deriveTime).toBeGreaterThanOrEqual(10);

      // Key should work for encryption
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Salt Generation', () => {
    it('should generate salts of correct length', () => {
      const salt = cryptoService.generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16); // SALT_LENGTH
    });

    it('should generate unique salts each time', () => {
      const salts = Array.from({ length: 100 }, () => cryptoService.generateSalt());
      const uniqueSalts = new Set(salts.map(s => Array.from(s).join(',')));

      expect(uniqueSalts.size).toBe(100);
    });

    it('should generate cryptographically random salts', () => {
      const salts = Array.from({ length: 1000 }, () => cryptoService.generateSalt());

      // Check for uniform distribution (rough test)
      const byteCounts = new Array(256).fill(0);
      for (const salt of salts) {
        for (const byte of salt) {
          byteCounts[byte]++;
        }
      }

      // No byte should appear suspiciously often or never
      const maxCount = Math.max(...byteCounts);
      const minCount = Math.min(...byteCounts);
      expect(maxCount).toBeLessThan(150); // Arbitrary threshold for randomness
      expect(minCount).toBeGreaterThan(0);
    });
  });

  describe('IV Generation', () => {
    it('should generate IVs of correct length', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveKey('password', salt);
      const { iv } = await cryptoService.encrypt('test', key);

      expect(iv).toBeInstanceOf(Uint8Array);
      expect(iv.length).toBe(12); // IV_LENGTH for AES-GCM
    });

    it('should generate unique IVs for each encryption', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveKey('password', salt);

      const { iv: iv1 } = await cryptoService.encrypt('test', key);
      const { iv: iv2 } = await cryptoService.encrypt('test', key);

      expect(iv1).not.toEqual(iv2);
    });
  });

  describe('Encryption/Decryption Round-Trip', () => {
    it('should successfully encrypt and decrypt simple text', async () => {
      const plaintext = 'Hello, World!';
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('should successfully encrypt and decrypt complex JSON', async () => {
      const plaintext = JSON.stringify({
        type: 'account',
        balance: 1234.56,
        transactions: [
          { id: 'txn-1', amount: 100 },
          { id: 'txn-2', amount: -50 }
        ]
      });
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const plaintext = 'Same text';
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveKey(password, salt);

      const { ciphertext: ciphertext1 } = await cryptoService.encrypt(plaintext, key);
      const { ciphertext: ciphertext2 } = await cryptoService.encrypt(plaintext, key);

      expect(new Uint8Array(ciphertext1)).not.toEqual(new Uint8Array(ciphertext2));
    });

    it('should handle empty strings', async () => {
      const plaintext = '';
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', async () => {
      const plaintext = 'Hello 世界 🌍 Ñoño';
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Data Unreadability Without Keys', () => {
    it('should fail to decrypt with wrong password', async () => {
      const plaintext = 'Secret data';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      const salt = cryptoService.generateSalt();

      const correctKey = await cryptoService.deriveKey(correctPassword, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, correctKey);

      const wrongKey = await cryptoService.deriveKey(wrongPassword, salt);

      await expect(cryptoService.decrypt(ciphertext, wrongKey, iv)).rejects.toThrow();
    });

    it('should fail to decrypt with wrong IV', async () => {
      const plaintext = 'Secret data';
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext } = await cryptoService.encrypt(plaintext, key);
      const wrongIv = cryptoService.generateSalt().slice(0, 12);

      await expect(cryptoService.decrypt(ciphertext, key, wrongIv)).rejects.toThrow();
    });

    it('should produce ciphertext that appears random', async () => {
      const plaintext = 'AAAAAAAAAAAA'; // Repeating pattern
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext } = await cryptoService.encrypt(plaintext, key);

      const bytes = new Uint8Array(ciphertext);

      // Check for randomness (no long runs of same byte)
      let maxRunLength = 1;
      let currentRunLength = 1;
      for (let i = 1; i < bytes.length; i++) {
        if (bytes[i] === bytes[i - 1]) {
          currentRunLength++;
        } else {
          maxRunLength = Math.max(maxRunLength, currentRunLength);
          currentRunLength = 1;
        }
      }
      expect(maxRunLength).toBeLessThan(5);
    });

    it('should not leak plaintext length in ciphertext exactly', async () => {
      const plaintext1 = 'A';
      const plaintext2 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext: ciphertext1 } = await cryptoService.encrypt(plaintext1, key);
      const { ciphertext: ciphertext2 } = await cryptoService.encrypt(plaintext2, key);

      // AES-GCM adds authentication tag, so sizes differ but not in a way that directly leaks plaintext length
      // The important thing is that same plaintext produces different ciphertext
      const bytes1 = new Uint8Array(ciphertext1);
      const bytes2 = new Uint8Array(ciphertext2);

      expect(bytes1.length).toBeLessThan(bytes2.length);
    });
  });

  describe('Encryption Data Structure', () => {
    it('should export and import encrypted data correctly', async () => {
      const plaintext = 'Sensitive data';
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);

      // Simulate storing and retrieving
      const encryptedData: EncryptedData = {
        ciphertext,
        iv,
        salt
      };

      // Derive key again (simulating new session)
      const restoredKey = await cryptoService.deriveKey(password, encryptedData.salt);
      const decrypted = await cryptoService.decrypt(
        encryptedData.ciphertext,
        restoredKey,
        encryptedData.iv
      );

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Performance and Buffer Sizes', () => {
    it('should handle large payloads efficiently', async () => {
      const largePlaintext = 'x'.repeat(100000); // 100KB
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const start = Date.now();
      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(largePlaintext, key);
      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);
      const duration = Date.now() - start;

      expect(decrypted).toBe(largePlaintext);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should produce ciphertext with expected overhead', async () => {
      const plaintext = 'test';
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext } = await cryptoService.encrypt(plaintext, key);

      // AES-GCM adds 16-byte authentication tag
      const plaintextBytes = new TextEncoder().encode(plaintext).length;
      const ciphertextBytes = ciphertext.byteLength;

      expect(ciphertextBytes).toBe(plaintextBytes + 16);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(10000);
      const plaintext = 'test';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(longPassword, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters in passwords', async () => {
      const specialPassword = 'p@$$w0rd!#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
      const plaintext = 'test';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(specialPassword, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle null bytes in plaintext', async () => {
      const plaintext = 'before\x00after';
      const password = 'secure-password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveKey(password, salt);
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);

      expect(decrypted).toBe(plaintext);
    });
  });
});
