/**
 * @fileoverview Test fixtures for CMMV-Hive testing
 * @author CMMV-Hive Team
 */

export const TEST_FIXTURES = {
  dates: {
    created: new Date('2025-01-01T00:00:00Z'),
    updated: new Date('2025-01-01T12:00:00Z'),
    expired: new Date('2026-01-01T00:00:00Z'),
  },

  crypto: {
    publicKey: '04a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
    privateKey: 'a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
    signature: 'signature123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
  },

  governance: {
    proposalId: 'test-proposal-001',
    sessionId: 'test-session-001',
    modelId: 'test-model-001',
  },
} as const;
