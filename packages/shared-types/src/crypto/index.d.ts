/**
 * @fileoverview Cryptography-related TypeScript types for CMMV-Hive
 * @author CMMV-Hive Team
 * @version 1.0.0
 */
/**
 * ECC key pair for digital signatures
 */
export interface ECCKeyPair {
    /** Private key as byte array */
    readonly privateKey: Uint8Array;
    /** Public key as byte array */
    readonly publicKey: Uint8Array;
}
/**
 * ECC signature components
 */
export interface ECCSignature {
    /** R component of signature */
    readonly r: Uint8Array | bigint;
    /** S component of signature */
    readonly s: Uint8Array | bigint;
    /** Recovery ID for public key recovery */
    readonly recovery: number;
}
/**
 * Compact signature representation
 */
export interface CompactSignature {
    /** Compact signature bytes (64 bytes) */
    readonly signature: Uint8Array;
    /** Recovery ID */
    readonly recovery: number;
}
/**
 * Key storage entry
 */
export interface KeyStorageEntry {
    /** Unique key identifier */
    readonly keyId: string;
    /** Encrypted private key */
    readonly encryptedPrivateKey: string;
    /** Associated public key */
    readonly publicKey: string;
    /** Key creation timestamp */
    readonly createdAt: Date;
    /** Key expiration timestamp */
    readonly expiresAt: Date;
    /** Key usage metadata */
    metadata: KeyMetadata;
}
/**
 * Metadata for stored keys
 */
export interface KeyMetadata {
    /** Purpose of the key */
    readonly purpose: 'signing' | 'encryption' | 'authentication';
    /** Algorithm used */
    readonly algorithm: 'secp256k1' | 'ed25519';
    /** Key size in bits */
    readonly keySize: number;
    /** Associated model identity */
    readonly modelId?: string;
    /** Usage count */
    readonly usageCount: number;
    /** Last used timestamp */
    readonly lastUsed?: Date;
}
/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
    /** Whether signature is valid */
    readonly isValid: boolean;
    /** Error message if verification failed */
    readonly error?: string;
    /** Verification timestamp */
    readonly verifiedAt: Date;
    /** Time taken for verification in milliseconds */
    readonly verificationTimeMs: number;
}
/**
 * Message to be signed
 */
export interface SignableMessage {
    /** Message content */
    readonly content: string;
    /** Message type for context */
    readonly type: 'vote' | 'proposal' | 'authentication' | 'general';
    /** Additional context data */
    readonly context?: Record<string, unknown>;
    /** Timestamp when message was created */
    readonly timestamp: Date;
}
/**
 * Signed message with signature
 */
export interface SignedMessage extends SignableMessage {
    /** Digital signature */
    readonly signature: ECCSignature;
    /** Signer's public key */
    readonly signerPublicKey: Uint8Array;
    /** Signature timestamp */
    readonly signedAt: Date;
}
/**
 * Authentication token
 */
export interface AuthToken {
    /** Token value */
    readonly token: string;
    /** Token type */
    readonly type: 'bearer' | 'api_key';
    /** Expiration timestamp */
    readonly expiresAt: Date;
    /** Associated model identity */
    readonly modelId: string;
    /** Token scope/permissions */
    readonly scope: readonly string[];
}
/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
    /** Salt for key derivation */
    readonly salt: Uint8Array;
    /** Number of iterations */
    readonly iterations: number;
    /** Memory cost for scrypt */
    readonly memoryFactor?: number;
    /** Parallelization factor */
    readonly parallelizationFactor?: number;
    /** Derived key length */
    readonly keyLength: number;
}
/**
 * Encryption result
 */
export interface EncryptionResult {
    /** Encrypted data */
    readonly encryptedData: Uint8Array;
    /** Initialization vector */
    readonly iv: Uint8Array;
    /** Authentication tag for AEAD */
    readonly authTag?: Uint8Array;
    /** Encryption algorithm used */
    readonly algorithm: string;
}
/**
 * Hash result with metadata
 */
export interface HashResult {
    /** Hash value */
    readonly hash: Uint8Array;
    /** Hash algorithm used */
    readonly algorithm: 'sha256' | 'sha3-256' | 'blake2b';
    /** Original data length */
    readonly dataLength: number;
    /** Hash timestamp */
    readonly hashedAt: Date;
}
/**
 * Cryptographic operation context
 */
export interface CryptoContext {
    /** Operation being performed */
    readonly operation: 'sign' | 'verify' | 'encrypt' | 'decrypt' | 'hash';
    /** Algorithm configuration */
    readonly algorithm: string;
    /** Additional parameters */
    readonly parameters?: Record<string, unknown>;
    /** Security level required */
    readonly securityLevel: 'standard' | 'high' | 'maximum';
}
//# sourceMappingURL=index.d.ts.map