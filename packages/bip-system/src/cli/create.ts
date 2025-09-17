#!/usr/bin/env node
/**
 * BIP Creation CLI Tool
 * Command-line interface for creating new BIP proposals
 */

import { BIPManager } from '../proposal/BIPManager.js';
import { BIPType, BIPCategory } from '../types/index.js';

interface CLIOptions {
  title?: string;
  author?: string;
  type?: BIPType;
  category?: BIPCategory;
  abstract?: string;
  motivation?: string;
  specification?: string;
  rationale?: string;
  interactive?: boolean;
  help?: boolean;
}

async function promptUser(question: string): Promise<string> {
  // Simple readline implementation for interactive mode
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function validateRequiredFields(options: CLIOptions): Promise<boolean> {
  const required = ['title', 'author', 'abstract', 'motivation', 'specification', 'rationale'];
  const missing = required.filter(field => !options[field as keyof CLIOptions]);

  if (missing.length > 0) {
    console.error(`Missing required fields: ${missing.join(', ')}`);
    return false;
  }

  return true;
}

async function interactiveMode(): Promise<CLIOptions> {
  console.log('🚀 Interactive BIP Creation Mode\n');

  const title = await promptUser('Enter BIP title: ');
  const author = await promptUser('Enter author name/model ID: ');

  console.log('\nBIP Types:');
  console.log('1. Standards Track');
  console.log('2. Informational');
  console.log('3. Process');
  const typeChoice = await promptUser('Select BIP type (1-3): ');
  const types: BIPType[] = ['Standards Track', 'Informational', 'Process'];
  const type = types[parseInt(typeChoice) - 1] || 'Standards Track';

  console.log('\nBIP Categories:');
  console.log('1. Core');
  console.log('2. Networking');
  console.log('3. API');
  console.log('4. Applications');
  const categoryChoice = await promptUser('Select BIP category (1-4): ');
  const categories: BIPCategory[] = ['Core', 'Networking', 'API', 'Applications'];
  const category = categories[parseInt(categoryChoice) - 1] || 'Core';

  const abstract = await promptUser('Enter abstract (brief summary): ');
  const motivation = await promptUser('Enter motivation (why is this needed): ');
  const specification = await promptUser('Enter specification (technical details): ');
  const rationale = await promptUser('Enter rationale (design decisions): ');

  return { title, author, type, category, abstract, motivation, specification, rationale };
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--title':
      case '-t': {
        const value = args[++i];
        if (value !== undefined) options.title = value;
        break;
      }
      case '--author':
      case '-a': {
        const value = args[++i];
        if (value !== undefined) options.author = value;
        break;
      }
      case '--type': {
        const value = args[++i] as BIPType;
        if (value !== undefined) options.type = value;
        break;
      }
      case '--category': {
        const value = args[++i] as BIPCategory;
        if (value !== undefined) options.category = value;
        break;
      }
      case '--abstract': {
        const value = args[++i];
        if (value !== undefined) options.abstract = value;
        break;
      }
      case '--motivation': {
        const value = args[++i];
        if (value !== undefined) options.motivation = value;
        break;
      }
      case '--specification': {
        const value = args[++i];
        if (value !== undefined) options.specification = value;
        break;
      }
      case '--rationale': {
        const value = args[++i];
        if (value !== undefined) options.rationale = value;
        break;
      }
      case '--interactive':
      case '-i':
        options.interactive = true;
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
BIP Creation Tool

Usage:
  bip-create [options]
  bip-create --interactive

Options:
  -t, --title <title>           BIP title
  -a, --author <author>         Author name/model ID
  --type <type>                 BIP type (Standards Track, Informational, Process)
  --category <category>         BIP category (Core, Networking, API, Applications)
  --abstract <text>             Abstract/summary
  --motivation <text>           Motivation section
  --specification <text>        Technical specification
  --rationale <text>            Design rationale
  -i, --interactive             Interactive mode
  -h, --help                    Show this help

Examples:
  # Interactive mode
  bip-create --interactive

  # Direct creation
  bip-create --title "New Feature" --author "gpt-5" --abstract "..." --motivation "..." --specification "..." --rationale "..."

Valid Types: Standards Track, Informational, Process
Valid Categories: Core, Networking, API, Applications
`);
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.help) {
      showUsage();
      return;
    }

    let finalOptions: CLIOptions;

    if (options.interactive) {
      finalOptions = await interactiveMode();
    } else {
      finalOptions = options;
    }

    // Set defaults
    finalOptions.type = finalOptions.type || 'Standards Track';
    finalOptions.category = finalOptions.category || 'Core';

    // Validate required fields
    if (!(await validateRequiredFields(finalOptions))) {
      console.error('\nUse --interactive mode or provide all required fields.');
      showUsage();
      process.exit(1);
    }

    console.log('Creating BIP proposal...');

    const bipManager = new BIPManager();
    const proposal = await bipManager.createBIP(
      finalOptions.title!,
      finalOptions.author!,
      finalOptions.type!,
      finalOptions.category!,
      finalOptions.abstract!,
      finalOptions.motivation!,
      finalOptions.specification!,
      finalOptions.rationale!
    );

    console.log(`✅ BIP ${proposal.number} created successfully!`);
    console.log(`📁 File: gov/bips/${proposal.number}/${proposal.number}.md`);
    console.log(`📝 Title: ${proposal.title}`);
    console.log(`👤 Author: ${proposal.author}`);
    console.log(`📊 Type: ${proposal.type}`);
    console.log(`🏷️  Category: ${proposal.category}`);
    console.log(`⏰ Created: ${proposal.created.toISOString()}`);

    // Validate the created BIP
    const validation = bipManager.validateBIP(proposal);
    if (validation.isValid) {
      console.log('✅ BIP validation passed');
    } else {
      console.log('⚠️  BIP validation warnings:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }

  } catch (error) {
    console.error('❌ Error creating BIP:', error instanceof Error ? error.message : String(error));
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
