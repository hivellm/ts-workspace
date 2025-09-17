/**
 * @fileoverview Tests for implementation progress tracking and milestones
 */

import { describe, it, expect } from 'vitest';

describe('Implementation Progress Tracking', () => {
  it('should calculate implementation progress', () => {
    const testPlanContent = `# BIP-TEST Implementation Plan

## Phase 1: Initial Setup ✅
- [x] Create BIP specification
- [x] Define test structure

## Phase 2: Implementation 🚧
- [x] Core functionality
- [ ] Advanced features

## Phase 3: Testing 📋
- [ ] Unit tests
- [ ] Integration tests

## Status: In Progress
Current progress: 50%
`;

    const completedTasks = (testPlanContent.match(/- \[x\]/g) || []).length;
    const totalTasks = (testPlanContent.match(/- \[[x ]\]/g) || []).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    expect(completedTasks).toBe(3);
    expect(totalTasks).toBe(6);
    expect(progress).toBe(50);
  });

  it('should identify implementation phases', () => {
    const planContent = `# BIP-TEST Implementation Plan

## Phase 1: Initial Setup ✅
- [x] Create BIP specification

## Phase 2: Implementation 🚧
- [x] Core functionality

## Phase 3: Testing 📋
- [ ] Unit tests
`;

    const phases = [
      { name: 'Phase 1', status: '✅' },
      { name: 'Phase 2', status: '🚧' },
      { name: 'Phase 3', status: '📋' }
    ];

    phases.forEach(phase => {
      expect(planContent).toContain(phase.name);
      expect(planContent).toContain(phase.status);
    });
  });

  it('should track implementation milestones', () => {
    interface Milestone {
      phase: string;
      status: 'pending' | 'in_progress' | 'completed';
      tasks: string[];
      completedTasks: number;
    }

    const mockMilestones: Milestone[] = [
      {
        phase: 'Draft',
        status: 'completed',
        tasks: ['Create specification', 'Initial review'],
        completedTasks: 2
      },
      {
        phase: 'Implementation',
        status: 'in_progress',
        tasks: ['Core implementation', 'Unit tests', 'Integration tests'],
        completedTasks: 2
      },
      {
        phase: 'Testing',
        status: 'pending',
        tasks: ['End-to-end tests', 'Performance tests'],
        completedTasks: 0
      }
    ];

    const totalTasks = mockMilestones.reduce((sum, m) => sum + m.tasks.length, 0);
    const totalCompleted = mockMilestones.reduce((sum, m) => sum + m.completedTasks, 0);
    const overallProgress = Math.round((totalCompleted / totalTasks) * 100);

    expect(totalTasks).toBe(7);
    expect(totalCompleted).toBe(4);
    expect(overallProgress).toBe(57);

    const implementationMilestone = mockMilestones[1];
    const implementationProgress = Math.round(
      (implementationMilestone.completedTasks / implementationMilestone.tasks.length) * 100
    );
    expect(implementationProgress).toBe(67);
  });

  it('should calculate phase durations', () => {
    interface PhaseRecord {
      phase: string;
      startDate: string;
      endDate?: string;
    }

    const mockPhases: PhaseRecord[] = [
      {
        phase: 'Draft',
        startDate: '2025-09-01',
        endDate: '2025-09-03'
      },
      {
        phase: 'Implementation',
        startDate: '2025-09-03',
        endDate: '2025-09-07'
      },
      {
        phase: 'Testing',
        startDate: '2025-09-07'
      }
    ];

    const calculateDuration = (start: string, end?: string) => {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : new Date();
      return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    };

    const draftDuration = calculateDuration(mockPhases[0].startDate, mockPhases[0].endDate);
    const implementationDuration = calculateDuration(mockPhases[1].startDate, mockPhases[1].endDate);

    expect(draftDuration).toBe(2);
    expect(implementationDuration).toBe(4);

    const testingPhase = mockPhases[2];
    const testingDuration = calculateDuration(testingPhase.startDate);
    expect(testingDuration).toBeGreaterThan(0);
  });
});
