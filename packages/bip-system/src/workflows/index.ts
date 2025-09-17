/**
 * BIP System Workflows
 * High-level workflow functions for common BIP system operations
 */

import { BIPManager } from '../proposal/BIPManager.js';
import { VotingManager } from '../voting/VotingManager.js';
import { VotingAnalyticsService } from '../analytics/VotingAnalytics.js';
import { NotificationManager } from '../notifications/NotificationManager.js';
import { BIPProposal, VotingSession, VotingAnalytics, BIPType, BIPCategory, ModelProfile } from '../types/index.js';

/**
 * Complete BIP creation workflow
 */
export async function createBIPWorkflow(
  title: string,
  author: string,
  type: BIPType,
  category: BIPCategory,
  abstract: string,
  motivation: string,
  specification: string,
  rationale: string,
  bipsDirectory?: string
): Promise<{ proposal: BIPProposal; isValid: boolean; errors: string[] }> {
  const bipManager = new BIPManager(bipsDirectory);

  const proposal = await bipManager.createBIP(
    title,
    author,
    type,
    category,
    abstract,
    motivation,
    specification,
    rationale
  );

  const validation = bipManager.validateBIP(proposal);

  return {
    proposal,
    isValid: validation.isValid,
    errors: validation.errors
  };
}

/**
 * Complete voting session creation workflow
 */
export async function createVotingWorkflow(
  minuteId: string,
  proposals: string[],
  models: ModelProfile[],
  durationHours: number = 168,
  reminderHours: number[] = [72, 24, 6, 1],
  minutesDirectory?: string
): Promise<{ session: VotingSession; notificationSent: boolean }> {
  const votingManager = new VotingManager(minutesDirectory || 'gov/minutes', models);
  const notificationManager = new NotificationManager(minutesDirectory || 'gov/minutes');

  // Create voting session
  const session = await votingManager.createVotingSession(
    minuteId,
    proposals,
    durationHours
  );

  // Schedule reminders
  await notificationManager.scheduleReminders(session, reminderHours);

  // Send start notification
  const notification = await notificationManager.notifyVotingStart(session);

  return {
    session,
    notificationSent: notification.delivered
  };
}

/**
 * Complete voting analysis workflow
 */
export async function analyzeVotingWorkflow(
  minuteId: string,
  minutesDirectory?: string
): Promise<{
  analytics: VotingAnalytics;
  markdownReport: string;
  jsonReport: string;
  isValid: boolean;
  errors: string[];
}> {
  const votingManager = new VotingManager(minutesDirectory || 'gov/minutes');
  const analyticsService = new VotingAnalyticsService();

  // Load session
  const session = await votingManager.loadVotingSession(minuteId);

  // Verify integrity
  const integrity = await votingManager.verifyVotingIntegrity(minuteId);

  // Generate analytics
  const analytics = analyticsService.generateAnalytics(session);
  const markdownReport = analyticsService.generateMarkdownReport(analytics);
  const jsonReport = analyticsService.exportAnalyticsToJSON(analytics);

  return {
    analytics,
    markdownReport,
    jsonReport,
    isValid: integrity.isValid,
    errors: integrity.errors
  };
}

/**
 * Automated voting finalization workflow
 */
export async function finalizeVotingWorkflow(
  minuteId: string,
  reporterModel: string,
  minutesDirectory?: string
): Promise<{
  results: any[];
  analytics: VotingAnalytics;
  notificationSent: boolean;
  isValid: boolean;
}> {
  const votingManager = new VotingManager(minutesDirectory || 'gov/minutes');
  const notificationManager = new NotificationManager(minutesDirectory || 'gov/minutes');
  const analyticsService = new VotingAnalyticsService();

  // Finalize voting
  const results = await votingManager.finalizeVoting(minuteId, reporterModel);

  // Generate analytics
  const session = await votingManager.loadVotingSession(minuteId);
  const analytics = analyticsService.generateAnalytics(session);

  // Send finalization notification
  const approvedProposals = results.filter(r => r.status === 'Approved').map(r => r.proposalId);
  const rejectedProposals = results.filter(r => r.status === 'Rejected').map(r => r.proposalId);

  const notification = await notificationManager.notifyVotingFinalized(
    minuteId,
    session.participants,
    reporterModel,
    approvedProposals,
    rejectedProposals
  );

  // Verify integrity
  const integrity = await votingManager.verifyVotingIntegrity(minuteId);

  return {
    results,
    analytics,
    notificationSent: notification.delivered,
    isValid: integrity.isValid
  };
}

/**
 * Model onboarding workflow - updates model configuration
 */
export async function updateModelConfigWorkflow(
  models: ModelProfile[],
  votingManager?: VotingManager
): Promise<{ updatedCount: number; activeModels: string[] }> {
  if (votingManager) {
    votingManager.updateModelsConfig(models);
  }

  const activeModels = models
    .filter(model => model.isActive && model.category === 'General')
    .map(model => model.id);

  return {
    updatedCount: models.length,
    activeModels
  };
}

/**
 * Notification processing workflow - processes pending reminders
 */
export async function processNotificationsWorkflow(
  minutesDirectory?: string
): Promise<{ processedReminders: number; sentNotifications: number }> {
  const notificationManager = new NotificationManager(minutesDirectory || 'gov/minutes');
  const votingManager = new VotingManager(minutesDirectory || 'gov/minutes');

  // Check for pending reminders
  const pendingReminders = await notificationManager.checkPendingReminders();
  let sentNotifications = 0;

  for (const reminder of pendingReminders) {
    try {
      const session = await votingManager.loadVotingSession(reminder.minuteId);
      const progress = await votingManager.getVotingProgress(reminder.minuteId);

      if (progress.missingModels.length > 0 && session.status === 'Active') {
        await notificationManager.notifyVotingReminder(
          session,
          progress.missingModels,
          reminder.hoursRemaining
        );
        sentNotifications++;
      }
    } catch (error) {
      console.warn(`Failed to send reminder for ${reminder.minuteId}:`, error);
    }
  }

  return {
    processedReminders: pendingReminders.length,
    sentNotifications
  };
}

/**
 * System maintenance workflow
 */
export async function maintenanceWorkflow(
  cleanupDays: number = 30,
  minutesDirectory?: string
): Promise<{ cleanedNotifications: number; processedSessions: number }> {
  const notificationManager = new NotificationManager(minutesDirectory || 'gov/minutes');
  const votingManager = new VotingManager(minutesDirectory || 'gov/minutes');

  // Cleanup old notifications
  const cleanedNotifications = await notificationManager.cleanupOldNotifications(cleanupDays);

  // Get all sessions for processing (maintenance tasks)
  const activeSessions = await votingManager.getActiveSessions();

  return {
    cleanedNotifications,
    processedSessions: activeSessions.length
  };
}
