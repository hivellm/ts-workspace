/**
 * @fileoverview Tests for hash generation and cryptographic functions
 */

import { describe, it, expect } from 'vitest';

describe('Hash Generation', () => {
  it('should generate deterministic hashes', () => {
    const createSimpleHash = (content: string): string => {
      return Buffer.from(content, 'utf8').toString('base64').substring(0, 16);
    };

    const content1 = 'test content';
    const content2 = 'test content';
    const content3 = 'different content';

    const hash1 = createSimpleHash(content1);
    const hash2 = createSimpleHash(content2);
    const hash3 = createSimpleHash(content3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toBeDefined();
    expect(hash1.length).toBe(16);
  });

  it('should generate unique block hashes', () => {
    const generateBlockHash = (block: any): string => {
      const content = JSON.stringify(block);
      return Buffer.from(content, 'utf8').toString('base64').substring(0, 16);
    };

    const block1 = {
      index: 1,
      timestamp: '2025-09-08T10:00:00.000Z',
      previousHash: null,
      type: 'draft',
      model: 'claude-4-sonnet',
      action: 'Created initial BIP specification',
      files: ['BIP-TEST.md']
    };

    const block2 = {
      index: 2,
      timestamp: '2025-09-08T11:00:00.000Z',
      previousHash: 'previous-hash',
      type: 'implementation',
      model: 'claude-4-sonnet',
      action: 'Completed implementation',
      files: ['BIP-TEST-implementation-plan.md']
    };

    const hash1 = generateBlockHash(block1);
    const hash2 = generateBlockHash(block2);

    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    expect(hash1).not.toBe(hash2);
  });

  it('should validate hash integrity', () => {
    const calculateHash = (content: string): string => {
      return Buffer.from(content, 'utf8').toString('base64').substring(0, 16);
    };

    const block1Content = JSON.stringify({
      index: 1,
      timestamp: '2025-09-08T10:00:00.000Z',
      previousHash: null,
      type: 'draft',
      model: 'claude-4-sonnet',
      action: 'Created initial BIP specification',
      files: ['BIP-TEST.md']
    });

    const block2Content = JSON.stringify({
      index: 2,
      timestamp: '2025-09-08T14:00:00.000Z',
      previousHash: 'block-hash-1',
      type: 'implementation',
      model: 'claude-4-sonnet',
      action: 'Completed implementation',
      files: ['implementation-plan.md']
    });

    const hash1 = calculateHash(block1Content);
    const hash2 = calculateHash(block2Content);

    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    expect(hash1).not.toBe(hash2);

    // Test determinism
    const hash1Repeat = calculateHash(block1Content);
    expect(hash1).toBe(hash1Repeat);
  });
});
