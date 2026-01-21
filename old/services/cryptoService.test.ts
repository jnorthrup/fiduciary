
import { describe, it, expect, beforeEach } from 'vitest';
import { cryptoService } from './cryptoService';

describe('CryptoService', () => {
    const password = 'extremely-secret-password';
    const testData = 'Hello, encrypted world!';

    it('should encrypt and decrypt data correctly', async () => {
        const salt = cryptoService.generateSalt();
        const key = await cryptoService.deriveKey(password, salt);

        const { ciphertext, iv } = await cryptoService.encrypt(testData, key);

        expect(ciphertext).toBeDefined();
        expect(ciphertext.byteLength).toBeGreaterThan(0);

        const decrypted = await cryptoService.decrypt(ciphertext, key, iv);
        expect(decrypted).toBe(testData);
    });

    it('should fail to decrypt with the wrong key', async () => {
        const salt = cryptoService.generateSalt();
        const key = await cryptoService.deriveKey(password, salt);
        const wrongKey = await cryptoService.deriveKey('wrong-password', salt);

        const { ciphertext, iv } = await cryptoService.encrypt(testData, key);

        await expect(cryptoService.decrypt(ciphertext, wrongKey, iv))
            .rejects.toThrow();
    });

    it('should derive the same key for the same password and salt', async () => {
        const salt = cryptoService.generateSalt();
        const key1 = await cryptoService.deriveKey(password, salt);
        const key2 = await cryptoService.deriveKey(password, salt);

        const data = await cryptoService.encrypt(testData, key1);
        const decrypted = await cryptoService.decrypt(data.ciphertext, key2, data.iv);

        expect(decrypted).toBe(testData);
    });
});
