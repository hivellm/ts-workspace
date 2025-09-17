/**
 * VotingManager - Core voting system for BIP proposals
 * Manages voting sessions, vote collection, and results calculation
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { VotingSession, VotingBlock, VoteData, ResultData, ProposalVote, ProposalResult, ModelProfile, VotingStatus } from '../types/index.js';
import { VotingChain } from '../chain/VotingChain.js';
import { createHash } from 'crypto';

export class VotingManager {
  private minutesDirectory: string;
  private modelsConfig: ModelProfile[];

  constructor(minutesDirectory: string = 'gov/minutes', modelsConfig: ModelProfile[] = []) {
    this.minutesDirectory = minutesDirectory;
    this.modelsConfig = modelsConfig;
  }

  /**
   * Create a new voting session
   */
  async createVotingSession(
    minuteId: string,
    proposals: string[],
    durationHours: number = 168, // 7 days default
    quorumThreshold: number = 0.6,
    approvalThreshold: number = 0.6
  ): Promise<VotingSession> {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    const activeModels = this.modelsConfig.filter(model => model.isActive && model.category === 'General');
    const participants = activeModels.map(model => model.id);

    const session: VotingSession = {
      minuteId,
      proposals,
      startTime,
      endTime,
      status: 'Active',
      quorumThreshold,
      approvalThreshold,
      chain: [],
      participants
    };

    await this.saveVotingSession(session);
    return session;
  }

  /**
   * Load voting session from file
   */
  async loadVotingSession(minuteId: string): Promise<VotingSession> {
    const sessionFile = join(this.minutesDirectory, minuteId, 'voting_session.json');
    const content = await fs.readFile(sessionFile, 'utf-8');
    const data = JSON.parse(content);

    return {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      chain: data.chain.map((block: any) => ({
        ...block,
        timestamp: new Date(block.timestamp)
      }))
    };
  }

  /**
   * Save voting session to file
   */
  async saveVotingSession(session: VotingSession): Promise<void> {
    const sessionDir = join(this.minutesDirectory, session.minuteId);
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.mkdir(join(sessionDir, 'votes'), { recursive: true });

    const sessionFile = join(sessionDir, 'voting_session.json');
    const serialized = {
      ...session,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      chain: session.chain.map(block => ({
        ...block,
        timestamp: block.timestamp.toISOString()
      }))
    };

    await fs.writeFile(sessionFile, JSON.stringify(serialized, null, 2), 'utf-8');
  }

  /**
   * Submit a vote for a model
   */
  async submitVote(
    minuteId: string,
    modelId: string,
    votes: ProposalVote[]
  ): Promise<VotingBlock> {
    const session = await this.loadVotingSession(minuteId);
    const votingChain = new VotingChain(session);

    // Validate model is eligible
    if (!session.participants.includes(modelId)) {
      throw new Error(`Model ${modelId} is not eligible to vote in this session`);
    }

    // Check if already voted
    const existingVote = session.chain.find(block =>
      block.type === 'vote' && block.model === modelId
    );
    if (existingVote) {
      throw new Error(`Model ${modelId} has already voted`);
    }

    // Validate session is active
    if (session.status !== 'Active') {
      throw new Error(`Voting session ${minuteId} is not active`);
    }

    const now = new Date();
    if (now > session.endTime) {
      throw new Error(`Voting session ${minuteId} has ended`);
    }

    // Create vote file
    const voteFile = `votes/${modelId}.json`;
    const voteFilePath = join(this.minutesDirectory, minuteId, voteFile);

    const voteData = {
      model: modelId,
      timestamp: now.toISOString(),
      proposals: votes
    };

    await fs.writeFile(voteFilePath, JSON.stringify(voteData, null, 2), 'utf-8');

    // Calculate vote file hash
    const voteFileContent = await fs.readFile(voteFilePath, 'utf-8');
    const voteFileHash = createHash('sha256').update(voteFileContent, 'utf8').digest('hex');

    const voteBlockData: VoteData = {
      voteFile,
      voteFileHash,
      votes
    };

    // Add to chain
    const block = votingChain.addVoteBlock(modelId, voteBlockData);

    // Update session
    await this.saveVotingSession(votingChain.getSession());

    return block;
  }

  /**
   * Check if voting can be finalized (all participants voted or deadline reached)
   */
  async canFinalize(minuteId: string): Promise<{ canFinalize: boolean; reason: string }> {
    const session = await this.loadVotingSession(minuteId);
    const votingChain = new VotingChain(session);
    const progress = votingChain.getVotingProgress();

    if (progress.isFinalized) {
      return { canFinalize: false, reason: 'Already finalized' };
    }

    const now = new Date();
    const hasEnded = now > session.endTime;
    const allVoted = progress.totalVotes === progress.expectedVotes;
    const quorumMet = progress.participationRate >= session.quorumThreshold;

    if (allVoted) {
      return { canFinalize: true, reason: 'All participants have voted' };
    }

    if (hasEnded && quorumMet) {
      return { canFinalize: true, reason: 'Voting period ended and quorum met' };
    }

    if (hasEnded && !quorumMet) {
      return { canFinalize: true, reason: 'Voting period ended but quorum not met - will be rejected' };
    }

    return { canFinalize: false, reason: 'Voting period still active and not all votes received' };
  }

  /**
   * Finalize voting session and calculate results
   */
  async finalizeVoting(minuteId: string, reporterModel: string): Promise<ProposalResult[]> {
    const session = await this.loadVotingSession(minuteId);
    const votingChain = new VotingChain(session);

    const canFinalizeResult = await this.canFinalize(minuteId);
    if (!canFinalizeResult.canFinalize) {
      throw new Error(`Cannot finalize: ${canFinalizeResult.reason}`);
    }

    // Calculate results
    const results = this.calculateResults(session);

    // Create results file
    const resultsFile = 'results.json';
    const resultsFilePath = join(this.minutesDirectory, minuteId, resultsFile);

    const resultsData = {
      minute_id: minuteId,
      generated_by: reporterModel,
      timestamp: new Date().toISOString(),
      auto_generated: true,
      results: results.map(result => ({
        proposal_id: result.proposalId,
        score: result.totalScore,
        status: result.status,
        participation: result.participantCount,
        breakdown: result.voteBreakdown
      }))
    };

    await fs.writeFile(resultsFilePath, JSON.stringify(resultsData, null, 2), 'utf-8');

    // Calculate results file hash
    const resultsFileContent = await fs.readFile(resultsFilePath, 'utf-8');
    const resultsFileHash = createHash('sha256').update(resultsFileContent, 'utf8').digest('hex');

    const resultBlockData: ResultData = {
      resultFile: resultsFile,
      resultFileHash: resultsFileHash,
      results,
      autoGenerated: true
    };

    // Add finalize block to chain
    votingChain.addFinalizeBlock(reporterModel, resultBlockData);

    // Save updated session
    await this.saveVotingSession(votingChain.getSession());

    return results;
  }

  /**
   * Calculate voting results from all votes
   */
  private calculateResults(session: VotingSession): ProposalResult[] {
    const voteBlocks = session.chain.filter(block => block.type === 'vote');
    const proposalResults: Map<string, ProposalResult> = new Map();

    // Initialize results for all proposals
    session.proposals.forEach(proposalId => {
      proposalResults.set(proposalId, {
        proposalId,
        totalScore: 0,
        participantCount: 0,
        status: 'Rejected',
        voteBreakdown: {
          approve: 0,
          reject: 0,
          abstain: 0,
          averageWeight: 0
        }
      });
    });

    // Process all votes
    const allWeights: Map<string, number[]> = new Map();

    voteBlocks.forEach(block => {
      const voteData = block.data as VoteData;

      voteData.votes.forEach(vote => {
        const result = proposalResults.get(vote.proposalId);
        if (!result) return;

        result.participantCount++;
        result.totalScore += vote.weight;

        // Track weights for average calculation
        if (!allWeights.has(vote.proposalId)) {
          allWeights.set(vote.proposalId, []);
        }
        allWeights.get(vote.proposalId)!.push(vote.weight);

        // Categorize vote (weights 7+ = approve, 1-3 = reject, 4-6 = abstain)
        if (vote.weight >= 7) {
          result.voteBreakdown.approve++;
        } else if (vote.weight <= 3) {
          result.voteBreakdown.reject++;
        } else {
          result.voteBreakdown.abstain++;
        }
      });
    });

    // Calculate final results
    proposalResults.forEach((result, proposalId) => {
      const weights = allWeights.get(proposalId) || [];
      result.voteBreakdown.averageWeight = weights.length > 0
        ? weights.reduce((sum, w) => sum + w, 0) / weights.length
        : 0;

      // Determine approval status
      const participationRate = result.participantCount / session.participants.length;
      const approvalRate = result.voteBreakdown.approve / result.participantCount;

      const quorumMet = participationRate >= session.quorumThreshold;
      const approvalMet = approvalRate >= session.approvalThreshold;

      result.status = (quorumMet && approvalMet) ? 'Approved' : 'Rejected';
    });

    return Array.from(proposalResults.values()).sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Get voting progress for a session
   */
  async getVotingProgress(minuteId: string) {
    const session = await this.loadVotingSession(minuteId);
    const votingChain = new VotingChain(session);
    return votingChain.getVotingProgress();
  }

  /**
   * Verify voting chain integrity
   */
  async verifyVotingIntegrity(minuteId: string) {
    const session = await this.loadVotingSession(minuteId);
    const votingChain = new VotingChain(session);
    return votingChain.verifyChainIntegrity();
  }

  /**
   * Update model configuration
   */
  updateModelsConfig(models: ModelProfile[]): void {
    this.modelsConfig = models;
  }

  /**
   * Get list of active voting sessions
   */
  async getActiveSessions(): Promise<VotingSession[]> {
    try {
      const entries = await fs.readdir(this.minutesDirectory, { withFileTypes: true });
      const minuteDirs = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);

      const activeSessions: VotingSession[] = [];

      for (const minuteDir of minuteDirs) {
        try {
          const session = await this.loadVotingSession(minuteDir);
          if (session.status === 'Active') {
            activeSessions.push(session);
          }
        } catch (error) {
          // Skip directories without valid sessions
        }
      }

      return activeSessions;
    } catch (error) {
      return [];
    }
  }
}
