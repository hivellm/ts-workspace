/**
 * @fileoverview Governance-related TypeScript types for CMMV-Hive
 * @author CMMV-Hive Team
 * @version 1.0.0
 */
/**
 * Represents the status of a proposal in the governance system
 */
export type ProposalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'implemented' | 'vetoed';
/**
 * Categories for proposals to help with organization and filtering
 */
export type ProposalCategory = 'Core Infrastructure' | 'Security' | 'Process' | 'Technical Infrastructure' | 'AI Enhancement' | 'Documentation' | 'Data & Analytics';
/**
 * Priority levels for proposals
 */
export type ProposalPriority = 'low' | 'medium' | 'high' | 'critical';
/**
 * Model identity for authentication and authorization
 */
export interface ModelIdentity {
    /** Unique identifier for the model */
    readonly modelName: string;
    /** Provider of the model (e.g., OpenAI, Anthropic) */
    readonly provider: string;
    /** Public key for cryptographic verification */
    readonly publicKey: string;
    /** Unique key identifier */
    readonly keyId: string;
    /** Creation timestamp */
    readonly createdAt: Date;
    /** Expiration timestamp for key rotation */
    readonly expiresAt: Date;
    /** Self-signed identity signature */
    readonly signature: string;
}
/**
 * Metadata associated with a proposal
 */
export interface ProposalMetadata {
    /** Estimated implementation effort */
    readonly estimatedEffort?: 'small' | 'medium' | 'large';
    /** Dependencies on other proposals */
    readonly dependencies?: readonly string[];
    /** Tags for categorization */
    readonly tags?: readonly string[];
    /** Implementation timeline estimate */
    readonly timelineWeeks?: number;
    /** Impact scope */
    readonly impactScope?: 'local' | 'system-wide' | 'ecosystem';
}
/**
 * Core proposal interface
 */
export interface Proposal {
    /** Unique proposal identifier */
    readonly id: string;
    /** Human-readable title */
    readonly title: string;
    /** Proposal author */
    readonly author: ModelIdentity;
    /** Proposal category */
    readonly category: ProposalCategory;
    /** Current status */
    readonly status: ProposalStatus;
    /** Priority level */
    readonly priority: ProposalPriority;
    /** Creation timestamp */
    readonly createdAt: Date;
    /** Last update timestamp */
    readonly updatedAt: Date;
    /** Proposal content in markdown */
    readonly content: string;
    /** Additional metadata */
    readonly metadata: ProposalMetadata;
    /** Previous voting score if applicable */
    readonly previousScore?: number;
}
/**
 * Vote cast by a model on a proposal
 */
export interface Vote {
    /** Proposal being voted on */
    readonly proposalId: string;
    /** Model casting the vote */
    readonly modelId: string;
    /** Vote weight (1-10) */
    readonly weight: number;
    /** Cryptographic signature of the vote */
    readonly signature: string;
    /** Vote timestamp */
    readonly timestamp: Date;
    /** Optional justification for the vote */
    readonly justification?: string;
    /** Veto flag and reason if applicable */
    readonly veto?: {
        readonly reason: string;
        readonly isVeto: true;
    };
}
/**
 * Result of a single vote submission
 */
export interface VoteResult {
    /** Whether the vote was accepted */
    readonly success: boolean;
    /** Vote ID for tracking */
    readonly voteId?: string;
    /** Error message if vote was rejected */
    readonly error?: string;
    /** Timestamp of vote processing */
    readonly processedAt: Date;
}
/**
 * Status of a voting session
 */
export type VotingSessionStatus = 'pending' | 'active' | 'completed' | 'cancelled';
/**
 * Configuration for a voting session
 */
export interface VotingConfig {
    /** Approval threshold (0-1) */
    readonly threshold: number;
    /** Special thresholds for specific proposals */
    readonly specialThresholds?: Record<string, number>;
    /** Veto threshold for generals */
    readonly vetoThreshold: number;
    /** Maximum voting duration in hours */
    readonly maxDurationHours: number;
    /** Minimum number of votes required */
    readonly minimumVotes: number;
}
/**
 * A voting session containing multiple proposals
 */
export interface VotingSession {
    /** Unique session identifier */
    readonly id: string;
    /** Human-readable session title */
    readonly title: string;
    /** Proposals included in this session */
    readonly proposals: readonly Proposal[];
    /** Voting configuration */
    readonly config: VotingConfig;
    /** Session start timestamp */
    readonly startDate: Date;
    /** Session end timestamp */
    readonly endDate: Date;
    /** Current session status */
    readonly status: VotingSessionStatus;
    /** Description of the session */
    readonly description?: string;
}
/**
 * Aggregated results for a voting session
 */
export interface VotingResults {
    /** Session that was voted on */
    readonly sessionId: string;
    /** Individual proposal results */
    readonly proposalResults: readonly ProposalResult[];
    /** Overall session statistics */
    readonly sessionStats: VotingSessionStats;
    /** Timestamp when results were calculated */
    readonly calculatedAt: Date;
}
/**
 * Result for a single proposal in a voting session
 */
export interface ProposalResult {
    /** Proposal that was voted on */
    readonly proposalId: string;
    /** Total score received */
    readonly totalScore: number;
    /** Percentage score (0-100) */
    readonly percentage: number;
    /** Final status after voting */
    readonly finalStatus: ProposalStatus;
    /** Number of votes received */
    readonly voteCount: number;
    /** Whether proposal met approval threshold */
    readonly approved: boolean;
    /** Veto information if applicable */
    readonly vetoInfo?: {
        readonly vetoCount: number;
        readonly vetoPercentage: number;
        readonly vetoed: boolean;
    };
}
/**
 * Statistical information about a voting session
 */
export interface VotingSessionStats {
    /** Total number of proposals */
    readonly totalProposals: number;
    /** Number of approved proposals */
    readonly approvedProposals: number;
    /** Number of rejected proposals */
    readonly rejectedProposals: number;
    /** Number of vetoed proposals */
    readonly vetoedProposals: number;
    /** Overall approval rate (0-1) */
    readonly approvalRate: number;
    /** Consensus level (0-100) */
    readonly consensusLevel: number;
    /** Participation rate (0-1) */
    readonly participationRate: number;
    /** Number of unanimous decisions */
    readonly unanimousSupport: number;
}
/**
 * Request to create a new proposal
 */
export interface CreateProposalRequest {
    /** Proposal title */
    readonly title: string;
    /** Proposal category */
    readonly category: ProposalCategory;
    /** Proposal priority */
    readonly priority: ProposalPriority;
    /** Proposal content */
    readonly content: string;
    /** Optional metadata */
    readonly metadata?: Partial<ProposalMetadata>;
}
/**
 * Request to update an existing proposal
 */
export interface UpdateProposalRequest {
    /** Updated title */
    readonly title?: string;
    /** Updated category */
    readonly category?: ProposalCategory;
    /** Updated priority */
    readonly priority?: ProposalPriority;
    /** Updated content */
    readonly content?: string;
    /** Updated metadata */
    readonly metadata?: Partial<ProposalMetadata>;
}
/**
 * Search query for proposals
 */
export interface SearchQuery {
    /** Text search in title and content */
    readonly text?: string;
    /** Filter by category */
    readonly category?: ProposalCategory;
    /** Filter by status */
    readonly status?: ProposalStatus;
    /** Filter by priority */
    readonly priority?: ProposalPriority;
    /** Filter by author */
    readonly author?: string;
    /** Filter by tags */
    readonly tags?: readonly string[];
    /** Date range filter */
    readonly dateRange?: {
        readonly from: Date;
        readonly to: Date;
    };
    /** Pagination */
    readonly pagination?: {
        readonly page: number;
        readonly limit: number;
    };
}
//# sourceMappingURL=index.d.ts.map