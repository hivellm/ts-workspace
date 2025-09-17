/**
 * @fileoverview SignatureService Tests
 */

import { describe, it, expect } from 'vitest';
import { SignatureService } from '../signature/index.js';
import { ECCService } from '../ecc/index.js';

describe('SignatureService', () => {
  it('should create and verify model identity', async () => {
    const identity = await SignatureService.createModelIdentity('model-A', 'provider-x');
    const isValid = await SignatureService.verifyModelIdentity(identity);
    expect(isValid).toBe(true);
  });

  it('should sign and verify message for a model', async () => {
    const keyPair = await ECCService.generateKeyPair();
    const message = 'sign this payload';
    const signed = await SignatureService.signMessage(message, keyPair.privateKey, 'general');
    const verification = await ECCService.verifySignedMessage(signed, keyPair.publicKey);
    expect(verification.isValid).toBe(true);
  });
});


