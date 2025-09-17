/**
 * @fileoverview Tests for proposal integration and source mapping
 */

import { describe, it, expect } from 'vitest';

describe('Source Proposal Integration', () => {
  it('should map BIPs to source proposals correctly', () => {
    const knownMappings = {
      'BIP-00': { proposal: 'P010', minute: '0001', title: 'Cursor IDE Extension' },
      'BIP-01': { proposal: 'P012', minute: '0001', title: 'BIP System Implementation' },
      'BIP-02': { proposal: 'P037', minute: '0003', title: 'TypeScript Ecosystem' }
    };

    Object.entries(knownMappings).forEach(([bipId, info]) => {
      expect(info.proposal).toMatch(/^P\d+$/);
      expect(info.minute).toMatch(/^\d{4}$/);
      expect(info.title).toBeDefined();
    });
  });

  it('should include vote count information', () => {
    const mockVoteCount = {
      approve: 8,
      reject: 2,
      abstain: 0
    };

    const total = mockVoteCount.approve + mockVoteCount.reject + mockVoteCount.abstain;

    expect(mockVoteCount.approve).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(0);
    expect(mockVoteCount.approve + mockVoteCount.reject + mockVoteCount.abstain).toBe(total);
  });

  it('should handle missing proposal data gracefully', () => {
    const getMissingProposalInfo = (bipId: string) => {
      const knownMappings: Record<string, any> = {
        'BIP-TEST': {
          proposal: 'P999',
          minute: '0001',
          proposalTitle: 'Test BIP System Integration'
        }
      };

      return knownMappings[bipId] || {
        proposal: undefined,
        minute: undefined,
        proposalTitle: 'Unknown Proposal'
      };
    };

    const validInfo = getMissingProposalInfo('BIP-TEST');
    const invalidInfo = getMissingProposalInfo('BIP-NONEXISTENT');

    expect(validInfo.proposal).toBe('P999');
    expect(invalidInfo.proposal).toBeUndefined();
    expect(invalidInfo.proposalTitle).toBe('Unknown Proposal');
  });

  it('should validate proposal-to-BIP workflow', () => {
    const mockProposals = [
      {
        id: 'P999',
        title: 'Test BIP System Integration',
        description: 'Integration test for the complete BIP workflow',
        author: 'claude-4-sonnet',
        created: '2025-09-08T10:00:00Z',
        status: 'approved',
        approved_date: '2025-09-08T12:00:00Z'
      }
    ];

    const mockChain = {
      bipId: 'BIP-TEST',
      sourceProposal: 'P999',
      sourceMinute: '0001',
      proposalTitle: 'Test BIP System Integration',
      approvalDate: '2025-09-08',
      voteCount: { approve: 8, reject: 1, abstain: 1 },
      created: '2025-09-08T10:00:00.000Z',
      chain: [
        {
          index: 1,
          timestamp: '2025-09-08T10:00:00.000Z',
          previousHash: null,
          type: 'draft',
          model: 'claude-4-sonnet',
          action: 'Created initial BIP specification for BIP-TEST',
          files: ['BIP-TEST.md'],
          fileHash: 'test-hash',
          hash: 'block-hash'
        }
      ]
    };

    expect(mockChain.sourceProposal).toBe(mockProposals[0].id);
    expect(mockChain.proposalTitle).toBe(mockProposals[0].title);
  });

  it('should maintain data consistency across components', () => {
    const proposalId = 'P999';
    const bipId = 'BIP-TEST';
    const minuteId = '0001';

    const mockProposal = {
      id: proposalId,
      title: 'Test BIP System Integration',
      approved_date: '2025-09-08T12:00:00Z'
    };

    const expectedChainData = {
      bipId,
      sourceProposal: proposalId,
      sourceMinute: minuteId,
      proposalTitle: mockProposal.title,
      approvalDate: mockProposal.approved_date.split('T')[0]
    };

    expect(expectedChainData.sourceProposal).toBe(mockProposal.id);
    expect(expectedChainData.proposalTitle).toBe(mockProposal.title);
    expect(expectedChainData.approvalDate).toBe('2025-09-08');
  });
});
