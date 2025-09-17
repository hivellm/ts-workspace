/**
 * @fileoverview Mock crypto data for testing
 * @author CMMV-Hive Team
 */

import type {
  ECCKeyPair,
  ECCSignature,
  ModelIdentity
} from '@cmmv-hive/shared-types';

export const createMockKeyPair = (): ECCKeyPair => ({
  privateKey: new Uint8Array(32).fill(1),
  publicKey: new Uint8Array(33).fill(2),
});

export const createMockSignature = (): ECCSignature => ({
  r: new Uint8Array(32).fill(3),
  s: new Uint8Array(32).fill(4),
  recovery: 0,
});

export const createMockModelIdentityForCrypto = (): ModelIdentity => ({
  modelName: 'crypto-test-model',
  provider: 'test-crypto-provider',
  publicKey: Buffer.from(new Uint8Array(33).fill(2)).toString('hex'),
  keyId: 'crypto-test-key-id',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  expiresAt: new Date('2026-01-01T00:00:00Z'),
  signature: 'crypto-mock-signature',
});
