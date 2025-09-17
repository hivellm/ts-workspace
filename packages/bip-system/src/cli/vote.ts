#!/usr/bin/env node
/**
 * BIP Voting CLI Tool
 * Command-line interface for submitting votes in BIP voting sessions
 */

import { VotingManager } from '../voting/VotingManager.js';
import { NotificationManager } from '../notifications/NotificationManager.js';
import { ProposalVote, ModelProfile } from '../types/index.js';

interface CLIOptions {
  minuteId?: string;
  modelId?: string;
  votes?: string; // JSON string of votes
  voteFile?: string;
  status?: boolean;
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
      case '--model':
      case '-o': {
        const value = args[++i];
        if (value !== undefined) options.modelId = value;
        break;
      }
      case '--votes':
      case '-v': {
        const value = args[++i];
        if (value !== undefined) options.votes = value;
        break;
      }
      case '--file':
      case '-f': {
        const value = args[++i];
        if (value !== undefined) options.voteFile = value;
        break;
      }
      case '--status':
      case '-s':
        options.status = true;
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
BIP Voting Tool

Usage:
  bip-vote --minute <id> --model <model-id> --votes <json>
  bip-vote --minute <id> --model <model-id> --file <vote-file>
  bip-vote --minute <id> --status

Options:
  -m, --minute <id>         Voting session minute ID
  -o, --model <model-id>    Model identifier (e.g., gpt-5, claude-4-sonnet)
  -v, --votes <json>        Votes as JSON string
  -f, --file <file>         Load votes from JSON file
  -s, --status             Show voting session status
  -h, --help               Show this help

Vote JSON Format:
  [
    {"proposalId": "BIP-01", "weight": 8, "justification": "Strong support"},
    {"proposalId": "BIP-02", "weight": 3, "justification": "Concerns about implementation"}
  ]

Weight Scale: 1-10 (1=Strong Reject, 10=Strong Approve)
- 1-3: Reject
- 4-6: Abstain/Neutral
- 7-10: Approve

Examples:
  # Submit vote via command line
  bip-vote -m 0003 -o gpt-5 -v '[{"proposalId":"BIP-01","weight":8}]'

  # Submit vote from file
  bip-vote -m 0003 -o gpt-5 -f my-votes.json

  # Check voting status
  bip-vote -m 0003 --status
`);
}

async function loadVotesFromFile(filename: string): Promise<ProposalVote[]> {
  const fs = await import('fs/promises');
  try {
    const content = await fs.readFile(filename, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load votes from file ${filename}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateVotes(votes: ProposalVote[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(votes)) {
    errors.push('Votes must be an array');
    return { isValid: false, errors };
  }

  if (votes.length === 0) {
    errors.push('At least one vote is required');
  }

  votes.forEach((vote, index) => {
    if (!vote.proposalId) {
      errors.push(`Vote ${index}: proposalId is required`);
    }

    if (typeof vote.weight !== 'number' || vote.weight < 1 || vote.weight > 10) {
      errors.push(`Vote ${index}: weight must be a number between 1 and 10`);
    }

    if (vote.justification && typeof vote.justification !== 'string') {
      errors.push(`Vote ${index}: justification must be a string`);
    }
  });

  // Check for duplicate proposals
  const proposalIds = votes.map(v => v.proposalId);
  const duplicates = proposalIds.filter((id, index) => proposalIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate votes for proposals: ${duplicates.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function showVotingStatus(minuteId: string): Promise<void> {
  const votingManager = new VotingManager();

  try {
    const session = await votingManager.loadVotingSession(minuteId);
    const progress = await votingManager.getVotingProgress(minuteId);
    const canFinalize = await votingManager.canFinalize(minuteId);

    console.log(`\n📊 Voting Status for Minute ${minuteId}`);
    console.log('═'.repeat(50));
    console.log(`📋 Proposals: ${session.proposals.join(', ')}`);
    console.log(`⏰ Started: ${session.startTime.toISOString()}`);
    console.log(`⏳ Deadline: ${session.endTime.toISOString()}`);
    console.log(`📊 Status: ${session.status}`);
    console.log(`🎯 Quorum: ${(session.quorumThreshold * 100).toFixed(0)}%`);
    console.log(`✅ Approval: ${(session.approvalThreshold * 100).toFixed(0)}%`);

    console.log(`\n📈 Progress:`);
    console.log(`   Votes: ${progress.totalVotes}/${progress.expectedVotes} (${(progress.participationRate * 100).toFixed(1)}%)`);
    console.log(`   Finalized: ${progress.isFinalized ? 'Yes' : 'No'}`);

    if (progress.participatingModels.length > 0) {
      console.log(`\n✅ Voted: ${progress.participatingModels.join(', ')}`);
    }

    if (progress.missingModels.length > 0) {
      console.log(`\n⏳ Pending: ${progress.missingModels.join(', ')}`);
    }

    console.log(`\n🔄 Can Finalize: ${canFinalize.canFinalize ? 'Yes' : 'No'}`);
    console.log(`   Reason: ${canFinalize.reason}`);

    // Show chain integrity
    const integrity = await votingManager.verifyVotingIntegrity(minuteId);
    console.log(`\n🔒 Chain Integrity: ${integrity.isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (!integrity.isValid) {
      integrity.errors.forEach(error => console.log(`   ❌ ${error}`));
    }

  } catch (error) {
    console.error(`❌ Error getting status: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function submitVote(minuteId: string, modelId: string, votes: ProposalVote[]): Promise<void> {
  const votingManager = new VotingManager();
  const notificationManager = new NotificationManager();

  try {
    console.log(`\n🗳️  Submitting vote for ${modelId} in minute ${minuteId}...`);

    const block = await votingManager.submitVote(minuteId, modelId, votes);

    console.log(`✅ Vote submitted successfully!`);
    console.log(`📄 Vote file: ${(block.data as any).voteFile}`);
    console.log(`🔒 File hash: ${(block.data as any).voteFileHash}`);
    console.log(`⛓️  Block hash: ${block.hash}`);
    console.log(`📅 Timestamp: ${block.timestamp.toISOString()}`);

    // Show vote breakdown
    console.log(`\n📋 Your votes:`);
    votes.forEach(vote => {
      const weightLabel = vote.weight >= 7 ? '✅ Approve' : vote.weight <= 3 ? '❌ Reject' : '🤔 Abstain';
      console.log(`   ${vote.proposalId}: ${vote.weight}/10 (${weightLabel})`);
      if (vote.justification) {
        console.log(`      "${vote.justification}"`);
      }
    });

    // Check if all votes are in
    const progress = await votingManager.getVotingProgress(minuteId);

    if (progress.totalVotes === progress.expectedVotes) {
      console.log(`\n🎉 All votes received! Session ready for finalization.`);

      // Send completion notification
      const session = await votingManager.loadVotingSession(minuteId);
      await notificationManager.notifyVotingComplete(minuteId, session.participants);
    } else {
      console.log(`\n⏳ Waiting for ${progress.missingModels.length} more vote(s): ${progress.missingModels.join(', ')}`);

      // Send vote received notification
      await notificationManager.notifyVoteReceived(minuteId, modelId, progress.missingModels);
    }

  } catch (error) {
    console.error(`❌ Error submitting vote: ${error instanceof Error ? error.message : String(error)}`);
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

    // Show status
    if (options.status) {
      await showVotingStatus(options.minuteId);
      return;
    }

    // Submit vote
    if (!options.modelId) {
      console.error('❌ Model ID is required for voting. Use --model <model-id>');
      showUsage();
      process.exit(1);
    }

    let votes: ProposalVote[];

    if (options.voteFile) {
      votes = await loadVotesFromFile(options.voteFile);
    } else if (options.votes) {
      try {
        votes = JSON.parse(options.votes);
      } catch (error) {
        console.error('❌ Invalid JSON in votes parameter');
        process.exit(1);
      }
    } else {
      console.error('❌ Votes are required. Use --votes <json> or --file <filename>');
      showUsage();
      process.exit(1);
    }

    // Validate votes
    const validation = validateVotes(votes);
    if (!validation.isValid) {
      console.error('❌ Vote validation failed:');
      validation.errors.forEach(error => console.error(`   ${error}`));
      process.exit(1);
    }

    await submitVote(options.minuteId, options.modelId, votes);

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
