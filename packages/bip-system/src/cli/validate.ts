#!/usr/bin/env node
/**
 * BIP Validation CLI Tool
 * Command-line interface for validating BIP proposals
 */

import { BIPManager } from '../proposal/BIPManager.js';

interface CLIOptions {
  bipNumber?: string;
  file?: string;
  all?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--bip':
      case '-b': {
        const value = args[++i];
        if (value !== undefined) options.bipNumber = value;
        break;
      }
      case '--file':
      case '-f': {
        const value = args[++i];
        if (value !== undefined) options.file = value;
        break;
      }
      case '--all':
      case '-a':
        options.all = true;
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
BIP Validation Tool

Usage:
  bip-validate --bip <number>      Validate specific BIP
  bip-validate --file <path>       Validate BIP from file
  bip-validate --all               Validate all BIPs
  bip-validate --help              Show this help

Options:
  -b, --bip <number>    BIP number (e.g., BIP-01)
  -f, --file <path>     Path to BIP markdown file
  -a, --all             Validate all BIPs in repository
  -h, --help            Show this help

Examples:
  # Validate specific BIP
  bip-validate --bip BIP-01

  # Validate from file
  bip-validate --file ./my-proposal.md

  # Validate all BIPs
  bip-validate --all
`);
}

async function validateBIP(bipNumber: string, bipManager: BIPManager): Promise<void> {
  try {
    console.log(`🔍 Validating ${bipNumber}...`);

    const proposal = await bipManager.loadBIP(bipNumber);
    const validation = bipManager.validateBIP(proposal);

    console.log(`\n📄 ${proposal.number}: ${proposal.title}`);
    console.log(`👤 Author: ${proposal.author}`);
    console.log(`📊 Type: ${proposal.type}`);
    console.log(`🏷️  Category: ${proposal.category}`);
    console.log(`📈 Status: ${proposal.status}`);
    console.log(`📅 Created: ${proposal.created.toISOString().split('T')[0]}`);

    if (validation.isValid) {
      console.log(`✅ Validation: PASSED`);
    } else {
      console.log(`❌ Validation: FAILED`);
      console.log(`\nErrors:`);
      validation.errors.forEach(error => {
        console.log(`   ❌ ${error}`);
      });
    }

    // Show content statistics
    console.log(`\nContent Statistics:`);
    console.log(`   Abstract: ${proposal.abstract.length} characters`);
    console.log(`   Motivation: ${proposal.motivation.length} characters`);
    console.log(`   Specification: ${proposal.specification.length} characters`);
    console.log(`   Rationale: ${proposal.rationale.length} characters`);
    console.log(`   Changelog entries: ${proposal.changelog.length}`);

  } catch (error) {
    console.error(`❌ Error validating ${bipNumber}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateAllBIPs(bipManager: BIPManager): Promise<void> {
  try {
    console.log(`🔍 Loading all BIPs...`);

    const bips = await bipManager.listBIPs();

    if (bips.length === 0) {
      console.log(`ℹ️  No BIPs found in repository`);
      return;
    }

    console.log(`\n📊 Validation Summary`);
    console.log('═'.repeat(70));

    let passedCount = 0;
    let failedCount = 0;

    for (const bip of bips) {
      const validation = bipManager.validateBIP(bip);
      const status = validation.isValid ? '✅ PASS' : '❌ FAIL';
      const statusColor = validation.isValid ? '\x1b[32m' : '\x1b[31m'; // Green or Red
      const resetColor = '\x1b[0m';

      console.log(`${statusColor}${status}${resetColor} ${bip.number.padEnd(8)} ${bip.title}`);

      if (!validation.isValid) {
        validation.errors.forEach(error => {
          console.log(`       ❌ ${error}`);
        });
      }

      if (validation.isValid) {
        passedCount++;
      } else {
        failedCount++;
      }
    }

    console.log('═'.repeat(70));
    console.log(`📈 Results: ${passedCount} passed, ${failedCount} failed out of ${bips.length} total`);

    if (failedCount === 0) {
      console.log(`🎉 All BIPs are valid!`);
    } else {
      console.log(`⚠️  ${failedCount} BIP(s) need attention`);
    }

  } catch (error) {
    console.error(`❌ Error validating BIPs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateFromFile(filePath: string, bipManager: BIPManager): Promise<void> {
  try {
    const fs = await import('fs/promises');

    console.log(`🔍 Validating file: ${filePath}`);

    const content = await fs.readFile(filePath, 'utf-8');

    // Parse BIP from markdown content
    const proposal = (bipManager as any).parseBIPFromMarkdown(content);
    const validation = bipManager.validateBIP(proposal);

    console.log(`\n📄 ${proposal.number}: ${proposal.title}`);

    if (validation.isValid) {
      console.log(`✅ Validation: PASSED`);
      console.log(`✨ The BIP file is valid and ready for submission`);
    } else {
      console.log(`❌ Validation: FAILED`);
      console.log(`\nErrors that need to be fixed:`);
      validation.errors.forEach(error => {
        console.log(`   ❌ ${error}`);
      });
    }

  } catch (error) {
    console.error(`❌ Error validating file: ${error instanceof Error ? error.message : String(error)}`);
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

    const bipManager = new BIPManager();

    if (options.all) {
      await validateAllBIPs(bipManager);
    } else if (options.bipNumber) {
      await validateBIP(options.bipNumber, bipManager);
    } else if (options.file) {
      await validateFromFile(options.file, bipManager);
    } else {
      console.error('❌ Please specify what to validate. Use --help for usage information.');
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
