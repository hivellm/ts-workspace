/**
 * @fileoverview ECC Cryptography Tests
 * @author CMMV-Hive Team
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ECCService } from '../ecc/index.js';

const TEST_MSG = 'Hello, CMMV-Hive!';

describe('ECCService', () => {
  let keyPair: Awaited<ReturnType<typeof ECCService.generateKeyPair>>;

  beforeAll(async () => {
    keyPair = await ECCService.generateKeyPair();
  });

  describe('Key Generation', () => {
    it('should generate valid key pair', () => {
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey.length).toBe(32);
      expect(keyPair.publicKey.length).toBe(33); // compressed format
    });

    it('should generate deterministic key pair from seed', () => {
      const seed = 'test-seed-for-deterministic-key';
      const deterministicKeyPair = ECCService.generateDeterministicKeyPair(seed);

      expect(deterministicKeyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(deterministicKeyPair.publicKey).toBeInstanceOf(Uint8Array);

      // Should generate same key for same seed
      const sameKeyPair = ECCService.generateDeterministicKeyPair(seed);
      expect(deterministicKeyPair.privateKey).toEqual(sameKeyPair.privateKey);
      expect(deterministicKeyPair.publicKey).toEqual(sameKeyPair.publicKey);
    });
  });

  describe('Key Validation', () => {
    it('should validate correct private key', () => {
      const isValid = ECCService.isValidPrivateKey(keyPair.privateKey);
      expect(isValid).toBe(true);
    });

    it('should validate correct public key', () => {
      const isValid = ECCService.isValidPublicKey(keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should reject invalid private key', () => {
      const invalidKey = new Uint8Array(32);
      const isValid = ECCService.isValidPrivateKey(invalidKey);
      expect(isValid).toBe(false);
    });

    it('should reject invalid public key', () => {
      const invalidKey = new Uint8Array(33);
      const isValid = ECCService.isValidPublicKey(invalidKey);
      expect(isValid).toBe(false);
    });
  });

  describe('Digital Signatures', () => {
    const testMessage = TEST_MSG;

    it('should sign and verify message correctly', async () => {
      const signature = await ECCService.signMessage(testMessage, keyPair.privateKey);
      const verification = await ECCService.verifySignature(testMessage, signature, keyPair.publicKey);

      expect(signature.r).toBeInstanceOf(Uint8Array);
      expect(signature.s).toBeInstanceOf(Uint8Array);
      expect(signature.recovery).toBeGreaterThanOrEqual(0);
      expect(signature.recovery).toBeLessThanOrEqual(1);

      expect(verification.isValid).toBe(true);
      expect(verification.verificationTimeMs).toBeGreaterThan(0);
    });

    it('should reject tampered message', async () => {
      const signature = await ECCService.signMessage(testMessage, keyPair.privateKey);
      const tamperedMessage = testMessage + 'tampered';
      const verification = await ECCService.verifySignature(tamperedMessage, signature, keyPair.publicKey);

      expect(verification.isValid).toBe(false);
    });

    it('should reject signature with wrong public key', async () => {
      const signature = await ECCService.signMessage(testMessage, keyPair.privateKey);
      // Use deterministic different seed to guarantee a different key under mocked RNG
      const wrongKeyPair = ECCService.generateDeterministicKeyPair('wrong-key-seed-001');
      const verification = await ECCService.verifySignature(testMessage, signature, wrongKeyPair.publicKey);

      expect(verification.isValid).toBe(false);
    });
  });

  describe('Signable Messages', () => {
    const testMessage = 'Test governance message';

    it('should create and sign complete message', async () => {
      const signableMessage = ECCService.createSignableMessage(testMessage, 'vote', {
        proposalId: 'test-001',
        weight: 8
      });

      expect(signableMessage.content).toBe(testMessage);
      expect(signableMessage.type).toBe('vote');
      expect(signableMessage.context).toEqual({
        proposalId: 'test-001',
        weight: 8
      });
      expect(signableMessage.timestamp).toBeInstanceOf(Date);

      const signedMessage = await ECCService.signCompleteMessage(signableMessage, keyPair.privateKey);

      expect(signedMessage.signature).toBeDefined();
      expect(signedMessage.signedAt).toBeInstanceOf(Date);

      const verification = await ECCService.verifySignedMessage(signedMessage, keyPair.publicKey);
      expect(verification.isValid).toBe(true);
    });
  });

  describe('Signature Format Conversion', () => {
    const testMessage = TEST_MSG;
    it('should convert signature to compact format', async () => {
      const signature = await ECCService.signMessage(testMessage, keyPair.privateKey);
      const compact = ECCService.signatureToCompact(signature);

      expect(compact.signature).toBeInstanceOf(Uint8Array);
      expect(compact.signature.length).toBe(64);
      expect(compact.recovery).toBe(signature.recovery);
    });

    it('should convert compact signature back to full format', async () => {
      const signature = await ECCService.signMessage(testMessage, keyPair.privateKey);
      const compact = ECCService.signatureToCompact(signature);
      const restored = ECCService.compactToSignature(compact);

      expect(restored.r).toEqual(signature.r);
      expect(restored.s).toEqual(signature.s);
      expect(restored.recovery).toBe(signature.recovery);
    });

    it('should convert signature to DER and back', async () => {
      const signature = await ECCService.signMessage(testMessage, keyPair.privateKey);
      const der = ECCService.signatureToDER(signature);
      const restored = ECCService.derToSignature(der, signature.recovery);

      expect(restored.r).toEqual(signature.r);
      expect(restored.s).toEqual(signature.s);
      const verification = await ECCService.verifySignature(testMessage, restored, keyPair.publicKey);
      expect(verification.isValid).toBe(true);
    });
  });

  describe('Public Key Recovery', () => {
    const testMessage = TEST_MSG;
    it('should recover public key from signature', async () => {
      const signature = await ECCService.signMessage(testMessage, keyPair.privateKey);
      const recoveredKey = await ECCService.recoverPublicKey(testMessage, signature);

      expect(recoveredKey).toEqual(keyPair.publicKey);
    });
  });
});
