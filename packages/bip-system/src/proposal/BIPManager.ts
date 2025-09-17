/**
 * BIPManager - Manages BIP proposals creation, validation, and lifecycle
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { BIPProposal, BIPType, BIPCategory, BIPStatus, BIPChangelogEntry } from '../types/index.js';

export class BIPManager {
  private bipsDirectory: string;

  constructor(bipsDirectory: string = 'gov/bips') {
    this.bipsDirectory = bipsDirectory;
  }

  /**
   * Generate the next available BIP number
   */
  async getNextBIPNumber(): Promise<string> {
    try {
      const entries = await fs.readdir(this.bipsDirectory, { withFileTypes: true });
      const bipDirs = entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('BIP-'))
        .map(entry => entry.name)
        .map(name => {
          const match = name.match(/BIP-(\d+)/);
          return match && match[1] ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      const maxNumber = bipDirs.length > 0 ? Math.max(...bipDirs) : 0;
      const nextNumber = maxNumber + 1;

      return `BIP-${nextNumber.toString().padStart(2, '0')}`;
    } catch (error) {
      // If directory doesn't exist or is empty, start with BIP-01
      return 'BIP-01';
    }
  }

  /**
   * Create a new BIP proposal
   */
  async createBIP(
    title: string,
    author: string,
    type: BIPType,
    category: BIPCategory,
    abstract: string,
    motivation: string,
    specification: string,
    rationale: string
  ): Promise<BIPProposal> {
    const number = await this.getNextBIPNumber();
    const now = new Date();

    const proposal: BIPProposal = {
      number,
      title,
      author,
      type,
      category,
      status: 'Draft',
      created: now,
      abstract,
      motivation,
      specification,
      rationale,
      milestones: [],
      changelog: [{
        date: now,
        author,
        description: 'Initial proposal creation'
      }]
    };

    await this.saveBIP(proposal);
    return proposal;
  }

  /**
   * Load a BIP proposal from file
   */
  async loadBIP(number: string): Promise<BIPProposal> {
    const filePath = join(this.bipsDirectory, number, `${number}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseBIPFromMarkdown(content);
  }

  /**
   * Save a BIP proposal to file
   */
  async saveBIP(proposal: BIPProposal): Promise<void> {
    const bipDir = join(this.bipsDirectory, proposal.number);
    await fs.mkdir(bipDir, { recursive: true });

    const markdown = this.generateBIPMarkdown(proposal);
    const filePath = join(bipDir, `${proposal.number}.md`);
    await fs.writeFile(filePath, markdown, 'utf-8');
  }

  /**
   * Update BIP status
   */
  async updateBIPStatus(
    number: string,
    newStatus: BIPStatus,
    author: string,
    description?: string
  ): Promise<BIPProposal> {
    const proposal = await this.loadBIP(number);
    proposal.status = newStatus;

    const changelogEntry: BIPChangelogEntry = {
      date: new Date(),
      author,
      description: description || `Status changed to ${newStatus}`
    };

    proposal.changelog.push(changelogEntry);
    await this.saveBIP(proposal);
    return proposal;
  }

  /**
   * Validate BIP structure and content
   */
  validateBIP(proposal: BIPProposal): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!proposal.number || !proposal.number.match(/^BIP-\d+$/)) {
      errors.push('Invalid BIP number format (should be BIP-XX)');
    }
    if (!proposal.title?.trim()) {
      errors.push('Title is required');
    }
    if (!proposal.author?.trim()) {
      errors.push('Author is required');
    }
    if (!proposal.abstract?.trim()) {
      errors.push('Abstract is required');
    }
    if (!proposal.motivation?.trim()) {
      errors.push('Motivation is required');
    }
    if (!proposal.specification?.trim()) {
      errors.push('Specification is required');
    }
    if (!proposal.rationale?.trim()) {
      errors.push('Rationale is required');
    }

    // Enum validations
    const validTypes: BIPType[] = ['Standards Track', 'Informational', 'Process'];
    if (!validTypes.includes(proposal.type)) {
      errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const validCategories: BIPCategory[] = ['Core', 'Networking', 'API', 'Applications'];
    if (!validCategories.includes(proposal.category)) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    const validStatuses: BIPStatus[] = ['Draft', 'Review', 'Approved', 'Implementation', 'Testing', 'Deployed', 'Rejected'];
    if (!validStatuses.includes(proposal.status)) {
      errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Content length validations
    if (proposal.abstract.length < 50) {
      errors.push('Abstract should be at least 50 characters');
    }
    if (proposal.motivation.length < 100) {
      errors.push('Motivation should be at least 100 characters');
    }
    if (proposal.specification.length < 200) {
      errors.push('Specification should be at least 200 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate BIP markdown content
   */
  private generateBIPMarkdown(proposal: BIPProposal): string {
    const sections = [
      `# ${proposal.number}: ${proposal.title}`,
      '',
      '## Abstract',
      proposal.abstract,
      '',
      '## Motivation',
      proposal.motivation,
      '',
      '## Specification',
      proposal.specification,
      '',
      '## Rationale',
      proposal.rationale
    ];

    if (proposal.implementation) {
      sections.push('', '## Implementation', proposal.implementation);
    }

    if (proposal.backwardCompatibility) {
      sections.push('', '## Backward Compatibility', proposal.backwardCompatibility);
    }

    if (proposal.securityConsiderations) {
      sections.push('', '## Security Considerations', proposal.securityConsiderations);
    }

    if (proposal.references && proposal.references.length > 0) {
      sections.push('', '## References');
      proposal.references.forEach(ref => {
        sections.push(`- ${ref}`);
      });
    }

    sections.push('', '## Copyright');
    sections.push('This BIP is licensed under the Creative Commons CC0 1.0 Universal license.');

    if (proposal.changelog && proposal.changelog.length > 0) {
      sections.push('', '## Changelog');
      proposal.changelog.forEach(entry => {
        const dateStr = entry.date.toISOString().split('T')[0];
        sections.push(`- **${dateStr}**: ${entry.author} - ${entry.description}`);
      });
    }

    sections.push('', '---', '');
    sections.push(`**${proposal.number} Status**: ${proposal.status}`);
    sections.push(`**Created**: ${proposal.created.toISOString().split('T')[0]}`);
    sections.push(`**Author**: ${proposal.author}`);
    sections.push(`**Type**: ${proposal.type}`);
    sections.push(`**Category**: ${proposal.category}`);

    return sections.join('\n');
  }

  /**
   * Parse BIP from markdown content
   */
  private parseBIPFromMarkdown(content: string): BIPProposal {
    const lines = content.split('\n');

    // Extract metadata from the bottom
    const statusMatch = content.match(/\*\*([^*]+) Status\*\*: (.+)/);
    const createdMatch = content.match(/\*\*Created\*\*: (.+)/);
    const authorMatch = content.match(/\*\*Author\*\*: (.+)/);
    const typeMatch = content.match(/\*\*Type\*\*: (.+)/);
    const categoryMatch = content.match(/\*\*Category\*\*: (.+)/);

    // Extract title and number from first line
    const titleMatch = lines[0]?.match(/^# (BIP-\d+): (.+)$/);
    if (!titleMatch) {
      throw new Error('Invalid BIP format: missing title');
    }

    const number = titleMatch[1] || '';
    const title = titleMatch[2] || '';

    // Extract sections
    const abstract = this.extractSection(content, 'Abstract');
    const motivation = this.extractSection(content, 'Motivation');
    const specification = this.extractSection(content, 'Specification');
    const rationale = this.extractSection(content, 'Rationale');
    const implementation = this.extractSection(content, 'Implementation');
    const backwardCompatibility = this.extractSection(content, 'Backward Compatibility');
    const securityConsiderations = this.extractSection(content, 'Security Considerations');

    // Parse changelog
    const changelog: BIPChangelogEntry[] = [];
    const changelogSection = this.extractSection(content, 'Changelog');
    if (changelogSection) {
      const changelogLines = changelogSection.split('\n').filter(line => line.startsWith('- **'));
      changelogLines.forEach(line => {
        const match = line.match(/- \*\*([^*]+)\*\*: ([^-]+) - (.+)/);
        if (match && match[1] && match[2] && match[3]) {
          changelog.push({
            date: new Date(match[1]),
            author: match[2].trim(),
            description: match[3].trim()
          });
        }
      });
    }

    return {
      number,
      title,
      author: authorMatch?.[1] || '',
      type: (typeMatch?.[1] as BIPType) || 'Standards Track',
      category: (categoryMatch?.[1] as BIPCategory) || 'Core',
      status: (statusMatch?.[2] as BIPStatus) || 'Draft',
      created: createdMatch && createdMatch[1] ? new Date(createdMatch[1]) : new Date(),
      abstract,
      motivation,
      specification,
      rationale,
      implementation,
      backwardCompatibility,
      securityConsiderations,
      milestones: [],
      changelog
    };
  }

  /**
   * Extract a section from markdown content
   */
  private extractSection(content: string, sectionName: string): string {
    const regex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |\\n---|\n$)`, 'i');
    const match = content.match(regex);
    return match && match[1] ? match[1].trim() : '';
  }

  /**
   * List all BIPs
   */
  async listBIPs(): Promise<BIPProposal[]> {
    try {
      const entries = await fs.readdir(this.bipsDirectory, { withFileTypes: true });
      const bipDirs = entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('BIP-'))
        .map(entry => entry.name);

      const bips: BIPProposal[] = [];
      for (const bipDir of bipDirs) {
        try {
          const bip = await this.loadBIP(bipDir);
          bips.push(bip);
        } catch (error) {
          console.warn(`Failed to load BIP ${bipDir}: ${error}`);
        }
      }

      return bips.sort((a, b) => a.number.localeCompare(b.number));
    } catch (error) {
      return [];
    }
  }
}
