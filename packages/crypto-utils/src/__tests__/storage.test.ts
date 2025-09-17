/**
 * @fileoverview SecureKeyStorage Tests
 */

import { describe, it, expect } from 'vitest';
import { SecureKeyStorage } from '../storage/index.js';
import { ECCService } from '../ecc/index.js';

describe('SecureKeyStorage', () => {
  it('should store and retrieve a private key', async () => {
    const keyPair = await ECCService.generateKeyPair();
    const keyId = 'test-key-1';
    const pass = 'strong-passphrase';
    await SecureKeyStorage.storePrivateKey(keyId, keyPair.privateKey, pass);

    const retrieved = await SecureKeyStorage.retrievePrivateKey(keyId, pass);
    expect(retrieved).toBeInstanceOf(Uint8Array);
    expect(retrieved.length).toBe(32);
  });

  it('should fail with wrong passphrase', async () => {
    const keyPair = await ECCService.generateKeyPair();
    const keyId = 'test-key-2';
    await SecureKeyStorage.storePrivateKey(keyId, keyPair.privateKey, 'pass-a');
    await expect(SecureKeyStorage.retrievePrivateKey(keyId, 'pass-b')).rejects.toBeInstanceOf(Error);
  });

  it('should rotate a key pair and list stored keys', async () => {
    const keyPair = await ECCService.generateKeyPair();
    const keyId = 'test-key-3';
    const pass = 'rotate-pass';
    await SecureKeyStorage.storePrivateKey(keyId, keyPair.privateKey, pass);

    const identity = await SecureKeyStorage.rotateKeyPair(keyId, pass);
    expect(identity.keyId).toContain('rotated-');

    const list = await SecureKeyStorage.listStoredKeys();
    expect(list.length).toBeGreaterThan(0);
  });
});


