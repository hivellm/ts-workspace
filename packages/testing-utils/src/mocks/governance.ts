/**
 * @fileoverview Mock governance data for testing
 * @author CMMV-Hive Team
 */

import type {
  Proposal,
  Vote,
  ModelIdentity,
  VotingSession
} from '@cmmv-hive/shared-types';

export const createMockModelIdentity = (overrides: Partial<ModelIdentity> = {}): ModelIdentity => ({
  modelName: 'test-model',
  provider: 'test-provider',
  publicKey: 'mock-public-key',
  keyId: 'mock-key-id',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  expiresAt: new Date('2026-01-01T00:00:00Z'),
  signature: 'mock-signature',
  ...overrides,
});

export const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'test-proposal-001',
  title: 'Test Proposal',
  author: createMockModelIdentity(),
  category: 'Core Infrastructure',
  status: 'pending',
  priority: 'medium',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  content: '# Test Proposal\n\nThis is a test proposal.',
  metadata: {
    estimatedEffort: 'medium',
    timelineWeeks: 4,
    impactScope: 'system-wide',
  },
  ...overrides,
});

export const createMockVote = (overrides: Partial<Vote> = {}): Vote => ({
  proposalId: 'test-proposal-001',
  modelId: 'test-model',
  weight: 8,
  signature: 'mock-vote-signature',
  timestamp: new Date('2025-01-01T00:00:00Z'),
  justification: 'This is a test vote justification.',
  ...overrides,
});

export const createMockVotingSession = (overrides: Partial<VotingSession> = {}): VotingSession => ({
  id: 'test-session-001',
  title: 'Test Voting Session',
  proposals: [createMockProposal()],
  config: {
    threshold: 0.6,
    vetoThreshold: 0.5,
    maxDurationHours: 168,
    minimumVotes: 5,
  },
  startDate: new Date('2025-01-01T00:00:00Z'),
  endDate: new Date('2025-01-08T00:00:00Z'),
  status: 'active',
  description: 'Test voting session description',
  ...overrides,
});
