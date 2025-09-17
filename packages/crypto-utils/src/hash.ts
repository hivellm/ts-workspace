/**
 * @fileoverview SHA256 Hash Service for Vote Signature Generation
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

import { createHash, createHmac } from 'crypto';
import type { Vote, ModelIdentity, Proposal } from '../../shared-types/src/index.js';

/**
 * Service for generating standardized SHA256 hashes for vote signatures
 * Ensures consistent hashing across all models in the governance system
 */
export class VoteHashService {
  private static readonly ALGORITHM = 'sha256';

  /**
   * Generate SHA256 hash for a vote signature
   * This ensures all models use the same hashing method for consistency
   */
  static generateVoteHash(vote: Vote): string {
    const canonicalData = this.createCanonicalVoteData(vote);
    return this.hashData(canonicalData);
  }

  /**
   * Generate SHA256 hash for a proposal signature
   * Used for proposal integrity verification
   */
  static generateProposalHash(proposal: Proposal): string {
    const canonicalData = this.createCanonicalProposalData(proposal);
    return this.hashData(canonicalData);
  }

  /**
   * Generate SHA256 hash for model identity verification
   */
  static generateModelIdentityHash(identity: ModelIdentity): string {
    const canonicalData = this.createCanonicalIdentityData(identity);
    return this.hashData(canonicalData);
  }

  /**
   * Generate HMAC-SHA256 for authenticated hashing
   * Used for secure vote verification with shared secrets
   */
  static generateHMAC(data: string, key: string): string {
    const hmac = createHmac(this.ALGORITHM, key);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Verify if a hash matches the expected value for a vote
   */
  static verifyVoteHash(vote: Vote, expectedHash: string): boolean {
    const computedHash = this.generateVoteHash(vote);
    return this.constantTimeEquals(computedHash, expectedHash);
  }

  /**
   * Create canonical string representation of vote data
   * Ensures deterministic hashing regardless of object property order
   */
  private static createCanonicalVoteData(vote: Vote): string {
    return JSON.stringify({
      proposalId: vote.proposalId,
      modelId: vote.modelId,
      weight: vote.weight,
      timestamp: vote.timestamp.toISOString(),
      justification: vote.justification || '',
      veto: vote.veto ? {
        reason: vote.veto.reason,
        isVeto: vote.veto.isVeto
      } : null
    });
  }

  /**
   * Create canonical string representation of proposal data
   */
  private static createCanonicalProposalData(proposal: Proposal): string {
    return JSON.stringify({
      id: proposal.id,
      title: proposal.title,
      author: {
        modelName: proposal.author.modelName,
        provider: proposal.author.provider,
        publicKey: proposal.author.publicKey,
        keyId: proposal.author.keyId,
        createdAt: proposal.author.createdAt.toISOString(),
        expiresAt: proposal.author.expiresAt.toISOString()
      },
      category: proposal.category,
      priority: proposal.priority,
      createdAt: proposal.createdAt.toISOString(),
      updatedAt: proposal.updatedAt.toISOString(),
      content: proposal.content,
      metadata: {
        estimatedEffort: proposal.metadata.estimatedEffort,
        dependencies: proposal.metadata.dependencies || [],
        tags: proposal.metadata.tags || [],
        timelineWeeks: proposal.metadata.timelineWeeks,
        impactScope: proposal.metadata.impactScope
      },
      previousScore: proposal.previousScore
    });
  }

  /**
   * Create canonical string representation of model identity data
   */
  private static createCanonicalIdentityData(identity: ModelIdentity): string {
    return JSON.stringify({
      modelName: identity.modelName,
      provider: identity.provider,
      publicKey: identity.publicKey,
      keyId: identity.keyId,
      createdAt: identity.createdAt.toISOString(),
      expiresAt: identity.expiresAt.toISOString()
    });
  }

  /**
   * Generate SHA256 hash from data string
   */
  private static hashData(data: string): string {
    const hash = createHash(this.ALGORITHM);
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate a hash for multiple votes (batch processing)
   * Useful for voting session verification
   */
  static generateBatchVoteHash(votes: Vote[]): string {
    const sortedVotes = votes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const canonicalBatch = sortedVotes.map(vote => this.createCanonicalVoteData(vote)).join('|');
    return this.hashData(canonicalBatch);
  }

  /**
   * Generate hash for voting session integrity
   */
  static generateVotingSessionHash(sessionId: string, proposalIds: string[], startTime: Date, endTime: Date): string {
    const canonicalData = JSON.stringify({
      sessionId,
      proposalIds: proposalIds.sort(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });
    return this.hashData(canonicalData);
  }
}
