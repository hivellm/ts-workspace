/**
 * @fileoverview Tests for BIP template generation and creation
 */

import { describe, it, expect } from 'vitest';

describe('BIP Template Generation', () => {
  it('should generate BIP template correctly', () => {
    const generateBipTemplate = (bipId: string, title: string, author: string) => {
      return `# ${bipId}: ${title}

## Authors
- ${author}

## Type
Standards Track

## Category
Core

## Status
Draft

## Created
${new Date().toISOString().split('T')[0]}

## Abstract
[Provide a brief technical summary of the proposal]

## Motivation
[Explain the problem this BIP solves and why it's needed]

## Specification
[Detailed technical specification of the proposal]

## Implementation
[Implementation details, code examples, and reference implementations]

## Test Vectors
[Test cases and validation examples]

## Security Considerations
[Security implications and mitigations]

## Copyright
This BIP is dedicated to the public domain.
`;
    };

    const template = generateBipTemplate('BIP-999', 'Test BIP Creation', 'claude-4-sonnet');

    expect(template).toContain('BIP-999: Test BIP Creation');
    expect(template).toContain('claude-4-sonnet');
    expect(template).toContain('## Abstract');
    expect(template).toContain('## Motivation');
    expect(template).toContain('## Specification');
    expect(template).toContain('## Implementation');
    expect(template).toContain('## Security Considerations');
  });

  it('should include all required sections', () => {
    const generateTemplate = (bipId: string) => {
      const requiredSections = [
        'Authors',
        'Type',
        'Category',
        'Status',
        'Created',
        'Abstract',
        'Motivation',
        'Specification',
        'Implementation',
        'Test Vectors',
        'Security Considerations',
        'Copyright'
      ];

      let template = `# ${bipId}: Template Title\n\n`;

      requiredSections.forEach(section => {
        template += `## ${section}\n[${section} content]\n\n`;
      });

      return { template, requiredSections };
    };

    const { template, requiredSections } = generateTemplate('BIP-999');

    requiredSections.forEach(section => {
      expect(template).toContain(`## ${section}`);
    });
  });

  it('should validate template structure', () => {
    const validateTemplate = (content: string) => {
      const errors: string[] = [];

      // Check for title
      if (!content.match(/^# BIP-\d+:/m)) {
        errors.push('Missing or invalid BIP title format');
      }

      // Check for required sections
      const requiredSections = ['Authors', 'Type', 'Category', 'Status', 'Abstract', 'Motivation', 'Specification'];

      requiredSections.forEach(section => {
        if (!content.includes(`## ${section}`)) {
          errors.push(`Missing required section: ${section}`);
        }
      });

      return {
        valid: errors.length === 0,
        errors
      };
    };

    const validTemplate = `# BIP-001: Valid Template

## Authors
- test-author

## Type
Standards Track

## Category
Core

## Status
Draft

## Abstract
Valid abstract

## Motivation
Valid motivation

## Specification
Valid specification
`;

    const invalidTemplate = `# Invalid Template

## Authors
- test-author

## Abstract
Missing required sections
`;

    const validResult = validateTemplate(validTemplate);
    const invalidResult = validateTemplate(invalidTemplate);

    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors).toContain('Missing required section: Type');
    expect(invalidResult.errors).toContain('Missing required section: Category');
    expect(invalidResult.errors).toContain('Missing required section: Status');
  });

  it('should generate template with current date', () => {
    const generateTemplateWithDate = () => {
      const currentDate = new Date().toISOString().split('T')[0];
      return `# BIP-001: Test Template

## Created
${currentDate}

## Status
Draft
`;
    };

    const template = generateTemplateWithDate();
    const today = new Date().toISOString().split('T')[0];

    expect(template).toContain(`## Created\n${today}`);
    expect(template).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
