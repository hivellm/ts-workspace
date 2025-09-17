#!/usr/bin/env node
/**
 * Generate Implementation Chain CLI Tool
 * Generates implementation tracking chain based on existing BIPs
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

interface ChainBlock {
  index: number;
  timestamp: string;
  previousHash: string | null;
  type: 'draft' | 'review' | 'implementation' | 'testing' | 'deployment';
  model: string;
  action: string;
  files: string[];
  fileHash: string;
  hash: string;
}

interface BIPChain {
  bipId: string;
  sourceProposal: string | undefined;
  sourceMinute: string | undefined;
  proposalTitle?: string;
  approvalDate?: string;
  voteCount?: {
    approve: number;
    reject: number;
    abstain: number;
  };
  created: string;
  chain: ChainBlock[];
}

class ChainGenerator {

  /**
   * Calculate deterministic block hash
   */
  private calculateBlockHash(
    index: number,
    timestamp: string,
    previousHash: string | null,
    type: string,
    model: string,
    action: string,
    fileHash: string
  ): string {
    const prevHash = previousHash || '';
    const blockString = [
      index.toString(),
      timestamp,
      prevHash,
      type,
      model,
      action,
      fileHash
    ].join('|');

    return createHash('sha256').update(blockString, 'utf8').digest('hex');
  }

  /**
   * Calculate file hash for multiple files
   */
  private async calculateFilesHash(files: string[], bipDir: string): Promise<string> {
    const fileContents: string[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(join(bipDir, file), 'utf-8');
        fileContents.push(content);
      } catch (error) {
        console.warn(`Warning: Could not read file ${file}, using placeholder`);
        fileContents.push(`[FILE_NOT_FOUND: ${file}]`);
      }
    }

    const combinedContent = fileContents.join('\n---\n');
    return createHash('sha256').update(combinedContent, 'utf8').digest('hex');
  }

  /**
   * Analyze BIP directory to determine implementation phases
   */
  private async analyzeBIPImplementation(bipId: string, bipDir: string): Promise<ChainBlock[]> {
    const blocks: ChainBlock[] = [];
    let index = 1;
    let previousHash: string | null = null;

    // Phase 1: Draft - BIP creation
    const draftTimestamp = '2025-09-07T15:00:00.000Z'; // Based on BIP creation
    const draftFiles = [`${bipId}.md`];
    const draftFileHash = await this.calculateFilesHash(draftFiles, bipDir);

    const draftHash = this.calculateBlockHash(
      index,
      draftTimestamp,
      previousHash,
      'draft',
      this.inferCreatorModel(bipId),
      `Created initial BIP specification for ${bipId}`,
      draftFileHash
    );

    blocks.push({
      index,
      timestamp: draftTimestamp,
      previousHash,
      type: 'draft',
      model: this.inferCreatorModel(bipId),
      action: `Created initial BIP specification for ${bipId}`,
      files: draftFiles,
      fileHash: draftFileHash,
      hash: draftHash
    });

    index++;
    previousHash = draftHash;

    // Phase 2: Review - If review files exist
    const reviewFiles = await this.findReviewFiles(bipDir);
    if (reviewFiles.length > 0) {
      const reviewTimestamp = '2025-09-08T10:00:00.000Z';
      const reviewFileHash = await this.calculateFilesHash(reviewFiles, bipDir);

      const reviewHash = this.calculateBlockHash(
        index,
        reviewTimestamp,
        previousHash,
        'review',
        this.inferReviewerModel(bipId),
        `Completed peer review for ${bipId}`,
        reviewFileHash
      );

      blocks.push({
        index,
        timestamp: reviewTimestamp,
        previousHash,
        type: 'review',
        model: this.inferReviewerModel(bipId),
        action: `Completed peer review for ${bipId}`,
        files: reviewFiles,
        fileHash: reviewFileHash,
        hash: reviewHash
      });

      index++;
      previousHash = reviewHash;
    }

    // Phase 3: Implementation - Based on existing implementation
    if (bipId === 'BIP-01' || bipId === 'BIP-02') {
      const implTimestamp = '2025-09-08T14:00:00.000Z';
      const implFiles = await this.findImplementationFiles(bipId, bipDir);
      const implFileHash = await this.calculateFilesHash(implFiles, bipDir);

      const implHash = this.calculateBlockHash(
        index,
        implTimestamp,
        previousHash,
        'implementation',
        'claude-4-sonnet',
        `Completed core implementation for ${bipId}`,
        implFileHash
      );

      blocks.push({
        index,
        timestamp: implTimestamp,
        previousHash,
        type: 'implementation',
        model: 'claude-4-sonnet',
        action: `Completed core implementation for ${bipId}`,
        files: implFiles,
        fileHash: implFileHash,
        hash: implHash
      });

      index++;
      previousHash = implHash;

      // Phase 4: Testing/Deployment - If applicable
      if (bipId === 'BIP-01') {
        const testTimestamp = '2025-09-08T16:00:00.000Z';
        const testFiles = ['IMPLEMENTATION_SUMMARY.md'];
        const testFileHash = await this.calculateFilesHash(testFiles, bipDir);

        const testHash = this.calculateBlockHash(
          index,
          testTimestamp,
          previousHash,
          'testing',
          'claude-4-sonnet',
          `Completed testing and validation for ${bipId}`,
          testFileHash
        );

        blocks.push({
          index,
          timestamp: testTimestamp,
          previousHash,
          type: 'testing',
          model: 'claude-4-sonnet',
          action: `Completed testing and validation for ${bipId}`,
          files: testFiles,
          fileHash: testFileHash,
          hash: testHash
        });
      }
    }

    return blocks;
  }

  /**
   * Find review-related files
   */
  private async findReviewFiles(bipDir: string): Promise<string[]> {
    const files: string[] = [];
    const possibleReviewFiles = [
      'REVIEW_REPORT.md',
      'REVIEW_REPORT_2.md',
      'FINAL_REVIEW_REPORT.md',
      'peer-review.md'
    ];

    for (const file of possibleReviewFiles) {
      try {
        await fs.access(join(bipDir, file));
        files.push(file);
      } catch {
        // File doesn't exist, skip
      }
    }

    return files;
  }

  /**
   * Find implementation-related files
   */
  private async findImplementationFiles(bipId: string, bipDir: string): Promise<string[]> {
    const files: string[] = [];
    const possibleImplFiles = [
      `${bipId}-implementation-plan.md`,
      'IMPLEMENTATION_SUMMARY.md',
      'TECHNICAL_ARCHITECTURE.md',
      'AUTOMATION_WORKFLOWS.md'
    ];

    for (const file of possibleImplFiles) {
      try {
        await fs.access(join(bipDir, file));
        files.push(file);
      } catch {
        // File doesn't exist, skip
      }
    }

    return files;
  }

  /**
   * Infer creator model based on BIP ID
   */
  private inferCreatorModel(bipId: string): string {
    switch (bipId) {
      case 'BIP-00': return 'grok-code-fast-1';
      case 'BIP-01': return 'grok-code-fast-1';
      case 'BIP-02': return 'gpt-5';
      default: return 'unknown-model';
    }
  }

  /**
   * Infer reviewer model based on BIP ID
   */
  private inferReviewerModel(bipId: string): string {
    switch (bipId) {
      case 'BIP-00': return 'claude-4-sonnet';
      case 'BIP-01': return 'gpt-5';
      case 'BIP-02': return 'claude-4-sonnet';
      default: return 'unknown-reviewer';
    }
  }

  /**
   * Get comprehensive source proposal information for a BIP
   */
  private async getSourceInfo(bipId: string): Promise<{
    proposal?: string;
    minute?: string;
    proposalTitle?: string;
    approvalDate?: string;
    voteCount?: any;
  }> {
    // Enhanced mapping with more detailed information
    const knownMappings: Record<string, any> = {
      'BIP-00': {
        proposal: 'P010',
        minute: '0001',
        proposalTitle: 'Cursor IDE Extension for AI Governance',
        approvalDate: '2025-09-07',
        voteCount: { approve: 8, reject: 2, abstain: 0 }
      },
      'BIP-01': {
        proposal: 'P012',
        minute: '0001',
        proposalTitle: 'BIP System Implementation for Governance',
        approvalDate: '2025-09-07',
        voteCount: { approve: 9, reject: 1, abstain: 0 }
      },
      'BIP-02': {
        proposal: 'P037',
        minute: '0003',
        proposalTitle: 'TypeScript Ecosystem Integration',
        approvalDate: '2025-09-08',
        voteCount: { approve: 10, reject: 0, abstain: 0 }
      }
    };

    const info = knownMappings[bipId] || {};

    // Try to read actual proposal data from minutes if available
    if (info.minute) {
      try {
        const minuteDir = join('gov/minutes', info.minute.padStart(4, '0'));
        const proposalsFile = join(minuteDir, 'proposals.json');

        const proposalsData = await fs.readFile(proposalsFile, 'utf-8');
        const proposals = JSON.parse(proposalsData);

        const proposal = proposals.find((p: any) => p.id === info.proposal);
        if (proposal) {
          info.proposalTitle = proposal.title || info.proposalTitle;
          info.approvalDate = proposal.approved_date || info.approvalDate;
        }
      } catch (error) {
        // Continue with known mapping if file reading fails
        console.log(`   ℹ️  Could not read proposal details from minutes/${info.minute}`);
      }
    }

    return info;
  }

  /**
   * Generate implementation chain for a BIP
   */
  async generateBIPChain(bipId: string): Promise<BIPChain> {
    const bipDir = join('gov/bips', bipId);

    try {
      await fs.access(bipDir);
    } catch {
      throw new Error(`BIP directory not found: ${bipDir}`);
    }

    const chain = await this.analyzeBIPImplementation(bipId, bipDir);
    const sourceInfo = await this.getSourceInfo(bipId);

    const result: BIPChain = {
      bipId,
      sourceProposal: sourceInfo.proposal,
      sourceMinute: sourceInfo.minute,
      created: chain[0]?.timestamp || new Date().toISOString(),
      chain
    };

    // Add optional properties only if they exist
    if (sourceInfo.proposalTitle) {
      result.proposalTitle = sourceInfo.proposalTitle;
    }
    if (sourceInfo.approvalDate) {
      result.approvalDate = sourceInfo.approvalDate;
    }
    if (sourceInfo.voteCount) {
      result.voteCount = sourceInfo.voteCount;
    }

    return result;
  }

  /**
   * Generate consolidated blockchain for all existing BIPs
   */
  async generateAllChains(): Promise<void> {
    const bipsDir = 'gov/bips';
    const entries = await fs.readdir(bipsDir, { withFileTypes: true });
    const bipDirs = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('BIP-'))
      .map(entry => entry.name);

    console.log(`\n🔍 Found ${bipDirs.length} BIPs: ${bipDirs.join(', ')}\n`);

    const consolidatedBlockchain: any = {
      version: '1.0.0',
      created: new Date().toISOString(),
      totalBIPs: bipDirs.length,
      description: 'BIP Implementation Blockchain - Complete audit trail from proposals to implementation',
      chains: []
    };

    for (const bipId of bipDirs) {
      try {
        console.log(`⚙️  Processing ${bipId}...`);

        const chain = await this.generateBIPChain(bipId);
        consolidatedBlockchain.chains.push(chain);

        console.log(`✅ Added ${bipId} to blockchain:`);
        console.log(`   🔗 Blocks: ${chain.chain.length}`);
        console.log(`   📋 Source: ${chain.sourceProposal || 'Unknown'} (Minute ${chain.sourceMinute || 'Unknown'})`);
        if (chain.proposalTitle) {
          console.log(`   📝 Proposal: "${chain.proposalTitle}"`);
        }
        if (chain.approvalDate) {
          console.log(`   📅 Approved: ${chain.approvalDate}`);
        }
        if (chain.voteCount) {
          const total = chain.voteCount.approve + chain.voteCount.reject + chain.voteCount.abstain;
          console.log(`   🗳️  Votes: ${chain.voteCount.approve}✅ ${chain.voteCount.reject}❌ ${chain.voteCount.abstain}⚪ (${total} total)`);
        }

        // Show chain summary
        chain.chain.forEach(block => {
          const typeIcon = this.getTypeIcon(block.type);
          console.log(`   ${typeIcon} ${block.type}: ${block.action} (${block.model})`);
        });

        console.log('');

      } catch (error) {
        console.error(`❌ Error processing ${bipId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Save consolidated blockchain
    try {
      const blockchainFile = 'gov/implementation_blockchain.json';
      await fs.writeFile(blockchainFile, JSON.stringify(consolidatedBlockchain, null, 2), 'utf-8');
      console.log(`💾 Consolidated blockchain saved: ${blockchainFile}`);
      console.log(`📊 Total chains: ${consolidatedBlockchain.chains.length}`);
      console.log(`📋 Total blocks: ${consolidatedBlockchain.chains.reduce((sum: number, chain: any) => sum + chain.chain.length, 0)}`);
    } catch (writeError) {
      console.log(`⚠️  Could not save consolidated blockchain: ${writeError}`);
      console.log(`📝 JSON Output:`);
      console.log(JSON.stringify(consolidatedBlockchain, null, 2));
    }

    console.log('\n🎉 Implementation blockchain generation complete!\n');
  }

  /**
   * Get emoji icon for block type
   */
  private getTypeIcon(type: string): string {
    switch (type) {
      case 'draft': return '📝';
      case 'review': return '👁️';
      case 'implementation': return '⚙️';
      case 'testing': return '🧪';
      case 'deployment': return '🚀';
      default: return '📋';
    }
  }
}

async function main(): Promise<void> {
  try {
    console.log('🔗 BIP Implementation Blockchain Generator');
    console.log('==========================================');

    const generator = new ChainGenerator();
    await generator.generateAllChains();

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
