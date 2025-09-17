/**
 * @fileoverview API-related TypeScript types for CMMV-Hive
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Response data */
  readonly data?: T;
  /** Success status */
  readonly success: boolean;
  /** Error information if applicable */
  readonly error?: ApiError;
  /** Response metadata */
  readonly meta?: ResponseMetadata;
}

/**
 * API error information
 */
export interface ApiError {
  /** Error code */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** Detailed error information */
  readonly details?: Record<string, unknown>;
  /** Error timestamp */
  readonly timestamp: Date;
  /** Request ID for tracking */
  readonly requestId?: string;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  /** Request ID for tracking */
  readonly requestId: string;
  /** Response timestamp */
  readonly timestamp: Date;
  /** Processing time in milliseconds */
  readonly processingTimeMs: number;
  /** API version */
  readonly apiVersion: string;
  /** Pagination information if applicable */
  readonly pagination?: PaginationInfo;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  /** Current page number */
  readonly page: number;
  /** Items per page */
  readonly limit: number;
  /** Total number of items */
  readonly total: number;
  /** Total number of pages */
  readonly totalPages: number;
  /** Whether there are more pages */
  readonly hasNext: boolean;
  /** Whether there are previous pages */
  readonly hasPrev: boolean;
}

/**
 * Request pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-based) */
  readonly page?: number;
  /** Number of items per page */
  readonly limit?: number;
  /** Sort field */
  readonly sortBy?: string;
  /** Sort order */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * API filter parameters
 */
export interface FilterParams {
  /** Text search query */
  readonly search?: string;
  /** Filter by specific fields */
  readonly filters?: Record<string, unknown>;
  /** Date range filter */
  readonly dateRange?: {
    readonly from: string;
    readonly to: string;
  };
}

/**
 * Authentication request
 */
export interface AuthRequest {
  /** Model identifier */
  readonly modelId: string;
  /** Signed challenge for authentication */
  readonly signedChallenge: string;
  /** Public key for verification */
  readonly publicKey: string;
  /** Timestamp of authentication attempt */
  readonly timestamp: Date;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  /** Access token */
  readonly accessToken: string;
  /** Token expiration timestamp */
  readonly expiresAt: Date;
  /** Refresh token for token renewal */
  readonly refreshToken?: string;
  /** Token type */
  readonly tokenType: 'bearer';
  /** Granted permissions */
  readonly permissions: readonly string[];
}

/**
 * Proposal API request
 */
export interface CreateProposalApiRequest {
  /** Proposal title */
  readonly title: string;
  /** Proposal category */
  readonly category: string;
  /** Proposal priority */
  readonly priority: string;
  /** Proposal content */
  readonly content: string;
  /** Optional metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Vote submission request
 */
export interface SubmitVoteApiRequest {
  /** Proposal ID being voted on */
  readonly proposalId: string;
  /** Vote weight (1-10) */
  readonly weight: number;
  /** Digital signature of the vote */
  readonly signature: string;
  /** Optional justification */
  readonly justification?: string;
  /** Veto information if applicable */
  readonly veto?: {
    readonly reason: string;
  };
}

/**
 * Voting session creation request
 */
export interface CreateVotingSessionApiRequest {
  /** Session title */
  readonly title: string;
  /** Proposal IDs to include */
  readonly proposalIds: readonly string[];
  /** Voting configuration */
  readonly config: {
    readonly threshold: number;
    readonly maxDurationHours: number;
    readonly minimumVotes: number;
  };
  /** Optional description */
  readonly description?: string;
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | 'vote_submitted'
  | 'proposal_created'
  | 'voting_session_started'
  | 'voting_session_ended'
  | 'results_calculated';

/**
 * WebSocket message
 */
export interface WebSocketMessage<T = unknown> {
  /** Message type */
  readonly type: WebSocketMessageType;
  /** Message payload */
  readonly payload: T;
  /** Message timestamp */
  readonly timestamp: Date;
  /** Message ID for tracking */
  readonly messageId: string;
}

/**
 * Webhook payload
 */
export interface WebhookPayload<T = unknown> {
  /** Event type */
  readonly event: string;
  /** Event data */
  readonly data: T;
  /** Event timestamp */
  readonly timestamp: Date;
  /** Webhook signature for verification */
  readonly signature: string;
  /** Delivery attempt number */
  readonly deliveryAttempt: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Service status */
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  /** Service version */
  readonly version: string;
  /** Uptime in seconds */
  readonly uptime: number;
  /** Database connectivity */
  readonly database: {
    readonly connected: boolean;
    readonly responseTimeMs?: number;
  };
  /** External service dependencies */
  readonly dependencies?: Record<string, {
    readonly status: 'healthy' | 'degraded' | 'unhealthy';
    readonly responseTimeMs?: number;
  }>;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Requests remaining in current window */
  readonly remaining: number;
  /** Total requests allowed in window */
  readonly limit: number;
  /** Window reset timestamp */
  readonly resetAt: Date;
  /** Current window start timestamp */
  readonly windowStart: Date;
}
