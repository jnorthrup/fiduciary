
/**
 * CryptoService provides AES-GCM encryption and decryption 
 * for local-first persistence (IndexedDB).
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // Standard for AES-GCM
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedData {
    ciphertext: ArrayBuffer;
    iv: Uint8Array;
    salt: Uint8Array;
}

export class CryptoService {
    /**
     * Derives an AES-GCM key from a password and salt using PBKDF2.
     */
    async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const encoder = new TextEncoder();
        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt as any,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256',
            },
            baseKey,
            { name: ALGORITHM, length: KEY_LENGTH },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypts a string into ciphertext.
     */
    async encrypt(data: string, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
        const encoder = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: ALGORITHM, iv: iv as any },
            key,
            encoder.encode(data)
        );

        return { ciphertext, iv };
    }

    /**
     * Decrypts a ciphertext back into a string.
     */
    async decrypt(ciphertext: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
        const decrypted = await window.crypto.subtle.decrypt(
            { name: ALGORITHM, iv: iv as any },
            key,
            ciphertext
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    /**
     * Generates a random salt.
     */
    generateSalt(): Uint8Array {
        return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH)) as any;
    }
}

export const cryptoService = new CryptoService();
