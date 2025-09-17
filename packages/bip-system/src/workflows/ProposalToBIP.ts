/**
 * ProposalToBIP - Workflow for converting approved proposals to BIP implementations
 * Handles the transition from approved minutes proposals to structured BIP development
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { BIPManager } from '../proposal/BIPManager.js';
import { BIPProposal, BIPType, BIPCategory, BIPMilestone } from '../types/index.js';

export interface ApprovedProposal {
  id: string;
  title: string;
  description: string;
  author: string;
  minuteId: string;
  score: number;
  status: 'Approved';
}

export class ProposalToBIPWorkflow {
  private bipManager: BIPManager;

  constructor(bipsDirectory: string = 'gov/bips') {
    this.bipManager = new BIPManager(bipsDirectory);
  }

  /**
   * Convert an approved proposal from minutes to a BIP draft
   */
  async convertProposalToBIP(
    approvedProposal: ApprovedProposal,
    implementationModel: string
  ): Promise<BIPProposal> {

    // Determine BIP type and category based on proposal content
    const { type, category } = this.analyzeBIPTypeCategory(approvedProposal);

    // Create initial milestones
    const milestones: BIPMilestone[] = [
      {
        phase: 'Draft',
        completed: false,
        description: 'Create technical specification based on approved proposal'
      },
      {
        phase: 'Review',
        completed: false,
        description: 'Peer review by AI models'
      },
      {
        phase: 'Implementation',
        completed: false,
        description: 'Code development and implementation'
      },
      {
        phase: 'Testing',
        completed: false,
        description: 'Quality assurance and validation'
      },
      {
        phase: 'Deployment',
        completed: false,
        description: 'Production deployment and monitoring'
      }
    ];

    // Generate abstract and motivation from proposal
    const abstract = this.generateAbstract(approvedProposal);
    const motivation = this.generateMotivation(approvedProposal);
    const specification = this.generateInitialSpecification(approvedProposal);
    const rationale = this.generateRationale(approvedProposal);

    // Create BIP proposal
    const bip = await this.bipManager.createBIP(
      approvedProposal.title,
      implementationModel,
      type,
      category,
      abstract,
      motivation,
      specification,
      rationale
    );

    // Add source tracking and milestones
    const enhancedBIP: BIPProposal = {
      ...bip,
      sourceProposal: approvedProposal.id,
      sourceMinute: approvedProposal.minuteId,
      assignedModels: [implementationModel],
      milestones
    };

    await this.bipManager.saveBIP(enhancedBIP);

    // Create initial status file
    await this.createBIPStatusFile(enhancedBIP);

    return enhancedBIP;
  }

  /**
   * Load approved proposals from a minutes session
   */
  async loadApprovedProposals(minuteId: string): Promise<ApprovedProposal[]> {
    const minutesPath = join('gov/minutes', minuteId, 'results.json');

    try {
      const content = await fs.readFile(minutesPath, 'utf-8');
      const results = JSON.parse(content);

      // Extract approved proposals (adjust based on actual results format)
      return results.results
        .filter((result: any) => result.status === 'Approved' || result.score >= 70)
        .map((result: any) => ({
          id: result.proposal_id,
          title: result.title || `Proposal ${result.proposal_id}`,
          description: result.description || '',
          author: result.author || 'Unknown',
          minuteId,
          score: result.score,
          status: 'Approved' as const
        }));
    } catch (error) {
      throw new Error(`Failed to load proposals from minute ${minuteId}: ${error}`);
    }
  }

  /**
   * Analyze proposal content to determine BIP type and category
   */
  private analyzeBIPTypeCategory(proposal: ApprovedProposal): { type: BIPType; category: BIPCategory } {
    const content = proposal.description.toLowerCase();

    // Determine type
    let type: BIPType = 'Standards Track';
    if (content.includes('documentation') || content.includes('guide') || content.includes('best practice')) {
      type = 'Informational';
    } else if (content.includes('process') || content.includes('workflow') || content.includes('governance')) {
      type = 'Process';
    }

    // Determine category
    let category: BIPCategory = 'Core';
    if (content.includes('api') || content.includes('interface') || content.includes('endpoint')) {
      category = 'API';
    } else if (content.includes('network') || content.includes('communication') || content.includes('protocol')) {
      category = 'Networking';
    } else if (content.includes('application') || content.includes('frontend') || content.includes('ui')) {
      category = 'Applications';
    }

    return { type, category };
  }

  /**
   * Generate abstract from proposal
   */
  private generateAbstract(proposal: ApprovedProposal): string {
    return `This BIP implements the approved proposal "${proposal.title}" (${proposal.id}) from minute ${proposal.minuteId}. ` +
           `The implementation provides ${proposal.description.substring(0, 200)}...`;
  }

  /**
   * Generate motivation section
   */
  private generateMotivation(proposal: ApprovedProposal): string {
    return `This proposal was approved in minute ${proposal.minuteId} with a score of ${proposal.score}%, ` +
           `indicating strong consensus from the AI model community. The motivation for implementation includes:\n\n` +
           `${proposal.description}\n\n` +
           `Implementation of this proposal will enhance the CMMV-Hive ecosystem by providing the specified functionality ` +
           `in a structured, tested, and maintainable manner.`;
  }

  /**
   * Generate initial technical specification
   */
  private generateInitialSpecification(proposal: ApprovedProposal): string {
    return `## Technical Specification\n\n` +
           `This section will be expanded during the Draft phase to include:\n\n` +
           `### Architecture Overview\n` +
           `- System design and components\n` +
           `- Integration points with existing systems\n` +
           `- Data flow and processing logic\n\n` +
           `### Implementation Details\n` +
           `- Code structure and organization\n` +
           `- Dependencies and requirements\n` +
           `- Configuration and deployment\n\n` +
           `### API Specification\n` +
           `- Public interfaces and methods\n` +
           `- Input/output formats\n` +
           `- Error handling and validation\n\n` +
           `**Note**: This specification will be detailed during the implementation process based on ` +
           `the approved proposal: ${proposal.description}`;
  }

  /**
   * Generate rationale section
   */
  private generateRationale(proposal: ApprovedProposal): string {
    return `## Design Rationale\n\n` +
           `The design decisions for this implementation are based on:\n\n` +
           `1. **Community Consensus**: Approved with ${proposal.score}% support in minute ${proposal.minuteId}\n` +
           `2. **Technical Feasibility**: Implementation approach chosen for maintainability and performance\n` +
           `3. **Integration Requirements**: Seamless integration with existing CMMV-Hive infrastructure\n` +
           `4. **Future Extensibility**: Design allows for future enhancements and modifications\n\n` +
           `Alternative approaches were considered but this implementation path provides the best ` +
           `balance of functionality, performance, and maintainability.`;
  }

  /**
   * Create BIP status tracking file
   */
  private async createBIPStatusFile(bip: BIPProposal): Promise<void> {
    const statusFile = join('gov/bips', bip.number, 'status.json');

    const status = {
      bip_id: bip.number,
      title: bip.title,
      source_proposal: bip.sourceProposal,
      source_minute: bip.sourceMinute,
      status: bip.status,
      created: bip.created.toISOString(),
      assigned_models: bip.assignedModels || [],
      milestones: bip.milestones.map(m => ({
        phase: m.phase,
        completed: m.completed,
        completed_by: m.completedBy,
        completed_at: m.completedAt?.toISOString(),
        description: m.description
      }))
    };

    await fs.writeFile(statusFile, JSON.stringify(status, null, 2), 'utf-8');
  }

  /**
   * Update BIP milestone
   */
  async updateMilestone(
    bipNumber: string,
    phase: string,
    completedBy: string,
    notes?: string
  ): Promise<void> {
    const bip = await this.bipManager.loadBIP(bipNumber);

    // Update milestone
    const milestone = bip.milestones.find(m => m.phase === phase);
    if (milestone) {
      milestone.completed = true;
      milestone.completedBy = completedBy;
      milestone.completedAt = new Date();
      if (notes) {
        milestone.description = notes;
      }
    }

    // Update BIP status based on milestones
    if (phase === 'Draft') bip.status = 'Review';
    else if (phase === 'Review') bip.status = 'Implementation';
    else if (phase === 'Implementation') bip.status = 'Testing';
    else if (phase === 'Testing') bip.status = 'Deployed';

    await this.bipManager.saveBIP(bip);
    await this.createBIPStatusFile(bip);
  }

  /**
   * Generate progress report
   */
  async generateProgressReport(bipNumber: string, reporter: string): Promise<string> {
    const bip = await this.bipManager.loadBIP(bipNumber);

    const completedMilestones = bip.milestones.filter(m => m.completed);
    const progressPercentage = Math.round((completedMilestones.length / bip.milestones.length) * 100);

    const report = {
      bip_id: bip.number,
      title: bip.title,
      source_proposal: bip.sourceProposal,
      report_date: new Date().toISOString(),
      reporter,
      current_status: bip.status,
      progress_percentage: progressPercentage,
      completed_milestones: completedMilestones.map(m => ({
        phase: m.phase,
        completed_by: m.completedBy,
        completed_at: m.completedAt?.toISOString()
      })),
      pending_milestones: bip.milestones.filter(m => !m.completed).map(m => m.phase),
      next_milestone: bip.milestones.find(m => !m.completed)?.phase || 'Complete'
    };

    const reportPath = join('gov/bips', bip.number, `progress-${new Date().toISOString().split('T')[0]}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    return reportPath;
  }
}
