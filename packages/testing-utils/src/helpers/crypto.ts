/**
 * @fileoverview Crypto testing helpers
 * @author CMMV-Hive Team
 */

/**
 * Create deterministic test data for crypto operations
 */
export const createTestBytes = (length: number, seed = 0): Uint8Array => {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = (seed + i * 17) % 256;
  }
  return bytes;
};

/**
 * Compare two Uint8Arrays for equality
 */
export const compareBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/**
 * Convert bytes to hex string
 */
export const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

/**
 * Convert hex string to bytes
 */
export const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
};
