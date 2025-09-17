/**
 * CMMV-Hive BIP System
 * Main exports for the BIP voting system
 */

// Core classes
export { VotingChain } from './chain/VotingChain.js';
export { VotingManager } from './voting/VotingManager.js';
export { BIPManager } from './proposal/BIPManager.js';
export { VotingAnalyticsService } from './analytics/VotingAnalytics.js';
export { NotificationManager } from './notifications/NotificationManager.js';

// Types
export * from './types/index.js';

// Convenience exports for common workflows
export { createBIPWorkflow, createVotingWorkflow, analyzeVotingWorkflow } from './workflows/index.js';
