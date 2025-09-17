/**
 * @fileoverview Tests for performance and scalability
 */

import { describe, it, expect } from 'vitest';

describe('Performance and Scalability', () => {
  it('should handle multiple BIPs efficiently', () => {
    const multipleBips = Array.from({ length: 10 }, (_, i) => ({
      bipId: `BIP-${String(i).padStart(3, '0')}`,
      sourceProposal: `P${String(i + 100).padStart(3, '0')}`,
      sourceMinute: '0001',
      chain: Array.from({ length: 3 }, (_, j) => ({
        index: j + 1,
        type: ['draft', 'implementation', 'testing'][j],
        hash: `hash-${i}-${j}`
      }))
    }));

    expect(multipleBips).toHaveLength(10);

    const totalBlocks = multipleBips.reduce((sum, bip) => sum + bip.chain.length, 0);
    expect(totalBlocks).toBe(30);

    const bipIds = multipleBips.map(bip => bip.bipId);
    const uniqueBipIds = [...new Set(bipIds)];
    expect(uniqueBipIds).toHaveLength(bipIds.length);
  });

  it('should generate consistent timestamps', () => {
    const generateTimestamp = () => new Date().toISOString();

    const timestamp1 = generateTimestamp();
    const timestamp2 = generateTimestamp();

    expect(timestamp1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(timestamp2).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    expect(new Date(timestamp2).getTime()).toBeGreaterThanOrEqual(new Date(timestamp1).getTime());
  });

  it('should handle large blockchain efficiently', () => {
    const generateLargeBlockchain = (bipCount: number, blocksPerBip: number) => {
      const startTime = Date.now();

      const blockchain = {
        version: '1.0.0',
        created: new Date().toISOString(),
        totalBIPs: bipCount,
        chains: Array.from({ length: bipCount }, (_, i) => ({
          bipId: `BIP-${String(i).padStart(3, '0')}`,
          chain: Array.from({ length: blocksPerBip }, (_, j) => ({
            index: j + 1,
            hash: `hash-${i}-${j}`,
            timestamp: new Date(Date.now() + j * 1000).toISOString()
          }))
        }))
      };

      const endTime = Date.now();
      const duration = endTime - startTime;

      return { blockchain, duration };
    };

    const { blockchain, duration } = generateLargeBlockchain(100, 5);

    expect(blockchain.totalBIPs).toBe(100);
    expect(blockchain.chains).toHaveLength(100);

    const totalBlocks = blockchain.chains.reduce((sum, chain) => sum + chain.chain.length, 0);
    expect(totalBlocks).toBe(500);

    // Should complete within reasonable time (less than 1 second for this size)
    expect(duration).toBeLessThan(1000);
  });

  it('should efficiently validate large chains', () => {
    const createLargeChain = (blockCount: number) => {
      const chain = [];
      let previousHash = null;

      for (let i = 0; i < blockCount; i++) {
        const block = {
          index: i + 1,
          previousHash,
          hash: `hash-${i + 1}`,
          timestamp: new Date(Date.now() + i * 1000).toISOString()
        };
        chain.push(block);
        previousHash = block.hash;
      }

      return chain;
    };

    const validateChainPerformance = (chain: any[]) => {
      const startTime = Date.now();

      let isValid = true;

      // Validate chain integrity
      for (let i = 1; i < chain.length; i++) {
        const currentBlock = chain[i];
        const previousBlock = chain[i - 1];

        if (currentBlock.previousHash !== previousBlock.hash ||
            currentBlock.index !== previousBlock.index + 1) {
          isValid = false;
          break;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      return { isValid, duration };
    };

    const largeChain = createLargeChain(1000);
    const { isValid, duration } = validateChainPerformance(largeChain);

    expect(isValid).toBe(true);
    expect(largeChain).toHaveLength(1000);

    // Should validate quickly (less than 100ms for 1000 blocks)
    expect(duration).toBeLessThan(100);
  });

  it('should handle concurrent operations', () => {
    const simulateConcurrentOperations = async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve(`operation-${i}-completed`);
          }, Math.random() * 10); // Random delay up to 10ms
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      return {
        results,
        duration: endTime - startTime,
        totalOperations: operations.length
      };
    };

    return simulateConcurrentOperations().then(({ results, duration, totalOperations }) => {
      expect(results).toHaveLength(totalOperations);
      expect(results.every(result => result.includes('completed'))).toBe(true);

      // Should complete all operations concurrently in reasonable time
      expect(duration).toBeLessThan(50); // Should be much faster than sequential
    });
  });
});
