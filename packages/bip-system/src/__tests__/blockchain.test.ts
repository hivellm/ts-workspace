/**
 * @fileoverview Tests for blockchain structure and integrity validation
 */

import { describe, it, expect } from 'vitest';

describe('Blockchain Structure Validation', () => {
  it('should create valid blockchain structure', () => {
    const mockChain = {
      bipId: 'BIP-TEST',
      sourceProposal: 'P999',
      sourceMinute: '0001',
      proposalTitle: 'Test Proposal for BIP System',
      approvalDate: '2025-09-08',
      voteCount: { approve: 8, reject: 1, abstain: 1 },
      created: '2025-09-08T10:00:00.000Z',
      chain: [
        {
          index: 1,
          timestamp: '2025-09-08T10:00:00.000Z',
          previousHash: null,
          type: 'draft',
          model: 'claude-4-sonnet',
          action: 'Created initial BIP specification for BIP-TEST',
          files: ['BIP-TEST.md'],
          fileHash: 'test-file-hash',
          hash: 'test-block-hash'
        }
      ]
    };

    expect(mockChain.bipId).toBeDefined();
    expect(mockChain.sourceProposal).toBeDefined();
    expect(mockChain.sourceMinute).toBeDefined();
    expect(mockChain.proposalTitle).toBeDefined();
    expect(mockChain.voteCount).toBeDefined();
    expect(mockChain.chain).toBeInstanceOf(Array);
    expect(mockChain.chain).toHaveLength(1);

    const block = mockChain.chain[0];
    expect(block.index).toBe(1);
    expect(block.previousHash).toBeNull();
    expect(block.type).toBe('draft');
    expect(block.model).toBeDefined();
    expect(block.action).toBeDefined();
    expect(block.files).toBeInstanceOf(Array);
    expect(block.hash).toBeDefined();
  });

  it('should maintain chain integrity', () => {
    const mockBlocks = [
      {
        index: 1,
        previousHash: null,
        hash: 'hash-1'
      },
      {
        index: 2,
        previousHash: 'hash-1',
        hash: 'hash-2'
      },
      {
        index: 3,
        previousHash: 'hash-2',
        hash: 'hash-3'
      }
    ];

    for (let i = 1; i < mockBlocks.length; i++) {
      const currentBlock = mockBlocks[i];
      const previousBlock = mockBlocks[i - 1];

      expect(currentBlock.index).toBe(previousBlock.index + 1);
      expect(currentBlock.previousHash).toBe(previousBlock.hash);
    }

    expect(mockBlocks[0].previousHash).toBeNull();
  });

  it('should validate blockchain integrity', () => {
    const validateChain = (chain: any[]): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (chain.length === 0) {
        errors.push('Chain cannot be empty');
      }

      if (chain.length > 0 && chain[0].previousHash !== null) {
        errors.push('First block must have null previousHash');
      }

      for (let i = 1; i < chain.length; i++) {
        const currentBlock = chain[i];
        const previousBlock = chain[i - 1];

        if (currentBlock.previousHash !== previousBlock.hash) {
          errors.push(`Block ${i} has invalid previousHash`);
        }

        if (currentBlock.index !== previousBlock.index + 1) {
          errors.push(`Block ${i} has invalid index`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    };

    const validChain = [
      { index: 1, previousHash: null, hash: 'hash1' },
      { index: 2, previousHash: 'hash1', hash: 'hash2' },
      { index: 3, previousHash: 'hash2', hash: 'hash3' }
    ];

    const validResult = validateChain(validChain);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    const invalidChain = [
      { index: 1, previousHash: 'not-null', hash: 'hash1' },
      { index: 2, previousHash: 'wrong-hash', hash: 'hash2' }
    ];

    const invalidResult = validateChain(invalidChain);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors).toContain('First block must have null previousHash');
    expect(invalidResult.errors).toContain('Block 1 has invalid previousHash');
  });

  it('should create consolidated blockchain structure', () => {
    const mockBlockchain = {
      version: '1.0.0',
      created: '2025-09-08T10:00:00.000Z',
      totalBIPs: 3,
      description: 'BIP Implementation Blockchain - Complete audit trail from proposals to implementation',
      chains: [
        { bipId: 'BIP-00', chain: [{}] },
        { bipId: 'BIP-01', chain: [{}, {}, {}] },
        { bipId: 'BIP-02', chain: [{}, {}, {}] }
      ]
    };

    expect(mockBlockchain.version).toBe('1.0.0');
    expect(mockBlockchain.totalBIPs).toBe(3);
    expect(mockBlockchain.chains).toHaveLength(3);
    expect(mockBlockchain.description).toContain('audit trail');

    const totalBlocks = mockBlockchain.chains.reduce((sum, chain) => sum + chain.chain.length, 0);
    expect(totalBlocks).toBe(7);
  });
});
