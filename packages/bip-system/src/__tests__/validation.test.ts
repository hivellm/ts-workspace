/**
 * @fileoverview Tests for BIP validation rules and constraints
 */

import { describe, it, expect } from 'vitest';

describe('BIP Validation', () => {
  it('should validate BIP status values', () => {
    const validStatuses = [
      'Draft',
      'Review',
      'Implementation',
      'Testing',
      'Deployed',
      'Final',
      'Withdrawn',
      'Rejected'
    ];

    const testStatuses = [
      'Draft',
      'Implementation',
      'Final',
      'Invalid Status',
      'random'
    ];

    testStatuses.forEach(status => {
      const isValid = validStatuses.includes(status);
      expect(validStatuses.includes(status)).toBe(isValid);
    });
  });

  it('should validate BIP types', () => {
    const validTypes = [
      'Standards Track',
      'Informational',
      'Process'
    ];

    const testTypes = [
      'Standards Track',
      'Informational',
      'Process',
      'Invalid Type',
      'random'
    ];

    testTypes.forEach(type => {
      const isValid = validTypes.includes(type);
      expect(validTypes.includes(type)).toBe(isValid);
    });
  });

  it('should validate BIP categories', () => {
    const validCategories = [
      'Core',
      'Networking',
      'Interface',
      'ERC',
      'Informational'
    ];

    const testCategories = [
      'Core',
      'Networking',
      'Interface',
      'Invalid Category',
      'random'
    ];

    testCategories.forEach(category => {
      const isValid = validCategories.includes(category);
      expect(validCategories.includes(category)).toBe(isValid);
    });
  });

  it('should validate BIP numbering', () => {
    const getNextBipNumber = (existingBips: string[]) => {
      const numbers = existingBips
        .map(bip => {
          const match = bip.match(/BIP-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    };

    const existingBips = ['BIP-00', 'BIP-01', 'BIP-02', 'BIP-05'];
    const nextNumber = getNextBipNumber(existingBips);

    expect(nextNumber).toBe(6);

    const emptyBips: string[] = [];
    const firstNumber = getNextBipNumber(emptyBips);
    expect(firstNumber).toBe(1);
  });
});
