/**
 * @fileoverview ECC Cryptography Core Implementation
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

import * as secp256k1 from '@noble/secp256k1';
import { webcrypto as nodeWebCrypto } from 'crypto';
import { createHash, createHmac, randomBytes } from 'crypto';
import type {
  ECCKeyPair,
  ECCSignature,
  CompactSignature,
  SignableMessage,
  SignedMessage,
  SignatureVerificationResult
} from '@cmmv-hive/shared-types';

/**
 * Core ECC Cryptography Service
 * Implements secp256k1 elliptic curve operations for digital signatures
 */
export class ECCService {
  private static readonly CURVE_ORDER = secp256k1.CURVE.n;

  // Ensure noble-secp256k1 has sync hash providers configured (required in v2)
  // Use Node's crypto for SHA-256 and HMAC-SHA256
  // This setup is idempotent and safe to run multiple times
  /* eslint-disable */
  private static ensureHashProvidersConfigured(): void {
    // @ts-expect-error etc is a stable internal API for configuring hashes
    if (!secp256k1.etc?.sha256Sync) {
      // @ts-expect-error etc is available at runtime
      secp256k1.etc.sha256Sync = (msg: Uint8Array): Uint8Array => {
        const hash = createHash('sha256');
        hash.update(msg);
        return new Uint8Array(hash.digest());
      };
    }
    if ('etc' in secp256k1 && secp256k1.etc && !secp256k1.etc.hmacSha256Sync) {
      const etc = secp256k1.etc as any;
      etc.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]): Uint8Array => {
        const h = createHmac('sha256', key);
        for (const m of messages) h.update(m);
        return new Uint8Array(h.digest());
      };
    }
  }
  /* eslint-enable */

  /** Encode signature (r,s) to DER format */
  static signatureToDER(signature: ECCSignature): Uint8Array {
    const r = signature.r instanceof Uint8Array ? signature.r : ECCService.bigintToBytes(signature.r as bigint);
    const s = signature.s instanceof Uint8Array ? signature.s : ECCService.bigintToBytes(signature.s as bigint);
    const der = ECCService.encodeDER(r, s);
    return der;
  }

  /** Decode DER-encoded signature into (r,s) */
  static derToSignature(der: Uint8Array, recovery: number = 0): ECCSignature {
    const { r, s } = ECCService.decodeDER(der);
    return { r, s, recovery };
  }

  private static bigintToBytes(n: bigint): Uint8Array {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[31 - i] = Number((n >> BigInt(i * 8)) & 0xffn);
    return out;
  }

  // Minimal DER encoder for ECDSA (two INTEGERs inside a SEQUENCE)
  private static encodeDER(r: Uint8Array, s: Uint8Array): Uint8Array {
    const encInt = (x: Uint8Array) => {
      let v = x;
      // Trim leading zeros
      while (v.length > 1 && v[0] === 0) v = v.slice(1);
      // If high bit set, prepend 0x00
      if (v.length > 0 && (v[0] ?? 0) & 0x80) v = Uint8Array.from([0, ...v]);
      return Uint8Array.from([0x02, v.length, ...v]);
    };
    const R = encInt(r);
    const S = encInt(s);
    const len = R.length + S.length;
    return Uint8Array.from([0x30, len, ...R, ...S]);
  }

  private static decodeDER(der: Uint8Array): { r: Uint8Array; s: Uint8Array } {
    if (der[0] !== 0x30) throw new Error('Invalid DER: expected SEQUENCE');
    const total = der[1];
    let off = 2;
    const readInt = () => {
      if (off >= der.length || der[off] !== 0x02) throw new Error('Invalid DER: expected INTEGER');
      off++;
      if (off >= der.length) throw new Error('Invalid DER: no length');
      const len = der[off++];
      if (len === undefined || off + len > der.length) throw new Error('Invalid DER: length exceeds data');
      const v = der.slice(off, off + len);
      off += len;
      // Remove possible leading 0x00
      return v[0] === 0x00 ? v.slice(1) : v;
    };
    const r = readInt();
    const s = readInt();
    if (total !== undefined && off !== 2 + total) throw new Error('Invalid DER: length mismatch');
    // Left pad to 32 bytes
    const pad = (x: Uint8Array) => (x.length < 32 ? Uint8Array.from([...new Uint8Array(32 - x.length), ...x]) : x);
    return { r: pad(r), s: pad(s) };
  }

  /**
   * Generate a cryptographically secure ECC key pair
   */
  static async generateKeyPair(): Promise<ECCKeyPair> {
    // Generate secure random private key
    const privateKey = secp256k1.utils.randomPrivateKey();

    // Derive public key from private key
    const publicKey = secp256k1.getPublicKey(privateKey, true); // compressed

    return {
      privateKey: new Uint8Array(privateKey),
      publicKey: new Uint8Array(publicKey),
    };
  }

  /**
   * Sign a message using ECDSA with deterministic nonce
   */
  static async signMessage(
    message: string | Uint8Array,
    privateKey: Uint8Array
  ): Promise<ECCSignature> {
    this.ensureHashProvidersConfigured();
    // Convert message to bytes if needed
    const messageBytes = typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message;

    // Hash the message using SHA-256
    const buffer = messageBytes.buffer instanceof ArrayBuffer
      ? messageBytes.buffer.slice(messageBytes.byteOffset, messageBytes.byteOffset + messageBytes.byteLength)
      : messageBytes.slice();
    const subtle = (globalThis as any).crypto?.subtle ?? nodeWebCrypto?.subtle;
    if (!subtle) throw new Error('WebCrypto subtle API not available for hashing');
    const messageHash = await subtle.digest('SHA-256', buffer);
    const messageHashArray = new Uint8Array(messageHash);

    // Sign using deterministic nonce (RFC 6979)
    const sigObj: any = secp256k1.sign(messageHashArray, privateKey);
    const rBytes = new Uint8Array(32).map((_, i) => Number((sigObj.r as bigint >> BigInt((31 - i) * 8)) & 0xffn));
    const sBytes = new Uint8Array(32).map((_, i) => Number((sigObj.s as bigint >> BigInt((31 - i) * 8)) & 0xffn));

    // Derive recovery id by matching recovered public key to the signer public key
    const compact = new Uint8Array([...rBytes, ...sBytes]);
    const sig = secp256k1.Signature.fromCompact(compact);
    const signerPub = secp256k1.getPublicKey(privateKey, true);
    let recid = 0;
    for (let i = 0; i <= 3; i++) {
      try {
        const rec = secp256k1.Signature
          .fromCompact(compact)
          .addRecoveryBit(i)
          .recoverPublicKey(messageHashArray)
          .toRawBytes(true);
        if (Buffer.from(rec).equals(Buffer.from(signerPub))) {
          recid = i;
          break;
        }
      } catch {
        // ignore and try next
      }
    }

    return { r: rBytes, s: sBytes, recovery: recid };
  }

  /**
   * Verify an ECDSA signature
   */
  static async verifySignature(
    message: string | Uint8Array,
    signature: ECCSignature,
    publicKey: Uint8Array
  ): Promise<SignatureVerificationResult> {
    this.ensureHashProvidersConfigured();
    const startTime = Date.now();

    try {
      // Convert message to bytes if needed
      const messageBytes = typeof message === 'string'
        ? new TextEncoder().encode(message)
        : message;

      // Hash the message
      const buffer = messageBytes.buffer instanceof ArrayBuffer
        ? messageBytes.buffer.slice(messageBytes.byteOffset, messageBytes.byteOffset + messageBytes.byteLength)
        : messageBytes.slice();
      const subtle = (globalThis as any).crypto?.subtle ?? nodeWebCrypto?.subtle;
      if (!subtle) throw new Error('WebCrypto subtle API not available for hashing');
      const messageHash = await subtle.digest('SHA-256', buffer);
      const messageHashArray = new Uint8Array(messageHash);

      // Reconstruct the signature object
      const rBytes = typeof signature.r === 'bigint'
        ? new Uint8Array(32).map((_, i) => Number((signature.r as bigint >> BigInt((31 - i) * 8)) & 0xffn))
        : new Uint8Array(signature.r as Uint8Array);
      const sBytes = typeof signature.s === 'bigint'
        ? new Uint8Array(32).map((_, i) => Number((signature.s as bigint >> BigInt((31 - i) * 8)) & 0xffn))
        : new Uint8Array(signature.s as Uint8Array);
      const compactSig = new Uint8Array([...rBytes, ...sBytes]);
      const sig = secp256k1.Signature.fromCompact(compactSig);

      // Verify the signature
      const isValid = secp256k1.verify(sig, messageHashArray, publicKey);

      const verificationTime = Date.now() - startTime;

      return {
        isValid,
        verifiedAt: new Date(),
        verificationTimeMs: verificationTime,
      };
    } catch (error) {
      const verificationTime = Date.now() - startTime;

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown verification error',
        verifiedAt: new Date(),
        verificationTimeMs: verificationTime,
      };
    }
  }

  /**
   * Create a signable message with timestamp and context
   */
  static createSignableMessage(
    content: string,
    type: SignableMessage['type'] = 'general',
    context?: Record<string, unknown>
  ): SignableMessage {
    return {
      content,
      type,
      context: context || {},
      timestamp: new Date(),
    };
  }

  /**
   * Sign a complete message object
   */
  static async signCompleteMessage(
    message: SignableMessage,
    privateKey: Uint8Array
  ): Promise<SignedMessage> {
    // Create canonical representation for signing
    const canonicalContent = JSON.stringify({
      content: message.content,
      type: message.type,
      context: message.context,
      timestamp: message.timestamp.toISOString(),
    });

    const signature = await this.signMessage(canonicalContent, privateKey);

    const publicKey = secp256k1.getPublicKey(privateKey, true);

    return {
      ...message,
      signature,
      signerPublicKey: new Uint8Array(publicKey),
      signedAt: new Date(),
    };
  }

  /**
   * Verify a complete signed message
   */
  static async verifySignedMessage(
    signedMessage: SignedMessage,
    publicKey: Uint8Array
  ): Promise<SignatureVerificationResult> {
    // Recreate the canonical content that was signed
    const canonicalContent = JSON.stringify({
      content: signedMessage.content,
      type: signedMessage.type,
      context: signedMessage.context,
      timestamp: signedMessage.timestamp.toISOString(),
    });

    return this.verifySignature(canonicalContent, signedMessage.signature, publicKey);
  }

  /**
   * Derive public key from signature and message (public key recovery)
   */
  static async recoverPublicKey(
    message: string | Uint8Array,
    signature: ECCSignature
  ): Promise<Uint8Array> {
    this.ensureHashProvidersConfigured();
    const messageBytes = typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message;

    const buffer = messageBytes.buffer instanceof ArrayBuffer
      ? messageBytes.buffer.slice(messageBytes.byteOffset, messageBytes.byteOffset + messageBytes.byteLength)
      : messageBytes.slice();
    const subtle = (globalThis as any).crypto?.subtle ?? nodeWebCrypto?.subtle;
    if (!subtle) throw new Error('WebCrypto subtle API not available for hashing');
    const messageHash = await subtle.digest('SHA-256', buffer);
    const messageHashArray = new Uint8Array(messageHash);

    const rBytes = typeof signature.r === 'bigint'
      ? new Uint8Array(32).map((_, i) => Number((signature.r as bigint >> BigInt((31 - i) * 8)) & 0xffn))
      : new Uint8Array(signature.r as Uint8Array);
    const sBytes = typeof signature.s === 'bigint'
      ? new Uint8Array(32).map((_, i) => Number((signature.s as bigint >> BigInt((31 - i) * 8)) & 0xffn))
      : new Uint8Array(signature.s as Uint8Array);
    const compactSig = new Uint8Array([...rBytes, ...sBytes]);
    const sig = secp256k1.Signature.fromCompact(compactSig);

    // Try provided recovery id first, then fallback to 0 and 1, verifying the result
    const candidates: number[] = [signature.recovery, 0, 1, 2, 3];
    for (const rec of candidates) {
      try {
        const pub = secp256k1.Signature
          .fromCompact(compactSig)
          .addRecoveryBit(rec)
          .recoverPublicKey(messageHashArray)
          .toRawBytes(true);
        if (secp256k1.verify(sig, messageHashArray, pub)) {
          return new Uint8Array(pub);
        }
      } catch {
        // continue
      }
    }
    throw new Error('Failed to recover public key');
  }

  /**
   * Convert signature to compact format
   */
  static signatureToCompact(signature: ECCSignature): CompactSignature {
    const rBytes = typeof signature.r === 'bigint'
      ? new Uint8Array(32).map((_, i) => Number((signature.r as bigint >> BigInt((31 - i) * 8)) & 0xffn))
      : new Uint8Array(signature.r as Uint8Array);
    const sBytes = typeof signature.s === 'bigint'
      ? new Uint8Array(32).map((_, i) => Number((signature.s as bigint >> BigInt((31 - i) * 8)) & 0xffn))
      : new Uint8Array(signature.s as Uint8Array);

    return {
      signature: new Uint8Array([...rBytes, ...sBytes]),
      recovery: signature.recovery,
    };
  }

  /**
   * Convert compact signature to full format
   */
  static compactToSignature(compact: CompactSignature): ECCSignature {
    const r = compact.signature.slice(0, 32);
    const s = compact.signature.slice(32, 64);

    return {
      r,
      s,
      recovery: compact.recovery,
    };
  }

  /**
   * Validate that a private key is valid for secp256k1
   */
  static isValidPrivateKey(privateKey: Uint8Array): boolean {
    try {
      return secp256k1.utils.isValidPrivateKey(privateKey);
    } catch {
      return false;
    }
  }

  /**
   * Validate that a public key is valid for secp256k1
   */
  static isValidPublicKey(publicKey: Uint8Array): boolean {
    try {
      // Attempt to parse the public key using Point.fromHex
      secp256k1.Point.fromHex(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a deterministic key pair from a seed
   * WARNING: Only use for testing, not for production keys!
   */
  static generateDeterministicKeyPair(seed: string): ECCKeyPair {
    const seedBytes = new TextEncoder().encode(seed);
    // Simple deterministic key generation for testing only
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = (seedBytes[i % seedBytes.length] ?? 0) ^ (i + 1);
    }

    // Ensure the key is valid by normalizing it
    const privateKey = secp256k1.utils.normPrivateKeyToScalar(hash);
    const privateKeyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      privateKeyBytes[31 - i] = Number((privateKey >> BigInt(i * 8)) & 0xffn);
    }

    const publicKey = secp256k1.getPublicKey(privateKeyBytes, true);

    return {
      privateKey: privateKeyBytes,
      publicKey: new Uint8Array(publicKey),
    };
  }
}
