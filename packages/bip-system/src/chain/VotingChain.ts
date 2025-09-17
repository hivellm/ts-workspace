/**
 * VotingChain - Blockchain-inspired voting chain for BIP system
 * Implements immutable, cryptographically secure voting records
 */

import { createHash } from 'crypto';
import { VotingBlock, VotingSession, VoteData, ResultData, BlockType } from '../types/index.js';

export class VotingChain {
  private session: VotingSession;

  constructor(session: VotingSession) {
    this.session = session;
  }

  /**
   * Calculate deterministic block hash according to BIP-01 specification
   */
  private calculateBlockHash(
    index: number,
    timestamp: Date,
    previousHash: string | null,
    type: BlockType,
    model: string,
    fileReference: string,
    fileHash: string
  ): string {
    // Handle null previous_hash as per BIP-01 spec
    const prevHash = previousHash || '';

    // Create deterministic string format: index|timestamp|previous_hash|type|model|file|file_hash
    const blockString = [
      index.toString(),
      timestamp.toISOString(),
      prevHash,
      type,
      model,
      fileReference,
      fileHash
    ].join('|');

    return createHash('sha256').update(blockString, 'utf8').digest('hex');
  }

  /**
   * Add a vote block to the chain
   */
  addVoteBlock(model: string, voteData: VoteData): VotingBlock {
    const index = this.session.chain.length + 1;
    const timestamp = new Date();
    const previousHash = this.session.chain.length > 0
      ? this.session.chain[this.session.chain.length - 1]!.hash
      : null;

    const blockHash = this.calculateBlockHash(
      index,
      timestamp,
      previousHash,
      'vote',
      model,
      voteData.voteFile,
      voteData.voteFileHash
    );

    const block: VotingBlock = {
      index,
      timestamp,
      previousHash,
      type: 'vote',
      model,
      data: voteData,
      hash: blockHash
    };

    this.session.chain.push(block);
    return block;
  }

  /**
   * Add finalization block to the chain
   */
  addFinalizeBlock(reporterModel: string, resultData: ResultData): VotingBlock {
    const index = this.session.chain.length + 1;
    const timestamp = new Date();
    const previousHash = this.session.chain.length > 0
      ? this.session.chain[this.session.chain.length - 1]!.hash
      : null;

    const blockHash = this.calculateBlockHash(
      index,
      timestamp,
      previousHash,
      'finalize',
      reporterModel,
      resultData.resultFile,
      resultData.resultFileHash
    );

    const block: VotingBlock = {
      index,
      timestamp,
      previousHash,
      type: 'finalize',
      model: reporterModel,
      data: resultData,
      hash: blockHash
    };

    this.session.chain.push(block);
    this.session.status = 'Completed';
    return block;
  }

  /**
   * Verify the integrity of the entire chain
   */
  verifyChainIntegrity(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.session.chain.length === 0) {
      return { isValid: true, errors: [] };
    }

    // Check first block
    const firstBlock = this.session.chain[0];
    if (firstBlock && firstBlock.index !== 1) {
      errors.push('First block index should be 1');
    }
    if (firstBlock && firstBlock.previousHash !== null) {
      errors.push('First block should have null previousHash');
    }

    // Verify each block in sequence
    for (let i = 0; i < this.session.chain.length; i++) {
      const block = this.session.chain[i];
      if (!block) continue;

      const expectedIndex = i + 1;

      // Check index sequence
      if (block.index !== expectedIndex) {
        errors.push(`Block ${i} has incorrect index: expected ${expectedIndex}, got ${block.index}`);
      }

      // Check previous hash linkage
      if (i > 0) {
        const previousBlock = this.session.chain[i - 1];
        if (previousBlock && block.previousHash !== previousBlock.hash) {
          errors.push(`Block ${i} has incorrect previousHash`);
        }
      }

      // Verify block hash
      const data = block.data;
      let fileReference: string;
      let fileHash: string;

      if (block.type === 'vote') {
        const voteData = data as VoteData;
        fileReference = voteData.voteFile;
        fileHash = voteData.voteFileHash;
      } else {
        const resultData = data as ResultData;
        fileReference = resultData.resultFile;
        fileHash = resultData.resultFileHash;
      }

      const expectedHash = this.calculateBlockHash(
        block.index,
        block.timestamp,
        block.previousHash,
        block.type,
        block.model,
        fileReference,
        fileHash
      );

      if (block.hash !== expectedHash) {
        errors.push(`Block ${i} has invalid hash`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get voting progress statistics
   */
  getVotingProgress(): {
    totalVotes: number;
    expectedVotes: number;
    participationRate: number;
    isFinalized: boolean;
    participatingModels: string[];
    missingModels: string[];
  } {
    const voteBlocks = this.session.chain.filter(block => block.type === 'vote');
    const participatingModels = voteBlocks.map(block => block.model);
    const missingModels = this.session.participants.filter(
      model => !participatingModels.includes(model)
    );
    const isFinalized = this.session.chain.some(block => block.type === 'finalize');

    return {
      totalVotes: voteBlocks.length,
      expectedVotes: this.session.participants.length,
      participationRate: voteBlocks.length / this.session.participants.length,
      isFinalized,
      participatingModels,
      missingModels
    };
  }

  /**
   * Export chain to JSON format for persistence
   */
  exportToJSON(): string {
    return JSON.stringify({
      minuteId: this.session.minuteId,
      created: this.session.startTime.toISOString(),
      status: this.session.status,
      participants: this.session.participants,
      chain: this.session.chain.map(block => ({
        index: block.index,
        timestamp: block.timestamp.toISOString(),
        previousHash: block.previousHash,
        type: block.type,
        model: block.model,
        data: block.data,
        hash: block.hash
      }))
    }, null, 2);
  }

  /**
   * Import chain from JSON format
   */
  static importFromJSON(jsonData: string): VotingChain {
    const data = JSON.parse(jsonData);

    const session: VotingSession = {
      minuteId: data.minuteId,
      proposals: [], // Will be filled from external source
      startTime: new Date(data.created),
      endTime: new Date(), // Will be calculated
      status: data.status,
      quorumThreshold: 0.6, // Default values
      approvalThreshold: 0.6,
      participants: data.participants,
      chain: data.chain.map((blockData: any) => ({
        index: blockData.index,
        timestamp: new Date(blockData.timestamp),
        previousHash: blockData.previousHash,
        type: blockData.type,
        model: blockData.model,
        data: blockData.data,
        hash: blockData.hash
      }))
    };

    return new VotingChain(session);
  }

  /**
   * Get the current session
   */
  getSession(): VotingSession {
    return this.session;
  }
}
