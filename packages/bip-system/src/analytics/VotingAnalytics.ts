/**
 * VotingAnalytics - Analytics and reporting system for BIP voting
 * Provides insights, metrics, and reporting for voting sessions
 */

import { VotingSession, VotingAnalytics, VotingSummary, ParticipationMetrics, ProposalMetrics, TimelineEvent, VoteData, ResultData } from '../types/index.js';

export class VotingAnalyticsService {

  /**
   * Generate comprehensive analytics for a voting session
   */
  generateAnalytics(session: VotingSession): VotingAnalytics {
    const summary = this.generateSummary(session);
    const participationMetrics = this.generateParticipationMetrics(session);
    const proposalMetrics = this.generateProposalMetrics(session);
    const timelineEvents = this.generateTimelineEvents(session);

    return {
      minuteId: session.minuteId,
      generatedAt: new Date(),
      summary,
      participationMetrics,
      proposalMetrics,
      timelineEvents
    };
  }

  /**
   * Generate voting summary
   */
  private generateSummary(session: VotingSession): VotingSummary {
    const voteBlocks = session.chain.filter(block => block.type === 'vote');
    const totalVotingTime = this.calculateAverageVotingTime(session);

    return {
      totalProposals: session.proposals.length,
      totalParticipants: voteBlocks.length,
      participationRate: voteBlocks.length / session.participants.length,
      averageVotingTime: totalVotingTime,
      status: session.status
    };
  }

  /**
   * Generate participation metrics
   */
  private generateParticipationMetrics(session: VotingSession): ParticipationMetrics {
    const voteBlocks = session.chain.filter(block => block.type === 'vote');
    const participatedModels = voteBlocks.map(block => block.model);
    const nonVoters = session.participants.filter(model => !participatedModels.includes(model));

    // Calculate on-time vs late voters (considering first 24 hours as "on-time")
    const onTimeThreshold = new Date(session.startTime.getTime() + 24 * 60 * 60 * 1000);
    const onTimeVoters = voteBlocks.filter(block => block.timestamp <= onTimeThreshold).length;
    const lateVoters = voteBlocks.length - onTimeVoters;

    return {
      expectedVoters: session.participants.length,
      actualVoters: voteBlocks.length,
      onTimeVoters,
      lateVoters,
      nonVoters
    };
  }

  /**
   * Generate proposal-specific metrics
   */
  private generateProposalMetrics(session: VotingSession): ProposalMetrics[] {
    const voteBlocks = session.chain.filter(block => block.type === 'vote');
    const finalizeBlock = session.chain.find(block => block.type === 'finalize');

    // Get results if finalized
    const results = finalizeBlock ? (finalizeBlock.data as ResultData).results : [];

    return session.proposals.map(proposalId => {
      const proposalVotes = this.getVotesForProposal(voteBlocks, proposalId);
      const weights = proposalVotes.map(vote => vote.weight);

      const result = results.find(r => r.proposalId === proposalId);
      const finalScore = result?.totalScore || 0;
      const status = result?.status || 'Pending';

      // Calculate consensus and controversy metrics
      const consensusLevel = this.calculateConsensusLevel(weights);
      const controversyScore = this.calculateControversyScore(weights);

      return {
        proposalId,
        title: `Proposal ${proposalId}`, // Would be loaded from BIP manager
        author: 'Unknown', // Would be loaded from BIP manager
        finalScore,
        status: status as 'Approved' | 'Rejected',
        consensusLevel,
        controversyScore
      };
    });
  }

  /**
   * Generate timeline of events
   */
  private generateTimelineEvents(session: VotingSession): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Session start
    events.push({
      timestamp: session.startTime,
      type: 'session-start',
      description: `Voting session ${session.minuteId} started`
    });

    // Vote events
    const voteBlocks = session.chain.filter(block => block.type === 'vote');
    voteBlocks.forEach(block => {
      events.push({
        timestamp: block.timestamp,
        type: 'vote-received',
        model: block.model,
        description: `Vote received from ${block.model}`
      });
    });

    // Finalization event
    const finalizeBlock = session.chain.find(block => block.type === 'finalize');
    if (finalizeBlock) {
      events.push({
        timestamp: finalizeBlock.timestamp,
        type: 'session-finalized',
        model: finalizeBlock.model,
        description: `Session finalized by ${finalizeBlock.model}`
      });
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate average voting time in minutes
   */
  private calculateAverageVotingTime(session: VotingSession): number {
    const voteBlocks = session.chain.filter(block => block.type === 'vote');

    if (voteBlocks.length === 0) return 0;

    const votingTimes = voteBlocks.map(block => {
      const timeDiff = block.timestamp.getTime() - session.startTime.getTime();
      return timeDiff / (1000 * 60); // Convert to minutes
    });

    return votingTimes.reduce((sum, time) => sum + time, 0) / votingTimes.length;
  }

  /**
   * Get votes for a specific proposal
   */
  private getVotesForProposal(voteBlocks: any[], proposalId: string): { weight: number; model: string }[] {
    const proposalVotes: { weight: number; model: string }[] = [];

    voteBlocks.forEach(block => {
      const voteData = block.data as VoteData;
      const proposalVote = voteData.votes.find(vote => vote.proposalId === proposalId);

      if (proposalVote) {
        proposalVotes.push({
          weight: proposalVote.weight,
          model: block.model
        });
      }
    });

    return proposalVotes;
  }

  /**
   * Calculate consensus level (0-1, how unified the votes were)
   */
  private calculateConsensusLevel(weights: number[]): number {
    if (weights.length === 0) return 0;

    const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
    const standardDeviation = Math.sqrt(variance);

    // Normalize standard deviation to 0-1 scale (lower std dev = higher consensus)
    // Max possible std dev for weights 1-10 is about 3.16
    return Math.max(0, 1 - (standardDeviation / 3.16));
  }

  /**
   * Calculate controversy score (variance in votes)
   */
  private calculateControversyScore(weights: number[]): number {
    if (weights.length === 0) return 0;

    const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;

    // Normalize variance to 0-1 scale
    const maxVariance = 8.25; // Theoretical max for weights 1-10
    return Math.min(1, variance / maxVariance);
  }

  /**
   * Generate participation trends over time
   */
  generateParticipationTrend(session: VotingSession): { hour: number; cumulativeVotes: number; hourlyVotes: number }[] {
    const voteBlocks = session.chain.filter(block => block.type === 'vote');
    const sessionDurationHours = Math.ceil(
      (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60)
    );

    const trend: { hour: number; cumulativeVotes: number; hourlyVotes: number }[] = [];
    let cumulativeVotes = 0;

    for (let hour = 0; hour <= sessionDurationHours; hour++) {
      const hourStart = new Date(session.startTime.getTime() + hour * 60 * 60 * 1000);
      const hourEnd = new Date(session.startTime.getTime() + (hour + 1) * 60 * 60 * 1000);

      const votesInHour = voteBlocks.filter(block =>
        block.timestamp >= hourStart && block.timestamp < hourEnd
      ).length;

      cumulativeVotes += votesInHour;

      trend.push({
        hour,
        cumulativeVotes,
        hourlyVotes: votesInHour
      });
    }

    return trend;
  }

  /**
   * Generate model performance metrics
   */
  generateModelMetrics(session: VotingSession): {
    model: string;
    participated: boolean;
    votingTime?: number;
    averageWeight?: number;
    totalProposalsVoted?: number;
  }[] {
    const voteBlocks = session.chain.filter(block => block.type === 'vote');

    return session.participants.map(modelId => {
      const modelVote = voteBlocks.find(block => block.model === modelId);

      if (!modelVote) {
        return {
          model: modelId,
          participated: false
        };
      }

      const voteData = modelVote.data as VoteData;
      const votingTime = (modelVote.timestamp.getTime() - session.startTime.getTime()) / (1000 * 60); // minutes
      const weights = voteData.votes.map(vote => vote.weight);
      const averageWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;

      return {
        model: modelId,
        participated: true,
        votingTime,
        averageWeight,
        totalProposalsVoted: voteData.votes.length
      };
    });
  }

  /**
   * Export analytics to JSON
   */
  exportAnalyticsToJSON(analytics: VotingAnalytics): string {
    return JSON.stringify({
      ...analytics,
      generatedAt: analytics.generatedAt.toISOString(),
      timelineEvents: analytics.timelineEvents.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString()
      }))
    }, null, 2);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(analytics: VotingAnalytics): string {
    const { summary, participationMetrics, proposalMetrics, timelineEvents } = analytics;

    const sections = [
      `# Voting Analytics Report - ${analytics.minuteId}`,
      `*Generated on ${analytics.generatedAt.toISOString()}*`,
      '',
      '## Summary',
      `- **Total Proposals**: ${summary.totalProposals}`,
      `- **Participation Rate**: ${(summary.participationRate * 100).toFixed(1)}%`,
      `- **Average Voting Time**: ${summary.averageVotingTime.toFixed(1)} minutes`,
      `- **Status**: ${summary.status}`,
      '',
      '## Participation Metrics',
      `- **Expected Voters**: ${participationMetrics.expectedVoters}`,
      `- **Actual Voters**: ${participationMetrics.actualVoters}`,
      `- **On-time Voters**: ${participationMetrics.onTimeVoters}`,
      `- **Late Voters**: ${participationMetrics.lateVoters}`,
      `- **Non-voters**: ${participationMetrics.nonVoters.join(', ') || 'None'}`,
      '',
      '## Proposal Results',
      '| Proposal | Final Score | Status | Consensus | Controversy |',
      '|----------|-------------|--------|-----------|-------------|'
    ];

    proposalMetrics.forEach(proposal => {
      sections.push(
        `| ${proposal.proposalId} | ${proposal.finalScore} | ${proposal.status} | ${(proposal.consensusLevel * 100).toFixed(1)}% | ${(proposal.controversyScore * 100).toFixed(1)}% |`
      );
    });

    sections.push(
      '',
      '## Timeline',
      ''
    );

    timelineEvents.forEach(event => {
      const timeStr = event.timestamp.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      const modelStr = event.model ? ` (${event.model})` : '';
      sections.push(`- **${timeStr}**: ${event.description}${modelStr}`);
    });

    return sections.join('\n');
  }
}
