#!/usr/bin/env node

/**
 * @fileoverview CLI Tool for Vote Hash Generation
 * @author CMMV-Hive Team
 * @version 1.0.0
 *
 * This CLI tool provides standardized SHA256 hash generation for vote signatures
 * ensuring all models use consistent hashing methods for governance integrity
 */

import { readFileSync } from 'fs';
import { VoteHashService } from './hash.js';
import type { Vote, ModelIdentity, Proposal } from '../../shared-types/src/index.js';

interface CLIOptions {
  command: 'vote' | 'proposal' | 'identity' | 'batch' | 'session' | 'verify';
  input?: string;
  file?: string;
  output?: string;
  key?: string;
  help?: boolean;
}

class VoteHashCLI {
  private static parseArgs(): CLIOptions {
    const args = process.argv.slice(2);
    const options: CLIOptions = {
      command: 'vote'
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--help':
        case '-h':
          options.help = true;
          break;
        case '--vote':
        case '-v':
          options.command = 'vote';
          break;
        case '--proposal':
        case '-p':
          options.command = 'proposal';
          break;
        case '--identity':
        case '-i':
          options.command = 'identity';
          break;
        case '--batch':
        case '-b':
          options.command = 'batch';
          break;
        case '--session':
        case '-s':
          options.command = 'session';
          break;
        case '--verify':
          options.command = 'verify';
          break;
        case '--input':
        case '-d': {
          const inputValue = args[++i];
          if (inputValue !== undefined) {
            options.input = inputValue;
          }
          break;
        }
        case '--file':
        case '-f': {
          const fileValue = args[++i];
          if (fileValue !== undefined) {
            options.file = fileValue;
          }
          break;
        }
        case '--output':
        case '-o': {
          const outputValue = args[++i];
          if (outputValue !== undefined) {
            options.output = outputValue;
          }
          break;
        }
        case '--key':
        case '-k': {
          const keyValue = args[++i];
          if (keyValue !== undefined) {
            options.key = keyValue;
          }
          break;
        }
        default:
          if (arg && !arg.startsWith('-')) {
            options.input = arg;
          }
          break;
      }
    }

    return options;
  }

  private static showHelp(): void {
    console.log(`
CMMV-Hive Vote Hash Generator CLI
==================================

Standardized SHA256 hash generation for vote signatures and governance integrity.

USAGE:
  vote-hash [command] [options]

COMMANDS:
  vote, -v       Generate hash for a single vote (default)
  proposal, -p   Generate hash for a proposal
  identity, -i   Generate hash for model identity
  batch, -b      Generate batch hash for multiple votes
  session, -s    Generate hash for voting session
  verify         Verify hash against input data

OPTIONS:
  -d, --input    Input data as JSON string
  -f, --file     Input file path (JSON format)
  -o, --output   Output file path (optional)
  -k, --key      HMAC key for authenticated hashing (optional)
  -h, --help     Show this help message

EXAMPLES:
  # Generate hash for a vote from file
  vote-hash --vote --file vote.json

  # Generate hash for a proposal with HMAC
  vote-hash --proposal --file proposal.json --key my-secret-key

  # Verify a hash
  vote-hash verify --input '{"hash":"abc123","data":{...}}'

  # Generate batch hash for multiple votes
  vote-hash --batch --file votes.json

OUTPUT FORMAT:
  The tool outputs JSON with the following structure:
  {
    "hash": "sha256_hash_here",
    "algorithm": "sha256",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "inputType": "vote|proposal|identity|batch|session"
  }

GOVERNANCE REQUIREMENT:
  All models in CMMV-Hive MUST use this CLI tool for generating vote hashes
  to ensure consistency and integrity in the governance system.
`);
  }

  private static loadJSONFromFile(filePath: string): any {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  private static parseJSON(input: string): any {
    try {
      const data = JSON.parse(input);

      // Convert timestamp strings to Date objects for Vote objects
      if (data && typeof data === 'object') {
        this.convertTimestampsToDates(data);
      }

      return data;
    } catch (error) {
      console.error('Error parsing JSON input:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  private static convertTimestampsToDates(obj: any): void {
    // Convert timestamp strings to Date objects
    if (obj.timestamp && typeof obj.timestamp === 'string') {
      try {
        obj.timestamp = new Date(obj.timestamp);
      } catch (error) {
        // If conversion fails, leave as string
        console.warn('Warning: Could not parse timestamp:', obj.timestamp);
      }
    }

    // Handle nested objects (like proposals with author timestamps)
    if (obj.author && typeof obj.author === 'object') {
      if (obj.author.createdAt && typeof obj.author.createdAt === 'string') {
        try {
          obj.author.createdAt = new Date(obj.author.createdAt);
        } catch (error) {
          console.warn('Warning: Could not parse author.createdAt:', obj.author.createdAt);
        }
      }
      if (obj.author.expiresAt && typeof obj.author.expiresAt === 'string') {
        try {
          obj.author.expiresAt = new Date(obj.author.expiresAt);
        } catch (error) {
          console.warn('Warning: Could not parse author.expiresAt:', obj.author.expiresAt);
        }
      }
    }

    // Handle other timestamp fields
    if (obj.createdAt && typeof obj.createdAt === 'string') {
      try {
        obj.createdAt = new Date(obj.createdAt);
      } catch (error) {
        console.warn('Warning: Could not parse createdAt:', obj.createdAt);
      }
    }

    if (obj.updatedAt && typeof obj.updatedAt === 'string') {
      try {
        obj.updatedAt = new Date(obj.updatedAt);
      } catch (error) {
        console.warn('Warning: Could not parse updatedAt:', obj.updatedAt);
      }
    }

    if (obj.signedAt && typeof obj.signedAt === 'string') {
      try {
        obj.signedAt = new Date(obj.signedAt);
      } catch (error) {
        console.warn('Warning: Could not parse signedAt:', obj.signedAt);
      }
    }

    // Handle arrays (for batch operations)
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        if (typeof item === 'object') {
          this.convertTimestampsToDates(item);
        }
      });
    }
  }

  private static generateOutput(hash: string, inputType: string, hmac?: boolean): any {
    return {
      hash,
      algorithm: hmac ? 'hmac-sha256' : 'sha256',
      timestamp: new Date().toISOString(),
      inputType,
      governance: {
        standard: 'CMMV-Hive Vote Hash Standard v1.0',
        requirement: 'All models must use this standardized hashing method'
      }
    };
  }

  private static writeOutput(output: any, outputPath?: string): void {
    const jsonOutput = JSON.stringify(output, null, 2);

    if (outputPath) {
      try {
        require('fs').writeFileSync(outputPath, jsonOutput);
        console.log(`Output written to ${outputPath}`);
      } catch (error) {
        console.error(`Error writing to file ${outputPath}:`, error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    } else {
      console.log(jsonOutput);
    }
  }

  static async run(): Promise<void> {
    const options = this.parseArgs();

    if (options.help) {
      this.showHelp();
      return;
    }

    let inputData: any;

    if (options.file) {
      inputData = this.loadJSONFromFile(options.file);
    } else if (options.input) {
      inputData = this.parseJSON(options.input);
    } else {
      console.error('Error: No input data provided. Use --input or --file option.');
      process.exit(1);
    }

    try {
      let hash: string;
      let inputType: string;

      switch (options.command) {
        case 'vote':
          hash = VoteHashService.generateVoteHash(inputData as Vote);
          inputType = 'vote';
          break;

        case 'proposal':
          hash = VoteHashService.generateProposalHash(inputData as Proposal);
          inputType = 'proposal';
          break;

        case 'identity':
          hash = VoteHashService.generateModelIdentityHash(inputData as ModelIdentity);
          inputType = 'identity';
          break;

        case 'batch':
          if (!Array.isArray(inputData)) {
            console.error('Error: Batch input must be an array of votes');
            process.exit(1);
          }
          hash = VoteHashService.generateBatchVoteHash(inputData as Vote[]);
          inputType = 'batch';
          break;

        case 'session': {
          const { sessionId, proposalIds, startTime, endTime } = inputData;
          if (!sessionId || !proposalIds || !startTime || !endTime) {
            console.error('Error: Session input must contain sessionId, proposalIds, startTime, and endTime');
            process.exit(1);
          }
          hash = VoteHashService.generateVotingSessionHash(
            sessionId,
            proposalIds,
            new Date(startTime),
            new Date(endTime)
          );
          inputType = 'session';
          break;
        }

        case 'verify': {
          const { hash: expectedHash, data, type = 'vote' } = inputData;
          if (!expectedHash || !data) {
            console.error('Error: Verify input must contain hash and data fields');
            process.exit(1);
          }

          let isValid: boolean;
          switch (type) {
            case 'vote':
              isValid = VoteHashService.verifyVoteHash(data as Vote, expectedHash);
              break;
            default:
              console.error(`Error: Unsupported verification type: ${type}`);
              process.exit(1);
          }

          const output = {
            valid: isValid,
            expectedHash,
            computedHash: type === 'vote' ? VoteHashService.generateVoteHash(data as Vote) : null,
            timestamp: new Date().toISOString(),
            type
          };

          this.writeOutput(output, options.output);
          return;
        }

        default:
          console.error(`Error: Unknown command ${options.command}`);
          process.exit(1);
      }

      // Apply HMAC if key is provided
      if (options.key && hash) {
        hash = VoteHashService.generateHMAC(hash, options.key);
      }

      const output = this.generateOutput(hash, inputType, !!options.key);
      this.writeOutput(output, options.output);

    } catch (error) {
      console.error('Error processing request:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  VoteHashCLI.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
