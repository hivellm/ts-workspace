/**
 * @fileoverview CMMV-Hive Cryptography Utilities
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

// Core ECC operations
export { ECCService } from './ecc/index.js';

// Digital signature service
export { SignatureService } from './signature/index.js';

// Secure key storage
export { SecureKeyStorage } from './storage/index.js';

// Vote hash service for standardized SHA256 generation
export { VoteHashService } from './hash.js';

// Re-export shared types for convenience
export type {
  ECCKeyPair,
  ECCSignature,
  CompactSignature,
  ModelIdentity,
  SignableMessage,
  SignedMessage,
  SignatureVerificationResult,
  KeyStorageEntry,
  KeyMetadata,
} from '@cmmv-hive/shared-types';
