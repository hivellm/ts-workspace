/**
 * @fileoverview Tests for BIP content parsing and validation
 */

import { describe, it, expect } from 'vitest';

describe('BIP Content Parsing', () => {
  it('should parse BIP metadata correctly', () => {
    const bipContent = `# BIP-999: Test Implementation Proposal

## Authors
- claude-4-sonnet (Lead AI Developer)
- gpt-5 (Contributing AI Developer)

## Type
Standards Track

## Category
Core

## Status
Implementation

## Created
2025-09-08

## Abstract
This BIP describes a test implementation for the governance system.

## Motivation
We need robust testing capabilities for the BIP system.

## Specification
Detailed technical specification goes here.
`;

    const extractTitle = (content: string) => {
      const match = content.match(/^# (.*?)$/m);
      return match?.[1] || '';
    };

    const extractAuthors = (content: string) => {
      const match = content.match(/## Authors\n(.*?)(?=\n##|$)/s);
      if (!match) return [];
      return match[1].split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim());
    };

    const extractField = (content: string, field: string) => {
      const match = content.match(new RegExp(`## ${field}\\n(.*?)(?=\\n##|$)`, 's'));
      return match?.[1]?.trim() || '';
    };

    const title = extractTitle(bipContent);
    const authors = extractAuthors(bipContent);
    const type = extractField(bipContent, 'Type');
    const category = extractField(bipContent, 'Category');
    const status = extractField(bipContent, 'Status');
    const created = extractField(bipContent, 'Created');

    expect(title).toBe('BIP-999: Test Implementation Proposal');
    expect(authors).toHaveLength(2);
    expect(authors[0]).toContain('claude-4-sonnet');
    expect(authors[1]).toContain('gpt-5');
    expect(type).toBe('Standards Track');
    expect(category).toBe('Core');
    expect(status).toBe('Implementation');
    expect(created).toBe('2025-09-08');
  });

  it('should validate BIP structure', () => {
    const validBipContent = `# BIP-001: Valid BIP Structure

## Authors
- test-author

## Type
Standards Track

## Category
Core

## Status
Draft

## Created
2025-09-08

## Abstract
Valid abstract content.

## Motivation
Valid motivation content.

## Specification
Valid specification content.
`;

    const requiredSections = [
      'Authors',
      'Type',
      'Category',
      'Status',
      'Created',
      'Abstract',
      'Motivation',
      'Specification'
    ];

    requiredSections.forEach(section => {
      expect(validBipContent).toContain(`## ${section}`);
    });

    const bipIdMatch = validBipContent.match(/^# (BIP-\d+):/m);
    expect(bipIdMatch?.[1]).toMatch(/^BIP-\d+$/);
  });

  it('should handle malformed content', () => {
    const malformedContent = `# Invalid BIP Without Required Sections

Some random content without proper structure.
`;

    const extractField = (content: string, field: string) => {
      const match = content.match(new RegExp(`## ${field}\\n(.*?)(?=\\n##|$)`, 's'));
      return match?.[1]?.trim() || '';
    };

    const authors = extractField(malformedContent, 'Authors');
    const status = extractField(malformedContent, 'Status');
    const abstract = extractField(malformedContent, 'Abstract');

    expect(authors).toBe('');
    expect(status).toBe('');
    expect(abstract).toBe('');
  });
});
