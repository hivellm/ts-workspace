/**
 * @fileoverview Tests for VoteHashService
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import { VoteHashService } from '../hash.js';
import type { Vote, ModelIdentity, Proposal } from '@cmmv/hive-shared-types';

describe('VoteHashService', () => {
  describe('generateVoteHash', () => {
    it('should generate consistent SHA256 hashes', () => {
      const vote: Vote = {
        proposalId: 'test-proposal-123',
        modelId: 'test-model-456',
        weight: 8,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        justification: 'Test vote for hash consistency'
      };

      const hash1 = VoteHashService.generateVoteHash(vote);
      const hash2 = VoteHashService.generateVoteHash(vote);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
      expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
    });

    it('should generate different hashes for different votes', () => {
      const vote1: Vote = {
        proposalId: 'proposal-1',
        modelId: 'model-1',
        weight: 5,
        timestamp: new Date('2024-01-01T12:00:00Z')
      };

      const vote2: Vote = {
        proposalId: 'proposal-2',
        modelId: 'model-1',
        weight: 5,
        timestamp: new Date('2024-01-01T12:00:00Z')
      };

      const hash1 = VoteHashService.generateVoteHash(vote1);
      const hash2 = VoteHashService.generateVoteHash(vote2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle canonical ordering correctly', () => {
      const orderedVote: Vote = {
        proposalId: 'test-123',
        modelId: 'model-456',
        weight: 7,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        justification: 'Canonical ordering test'
      };

      // Create unordered version
      const unorderedVote = {
        weight: 7,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        justification: 'Canonical ordering test',
        proposalId: 'test-123',
        modelId: 'model-456'
      };

      const orderedHash = VoteHashService.generateVoteHash(orderedVote);
      const unorderedHash = VoteHashService.generateVoteHash(unorderedVote as Vote);

      expect(orderedHash).toBe(unorderedHash);
    });

    it('should handle votes with veto correctly', () => {
      const voteWithVeto: Vote = {
        proposalId: 'veto-test-123',
        modelId: 'model-456',
        weight: 1,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        veto: {
          reason: 'Critical security concern',
          isVeto: true
        }
      };

      const hash = VoteHashService.generateVoteHash(voteWithVeto);
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it('should handle optional fields correctly', () => {
      const voteWithoutJustification: Vote = {
        proposalId: 'minimal-vote-123',
        modelId: 'model-456',
        weight: 10,
        timestamp: new Date('2024-01-01T12:00:00Z')
      };

      const hash = VoteHashService.generateVoteHash(voteWithoutJustification);
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });
  });

  describe('verifyVoteHash', () => {
    it('should verify correct hashes', () => {
      const vote: Vote = {
        proposalId: 'verify-test-123',
        modelId: 'model-456',
        weight: 6,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        justification: 'Verification test'
      };

      const hash = VoteHashService.generateVoteHash(vote);
      const isValid = VoteHashService.verifyVoteHash(vote, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect hashes', () => {
      const vote: Vote = {
        proposalId: 'verify-test-123',
        modelId: 'model-456',
        weight: 6,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        justification: 'Verification test'
      };

      const wrongHash = '0'.repeat(64);
      const isValid = VoteHashService.verifyVoteHash(vote, wrongHash);

      expect(isValid).toBe(false);
    });

    it('should use constant-time comparison', () => {
      const vote: Vote = {
        proposalId: 'timing-test-123',
        modelId: 'model-456',
        weight: 5,
        timestamp: new Date('2024-01-01T12:00:00Z')
      };

      const correctHash = VoteHashService.generateVoteHash(vote);
      const wrongHash = correctHash.slice(0, -1) + '0'; // Last char different

      // Both should take roughly the same time
      const start1 = Date.now();
      const result1 = VoteHashService.verifyVoteHash(vote, correctHash);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const result2 = VoteHashService.verifyVoteHash(vote, wrongHash);
      const time2 = Date.now() - start2;

      // Results should be different but timing should be similar
      expect(result1).toBe(true);
      expect(result2).toBe(false);

      // Allow for some timing variance (within 10ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe('generateProposalHash', () => {
    it('should generate consistent proposal hashes', () => {
      const proposal: Proposal = {
        id: 'proposal-test-123',
        title: 'Test Proposal',
        author: {
          modelName: 'Test Model',
          provider: 'Test Provider',
          publicKey: 'test-public-key',
          keyId: 'test-key-id',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          expiresAt: new Date('2025-01-01T00:00:00Z'),
          signature: 'test-signature'
        },
        category: 'Technical Infrastructure',
        priority: 'high',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
        content: 'Test proposal content',
        metadata: {
          estimatedEffort: 'medium',
          dependencies: ['dep-1', 'dep-2'],
          tags: ['test', 'proposal'],
          timelineWeeks: 4,
          impactScope: 'system-wide'
        }
      };

      const hash1 = VoteHashService.generateProposalHash(proposal);
      const hash2 = VoteHashService.generateProposalHash(proposal);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
    });
  });

  describe('generateModelIdentityHash', () => {
    it('should generate consistent identity hashes', () => {
      const identity: ModelIdentity = {
        modelName: 'Test Model',
        provider: 'Test Provider',
        publicKey: 'test-public-key-123',
        keyId: 'test-key-id-456',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        expiresAt: new Date('2025-01-01T00:00:00Z'),
        signature: 'test-signature'
      };

      const hash1 = VoteHashService.generateModelIdentityHash(identity);
      const hash2 = VoteHashService.generateModelIdentityHash(identity);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
    });
  });

  describe('generateHMAC', () => {
    it('should generate HMAC-SHA256', () => {
      const data = 'test-data';
      const key = 'test-key';

      const hmac1 = VoteHashService.generateHMAC(data, key);
      const hmac2 = VoteHashService.generateHMAC(data, key);

      expect(hmac1).toBe(hmac2);
      expect(hmac1).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hmac1)).toBe(true);
    });

    it('should generate different HMACs for different keys', () => {
      const data = 'test-data';
      const key1 = 'key1';
      const key2 = 'key2';

      const hmac1 = VoteHashService.generateHMAC(data, key1);
      const hmac2 = VoteHashService.generateHMAC(data, key2);

      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe('generateBatchVoteHash', () => {
    it('should generate consistent batch hashes', () => {
      const votes: Vote[] = [
        {
          proposalId: 'batch-1',
          modelId: 'model-1',
          weight: 5,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          proposalId: 'batch-2',
          modelId: 'model-2',
          weight: 8,
          timestamp: new Date('2024-01-01T11:00:00Z')
        }
      ];

      const hash1 = VoteHashService.generateBatchVoteHash(votes);
      const hash2 = VoteHashService.generateBatchVoteHash(votes);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
    });

    it('should sort votes by timestamp for consistency', () => {
      const votes: Vote[] = [
        {
          proposalId: 'batch-1',
          modelId: 'model-1',
          weight: 5,
          timestamp: new Date('2024-01-01T11:00:00Z')
        },
        {
          proposalId: 'batch-2',
          modelId: 'model-2',
          weight: 8,
          timestamp: new Date('2024-01-01T10:00:00Z')
        }
      ];

      const reversedVotes: Vote[] = [...votes].reverse();

      const hash1 = VoteHashService.generateBatchVoteHash(votes);
      const hash2 = VoteHashService.generateBatchVoteHash(reversedVotes);

      expect(hash1).toBe(hash2); // Should be same due to sorting
    });
  });

  describe('generateVotingSessionHash', () => {
    it('should generate consistent session hashes', () => {
      const sessionId = 'session-test-123';
      const proposalIds = ['prop-1', 'prop-2', 'prop-3'];
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T12:00:00Z');

      const hash1 = VoteHashService.generateVotingSessionHash(sessionId, proposalIds, startTime, endTime);
      const hash2 = VoteHashService.generateVotingSessionHash(sessionId, proposalIds, startTime, endTime);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
    });

    it('should sort proposal IDs for consistency', () => {
      const sessionId = 'session-test-123';
      const proposalIds = ['prop-3', 'prop-1', 'prop-2'];
      const sortedProposalIds = ['prop-1', 'prop-2', 'prop-3'];
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T12:00:00Z');

      const hash1 = VoteHashService.generateVotingSessionHash(sessionId, proposalIds, startTime, endTime);
      const hash2 = VoteHashService.generateVotingSessionHash(sessionId, sortedProposalIds, startTime, endTime);

      expect(hash1).toBe(hash2); // Should be same due to sorting
    });
  });

  describe('Security and Edge Cases', () => {
    it('should handle empty strings and null values', () => {
      const vote: Vote = {
        proposalId: '',
        modelId: 'model-456',
        weight: 1,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        justification: ''
      };

      const hash = VoteHashService.generateVoteHash(vote);
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it('should handle special characters', () => {
      const vote: Vote = {
        proposalId: 'test-ñáéíóú',
        modelId: 'model-456',
        weight: 5,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        justification: 'Test with special chars: ñáéíóú 🚀 🌟'
      };

      const hash = VoteHashService.generateVoteHash(vote);
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it('should handle maximum weight values', () => {
      const vote: Vote = {
        proposalId: 'max-weight-test',
        modelId: 'model-456',
        weight: 10,
        timestamp: new Date('2024-01-01T12:00:00Z')
      };

      const hash = VoteHashService.generateVoteHash(vote);
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });
  });
});
