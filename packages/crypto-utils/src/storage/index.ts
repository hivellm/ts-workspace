/**
 * @fileoverview Secure Key Storage Service
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';
import * as secp256k1 from '@noble/secp256k1';
import { ECCService } from '../ecc/index.js';
import type {
  ECCKeyPair,
  KeyStorageEntry,
  KeyMetadata,
  ModelIdentity
} from '@cmmv-hive/shared-types';

/**
 * Secure Key Storage Service
 * Provides encrypted storage and management of cryptographic keys
 */
export class SecureKeyStorage {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 12; // AES-GCM recommended IV length
  private static readonly SALT_LENGTH = 32;
  private static readonly TAG_LENGTH = 16;
  private static readonly PBKDF2_ITERATIONS = 100000;

  private static inMemoryStorage = new Map<string, KeyStorageEntry>();

  /**
   * Store an encrypted private key
   */
  static async storePrivateKey(
    keyId: string,
    privateKey: Uint8Array,
    passphrase: string,
    metadata: Partial<KeyMetadata> = {}
  ): Promise<void> {
    const salt = randomBytes(this.SALT_LENGTH);

    // Derive encryption key from passphrase
    const encryptionKey = pbkdf2Sync(
      passphrase,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      'sha256'
    );

    const iv = randomBytes(this.IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(this.ALGORITHM, encryptionKey, iv);

    // Encrypt the private key
    const encryptedKey = Buffer.concat([
      cipher.update(privateKey),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Store the encrypted key with metadata
    const storageEntry: KeyStorageEntry = {
      keyId,
      encryptedPrivateKey: Buffer.concat([
        salt,
        iv,
        authTag,
        encryptedKey
      ]).toString('base64'),
      publicKey: Buffer.from(await this.derivePublicKey(privateKey)).toString('hex'),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year
      metadata: {
        purpose: 'signing',
        algorithm: 'secp256k1',
        keySize: 256,
        usageCount: 0,
        ...metadata,
      },
    };

    this.inMemoryStorage.set(keyId, storageEntry);
  }

  /**
   * Retrieve and decrypt a private key
   */
  static async retrievePrivateKey(
    keyId: string,
    passphrase: string
  ): Promise<Uint8Array> {
    const entry = this.inMemoryStorage.get(keyId);
    if (!entry) {
      throw new Error(`Key ${keyId} not found`);
    }

    // Check if key has expired
    if (new Date() > entry.expiresAt) {
      throw new Error(`Key ${keyId} has expired`);
    }

    try {
      const encryptedData = Buffer.from(entry.encryptedPrivateKey, 'base64');

      // Extract components
      const salt = encryptedData.subarray(0, this.SALT_LENGTH);
      const iv = encryptedData.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const authTag = encryptedData.subarray(
        this.SALT_LENGTH + this.IV_LENGTH,
        this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH
      );
      const encryptedKey = encryptedData.subarray(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);

      // Derive decryption key
      const decryptionKey = pbkdf2Sync(
        passphrase,
        salt,
        this.PBKDF2_ITERATIONS,
        this.KEY_LENGTH,
        'sha256'
      );

      // Create decipher
      const decipher = createDecipheriv(this.ALGORITHM, decryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the private key
      const decryptedKey = Buffer.concat([
        decipher.update(encryptedKey),
        decipher.final()
      ]);

      // Update usage metadata (create new object to avoid readonly issues)
      entry.metadata = {
        ...entry.metadata,
        usageCount: entry.metadata.usageCount + 1,
        lastUsed: new Date(),
      };

      return new Uint8Array(decryptedKey);
    } catch (error) {
      throw new Error(`Failed to decrypt key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rotate a key pair with new expiration
   */
  static async rotateKeyPair(
    oldKeyId: string,
    passphrase: string,
    newPassphrase?: string
  ): Promise<ModelIdentity> {
    // Retrieve the old key
    const oldPrivateKey = await this.retrievePrivateKey(oldKeyId, passphrase);

    // Generate new key pair
    const newKeyPair = await ECCService.generateKeyPair();

    // Store the new key
    const newKeyId = `rotated-${Date.now()}`;
    await this.storePrivateKey(
      newKeyId,
      newKeyPair.privateKey,
      newPassphrase || passphrase,
      {
        purpose: 'signing',
        algorithm: 'secp256k1',
        keySize: 256,
        usageCount: 0,
      }
    );

    // Create new model identity
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));

    const modelIdentity = {
      modelName: `rotated-model-${newKeyId}`,
      provider: 'cmmv-hive',
      publicKey: Buffer.from(newKeyPair.publicKey).toString('hex'),
      keyId: newKeyId,
      createdAt: now,
      expiresAt,
      signature: '', // Would be set by SignatureService
    };

    // Remove old key
    this.inMemoryStorage.delete(oldKeyId);

    return modelIdentity;
  }

  /**
   * List all stored keys
   */
  static async listStoredKeys(): Promise<ModelIdentity[]> {
    const identities: ModelIdentity[] = [];

    for (const [keyId, entry] of this.inMemoryStorage.entries()) {
      identities.push({
        modelName: `stored-model-${keyId}`,
        provider: 'cmmv-hive',
        publicKey: entry.publicKey,
        keyId,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        signature: '', // Not stored for security
      });
    }

    return identities;
  }

  /**
   * Delete a stored key
   */
  static async deleteKey(keyId: string): Promise<boolean> {
    return this.inMemoryStorage.delete(keyId);
  }

  /**
   * Get key metadata without decrypting
   */
  static async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    const entry = this.inMemoryStorage.get(keyId);
    return entry ? entry.metadata : null;
  }

  /**
   * Check if a key exists and is valid
   */
  static async keyExists(keyId: string): Promise<boolean> {
    const entry = this.inMemoryStorage.get(keyId);
    if (!entry) return false;

    // Check if key has expired
    return new Date() <= entry.expiresAt;
  }

  /**
   * Get storage statistics
   */
  static getStorageStats(): {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    totalUsage: number;
  } {
    const now = new Date();
    let activeKeys = 0;
    let expiredKeys = 0;
    let totalUsage = 0;

    for (const entry of this.inMemoryStorage.values()) {
      if (now > entry.expiresAt) {
        expiredKeys++;
      } else {
        activeKeys++;
      }
      totalUsage += entry.metadata.usageCount;
    }

    return {
      totalKeys: this.inMemoryStorage.size,
      activeKeys,
      expiredKeys,
      totalUsage,
    };
  }

  /**
   * Clean up expired keys
   */
  static cleanupExpiredKeys(): number {
    const now = new Date();
    let removedCount = 0;

    for (const [keyId, entry] of this.inMemoryStorage.entries()) {
      if (now > entry.expiresAt) {
        this.inMemoryStorage.delete(keyId);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Derive public key from private key
   */
  private static async derivePublicKey(privateKey: Uint8Array): Promise<Uint8Array> {
    return secp256k1.getPublicKey(privateKey, true);
  }
}

// Re-export for convenience
export { ECCService } from '../ecc/index.js';
export { SignatureService } from '../signature/index.js';
