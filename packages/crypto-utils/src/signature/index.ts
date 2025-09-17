/**
 * @fileoverview Digital Signature Service
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

import { ECCService } from '../ecc/index.js';
import { createHash } from 'crypto';
import type {
  ECCKeyPair,
  ECCSignature,
  ModelIdentity,
  SignableMessage,
  SignedMessage,
  SignatureVerificationResult
} from '@cmmv-hive/shared-types';

/**
 * Digital Signature Service for AI Model Authentication
 * Provides high-level interface for model identity and signature operations
 */
export class SignatureService {
  private static readonly KEY_EXPIRATION_DAYS = 365; // 1 year

  /**
   * Create a new model identity with cryptographic keys
   */
  static async createModelIdentity(modelName: string, provider: string = 'unknown'): Promise<ModelIdentity> {
    const keyPair = await ECCService.generateKeyPair();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.KEY_EXPIRATION_DAYS * 24 * 60 * 60 * 1000));

    // Create self-signed identity
    const identityData = JSON.stringify({
      modelName,
      provider,
      publicKey: Array.from(keyPair.publicKey),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    const signature = await ECCService.signMessage(identityData, keyPair.privateKey);

    // Create identity signature in compact format
    const identitySignature = ECCService.signatureToCompact(signature);

    return {
      modelName,
      provider,
      publicKey: Array.from(keyPair.publicKey).map(b => b.toString(16).padStart(2, '0')).join(''),
      keyId: this.generateKeyId(keyPair.publicKey),
      createdAt: now,
      expiresAt,
      signature: Array.from(identitySignature.signature).map(b => b.toString(16).padStart(2, '0')).join(''),
    };
  }

  /**
   * Sign a message on behalf of a model
   */
  static async signMessage(
    content: string,
    privateKey: Uint8Array,
    type: SignableMessage['type'] = 'general',
    context?: Record<string, unknown>
  ): Promise<SignedMessage> {
    const signableMessage = ECCService.createSignableMessage(content, type, context);
    return ECCService.signCompleteMessage(signableMessage, privateKey);
  }

  /**
   * Verify a signature against a model identity
   */
  static async verifySignature(
    signedMessage: SignedMessage,
    modelIdentity: ModelIdentity
  ): Promise<SignatureVerificationResult> {
    try {
      // Convert hex strings back to Uint8Array
      const publicKey = new Uint8Array(
        modelIdentity.publicKey.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) ?? []
      );

      if (!ECCService.isValidPublicKey(publicKey)) {
        return {
          isValid: false,
          error: 'Invalid public key format',
          verifiedAt: new Date(),
          verificationTimeMs: 0,
        };
      }

      return ECCService.verifySignedMessage(signedMessage, publicKey);
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Signature verification failed',
        verifiedAt: new Date(),
        verificationTimeMs: 0,
      };
    }
  }

  /**
   * Verify model identity authenticity
   */
  static async verifyModelIdentity(identity: ModelIdentity): Promise<boolean> {
    try {
      // Check if key has expired
      if (new Date() > identity.expiresAt) {
        return false;
      }

      // Convert hex strings to Uint8Array
      const publicKey = new Uint8Array(
        identity.publicKey.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) ?? []
      );

      const signatureBytes = new Uint8Array(
        identity.signature.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) ?? []
      );

      if (signatureBytes.length !== 64) {
        return false;
      }

      // Recreate the identity data that was signed
      const identityData = JSON.stringify({
        modelName: identity.modelName,
        provider: identity.provider,
        publicKey: Array.from(publicKey),
        createdAt: identity.createdAt.toISOString(),
        expiresAt: identity.expiresAt.toISOString(),
      });

      // Reconstruct signature from stored format
      const signature: ECCSignature = {
        r: signatureBytes.slice(0, 32),
        s: signatureBytes.slice(32, 64),
        recovery: 0, // For self-signed, we need to try both
      };

      // Try verification with recovery = 0 and 1
      for (let recovery = 0; recovery <= 1; recovery++) {
        const testSignature = { ...signature, recovery };
        const result = await ECCService.verifySignature(identityData, testSignature, publicKey);
        if (result.isValid) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Create a vote signature for governance
   */
  static async createVoteSignature(
    proposalId: string,
    weight: number,
    modelIdentity: ModelIdentity,
    privateKey: Uint8Array
  ): Promise<SignedMessage> {
    const voteData = JSON.stringify({
      proposalId,
      weight,
      modelId: modelIdentity.modelName,
      timestamp: new Date().toISOString(),
    });

    return this.signMessage(
      voteData,
      privateKey,
      'vote',
      { proposalId, weight, justification: 'Automated vote signature' }
    );
  }

  /**
   * Batch verify multiple signatures
   */
  static async batchVerifySignatures(
    signedMessages: SignedMessage[],
    modelIdentities: ModelIdentity[]
  ): Promise<SignatureVerificationResult[]> {
    const results: SignatureVerificationResult[] = [];

    // Create a map for faster lookups
    const identityMap = new Map(
      modelIdentities.map(identity => [identity.modelName, identity])
    );

    // Process in parallel for better performance
    const promises = signedMessages.map(async (message) => {
      const identity = identityMap.get(message.context?.modelId as string);
      if (!identity) {
        return {
          isValid: false,
          error: 'Model identity not found',
          verifiedAt: new Date(),
          verificationTimeMs: 0,
        };
      }
      return this.verifySignature(message, identity);
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    return results;
  }

  /**
   * Generate a unique key identifier from public key
   */
  private static generateKeyId(publicKey: Uint8Array): string {
    // SHA-256(publicKey) truncated to 16 bytes (32 hex chars)
    const digest = createHash('sha256').update(publicKey).digest();
    return digest.subarray(0, 16).toString('hex');
  }

  /**
   * Get signature statistics for performance monitoring
   */
  static async getSignatureStats(
    signedMessages: SignedMessage[],
    modelIdentities: ModelIdentity[]
  ): Promise<{
    totalMessages: number;
    validSignatures: number;
    invalidSignatures: number;
    averageVerificationTime: number;
    successRate: number;
  }> {
    const results = await this.batchVerifySignatures(signedMessages, modelIdentities);

    const validCount = results.filter(r => r.isValid).length;
    const totalTime = results.reduce((sum, r) => sum + r.verificationTimeMs, 0);
    const averageTime = results.length > 0 ? totalTime / results.length : 0;

    return {
      totalMessages: signedMessages.length,
      validSignatures: validCount,
      invalidSignatures: results.length - validCount,
      averageVerificationTime: Math.round(averageTime * 100) / 100,
      successRate: results.length > 0 ? (validCount / results.length) * 100 : 0,
    };
  }
}
