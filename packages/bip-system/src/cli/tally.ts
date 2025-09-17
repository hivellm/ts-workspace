#!/usr/bin/env node
/**
 * BIP Vote Tallying CLI Tool
 * Command-line interface for finalizing votes and generating results
 */

import { VotingManager } from '../voting/VotingManager.js';
import { VotingAnalyticsService } from '../analytics/VotingAnalytics.js';
import { NotificationManager } from '../notifications/NotificationManager.js';

interface CLIOptions {
  minuteId?: string;
  reporter?: string;
  analytics?: boolean;
  force?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--minute':
      case '-m': {
        const value = args[++i];
        if (value !== undefined) options.minuteId = value;
        break;
      }
      case '--reporter':
      case '-r': {
        const value = args[++i];
        if (value !== undefined) options.reporter = value;
        break;
      }
      case '--analytics':
      case '-a':
        options.analytics = true;
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showUsage(): void {
  console.log(`
BIP Vote Tallying Tool

Usage:
  bip-tally --minute <id> --reporter <model-id>
  bip-tally --minute <id> --analytics

Options:
  -m, --minute <id>         Voting session minute ID
  -r, --reporter <model>    Reporter model ID (for finalization)
  -a, --analytics          Generate analytics report only
  -f, --force              Force finalization even if deadline not reached
  -h, --help               Show this help

Examples:
  # Finalize voting session
  bip-tally -m 0003 -r gemini-2.5-flash

  # Generate analytics only
  bip-tally -m 0003 --analytics

  # Force finalization before deadline
  bip-tally -m 0003 -r gpt-5 --force

Note: Only use --force when all expected votes are received or in emergency situations.
`);
}

async function showAnalytics(minuteId: string): Promise<void> {
  const votingManager = new VotingManager();
  const analyticsService = new VotingAnalyticsService();

  try {
    console.log(`📊 Generating analytics for minute ${minuteId}...`);

    const session = await votingManager.loadVotingSession(minuteId);
    const analytics = analyticsService.generateAnalytics(session);
    const progress = await votingManager.getVotingProgress(minuteId);

    console.log(`\n📈 Voting Analytics Report`);
    console.log('═'.repeat(60));

    // Summary
    console.log(`📋 Session: ${analytics.minuteId}`);
    console.log(`📅 Generated: ${analytics.generatedAt.toISOString()}`);
    console.log(`📊 Status: ${analytics.summary.status}`);
    console.log(`🎯 Proposals: ${analytics.summary.totalProposals}`);
    console.log(`👥 Participants: ${analytics.summary.totalParticipants}/${analytics.participationMetrics.expectedVoters}`);
    console.log(`📈 Participation Rate: ${(analytics.summary.participationRate * 100).toFixed(1)}%`);
    console.log(`⏱️  Average Voting Time: ${analytics.summary.averageVotingTime.toFixed(1)} minutes`);

    // Participation Details
    console.log(`\n👥 Participation Breakdown:`);
    console.log(`   On-time voters: ${analytics.participationMetrics.onTimeVoters}`);
    console.log(`   Late voters: ${analytics.participationMetrics.lateVoters}`);
    console.log(`   Non-voters: ${analytics.participationMetrics.nonVoters.length}`);

    if (analytics.participationMetrics.nonVoters.length > 0) {
      console.log(`   Missing: ${analytics.participationMetrics.nonVoters.join(', ')}`);
    }

    // Proposal Results
    if (analytics.proposalMetrics.length > 0) {
      console.log(`\n📋 Proposal Results:`);
      console.log('─'.repeat(80));
      console.log('Proposal'.padEnd(12) + 'Score'.padEnd(8) + 'Status'.padEnd(10) + 'Consensus'.padEnd(12) + 'Controversy');
      console.log('─'.repeat(80));

      analytics.proposalMetrics.forEach(proposal => {
        const consensus = `${(proposal.consensusLevel * 100).toFixed(0)}%`;
        const controversy = `${(proposal.controversyScore * 100).toFixed(0)}%`;
        const statusIcon = proposal.status === 'Approved' ? '✅' : '❌';

        console.log(
          proposal.proposalId.padEnd(12) +
          proposal.finalScore.toString().padEnd(8) +
          `${statusIcon} ${proposal.status}`.padEnd(12) +
          consensus.padEnd(12) +
          controversy
        );
      });
    }

    // Timeline
    console.log(`\n⏰ Timeline (last 5 events):`);
    const recentEvents = analytics.timelineEvents.slice(-5);
    recentEvents.forEach(event => {
      const timeStr = event.timestamp.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      const modelStr = event.model ? ` (${event.model})` : '';
      console.log(`   ${timeStr}: ${event.description}${modelStr}`);
    });

    // Chain integrity
    const integrity = await votingManager.verifyVotingIntegrity(minuteId);
    console.log(`\n🔒 Chain Integrity: ${integrity.isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (!integrity.isValid) {
      integrity.errors.forEach(error => console.log(`   ❌ ${error}`));
    }

  } catch (error) {
    console.error(`❌ Error generating analytics: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function finalizeVoting(minuteId: string, reporter: string, force: boolean = false): Promise<void> {
  const votingManager = new VotingManager();
  const notificationManager = new NotificationManager();

  try {
    console.log(`🏁 Finalizing voting session ${minuteId}...`);

    // Check if can finalize
    const canFinalize = await votingManager.canFinalize(minuteId);

    if (!canFinalize.canFinalize && !force) {
      console.error(`❌ Cannot finalize: ${canFinalize.reason}`);
      console.log(`💡 Use --force to override (use carefully)`);
      process.exit(1);
    }

    if (force && !canFinalize.canFinalize) {
      console.log(`⚠️  FORCE MODE: Overriding finalization check`);
      console.log(`   Reason: ${canFinalize.reason}`);
    }

    // Get session info
    const session = await votingManager.loadVotingSession(minuteId);
    const progress = await votingManager.getVotingProgress(minuteId);

    console.log(`📊 Session Status:`);
    console.log(`   Votes: ${progress.totalVotes}/${progress.expectedVotes}`);
    console.log(`   Participation: ${(progress.participationRate * 100).toFixed(1)}%`);
    console.log(`   Reporter: ${reporter}`);

    // Finalize
    const results = await votingManager.finalizeVoting(minuteId, reporter);

    console.log(`✅ Voting finalized successfully!`);
    console.log(`📄 Results file: docs/minutes/${minuteId}/results.json`);

    // Show results summary
    const approved = results.filter(r => r.status === 'Approved');
    const rejected = results.filter(r => r.status === 'Rejected');

    console.log(`\n📊 Results Summary:`);
    console.log(`   ✅ Approved: ${approved.length}`);
    console.log(`   ❌ Rejected: ${rejected.length}`);

    if (approved.length > 0) {
      console.log(`\n✅ Approved Proposals:`);
      approved.forEach(result => {
        console.log(`   ${result.proposalId}: ${result.totalScore} points (${result.participantCount} votes)`);
      });
    }

    if (rejected.length > 0) {
      console.log(`\n❌ Rejected Proposals:`);
      rejected.forEach(result => {
        console.log(`   ${result.proposalId}: ${result.totalScore} points (${result.participantCount} votes)`);
      });
    }

    // Send notifications
    console.log(`\n📬 Sending finalization notifications...`);
    await notificationManager.notifyVotingFinalized(
      minuteId,
      session.participants,
      reporter,
      approved.map(r => r.proposalId),
      rejected.map(r => r.proposalId)
    );
    console.log(`✅ Notifications sent to ${session.participants.length} participants`);

  } catch (error) {
    console.error(`❌ Error finalizing voting: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.help || args.length === 0) {
      showUsage();
      return;
    }

    if (!options.minuteId) {
      console.error('❌ Minute ID is required. Use --minute <id>');
      showUsage();
      process.exit(1);
    }

    if (options.analytics) {
      await showAnalytics(options.minuteId);
    } else if (options.reporter) {
      await finalizeVoting(options.minuteId, options.reporter, options.force);
    } else {
      console.error('❌ Please specify --reporter for finalization or --analytics for report generation');
      showUsage();
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
