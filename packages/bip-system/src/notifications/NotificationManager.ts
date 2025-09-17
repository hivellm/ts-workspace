/**
 * NotificationManager - Notification system for BIP voting events
 * Manages notifications for voting lifecycle events
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { NotificationEvent, NotificationType, VotingSession } from '../types/index.js';

export class NotificationManager {
  private notificationsDirectory: string;

  constructor(notificationsDirectory: string = 'gov/minutes') {
    this.notificationsDirectory = notificationsDirectory;
  }

  /**
   * Send a notification
   */
  async sendNotification(
    type: NotificationType,
    minuteId: string,
    message: string,
    recipients: string[],
    metadata?: Record<string, unknown>
  ): Promise<NotificationEvent> {
    const notification: NotificationEvent = {
      id: this.generateNotificationId(),
      type,
      minuteId,
      timestamp: new Date(),
      message,
      recipients,
      delivered: false,
      ...(metadata && { metadata })
    };

    await this.saveNotification(notification);
    await this.deliverNotification(notification);

    notification.delivered = true;
    await this.updateNotification(notification);

    return notification;
  }

  /**
   * Send voting start notification
   */
  async notifyVotingStart(session: VotingSession): Promise<NotificationEvent> {
    const message = `Voting started for minute ${session.minuteId} with ${session.proposals.length} proposal(s). Deadline: ${session.endTime.toISOString()}`;

    return this.sendNotification(
      'vote-start',
      session.minuteId,
      message,
      session.participants,
      {
        proposals: session.proposals,
        deadline: session.endTime.toISOString(),
        quorumThreshold: session.quorumThreshold,
        approvalThreshold: session.approvalThreshold
      }
    );
  }

  /**
   * Send voting reminder notification
   */
  async notifyVotingReminder(
    session: VotingSession,
    missingVoters: string[],
    hoursRemaining: number
  ): Promise<NotificationEvent> {
    const message = `Reminder: ${hoursRemaining} hours remaining to vote in session ${session.minuteId}. Missing votes from ${missingVoters.length} participants.`;

    return this.sendNotification(
      'vote-reminder',
      session.minuteId,
      message,
      missingVoters,
      {
        hoursRemaining,
        totalMissing: missingVoters.length,
        deadline: session.endTime.toISOString()
      }
    );
  }

  /**
   * Send vote received notification
   */
  async notifyVoteReceived(
    minuteId: string,
    voterModel: string,
    remainingVoters: string[]
  ): Promise<NotificationEvent> {
    const message = `Vote received from ${voterModel} for minute ${minuteId}. ${remainingVoters.length} votes still pending.`;

    return this.sendNotification(
      'vote-received',
      minuteId,
      message,
      [voterModel], // Notify the voter that their vote was received
      {
        voter: voterModel,
        remainingCount: remainingVoters.length,
        remainingVoters
      }
    );
  }

  /**
   * Send voting complete notification
   */
  async notifyVotingComplete(minuteId: string, participants: string[]): Promise<NotificationEvent> {
    const message = `All votes received for minute ${minuteId}. Voting session is ready for finalization.`;

    return this.sendNotification(
      'vote-complete',
      minuteId,
      message,
      participants,
      {
        allVotesReceived: true,
        readyForFinalization: true
      }
    );
  }

  /**
   * Send voting finalized notification
   */
  async notifyVotingFinalized(
    minuteId: string,
    participants: string[],
    reporterModel: string,
    approvedProposals: string[],
    rejectedProposals: string[]
  ): Promise<NotificationEvent> {
    const message = `Voting for minute ${minuteId} has been finalized by ${reporterModel}. ${approvedProposals.length} proposal(s) approved, ${rejectedProposals.length} rejected.`;

    return this.sendNotification(
      'vote-finalized',
      minuteId,
      message,
      participants,
      {
        reporter: reporterModel,
        approvedProposals,
        rejectedProposals,
        finalizedAt: new Date().toISOString()
      }
    );
  }

  /**
   * Schedule automatic reminders for a voting session
   */
  async scheduleReminders(session: VotingSession, reminderHours: number[] = [72, 24, 6, 1]): Promise<void> {
    // This would typically integrate with a job scheduler
    // For now, we'll create reminder records that can be processed by a separate service

    const reminderSchedule = reminderHours.map(hours => {
      const reminderTime = new Date(session.endTime.getTime() - hours * 60 * 60 * 1000);
      return {
        scheduledFor: reminderTime,
        hoursBeforeDeadline: hours,
        minuteId: session.minuteId
      };
    }).filter(reminder => reminder.scheduledFor > new Date()); // Only future reminders

    const scheduleFile = join(this.notificationsDirectory, session.minuteId, 'reminder_schedule.json');
    await fs.writeFile(scheduleFile, JSON.stringify(reminderSchedule, null, 2), 'utf-8');
  }

  /**
   * Check for pending reminders that need to be sent
   */
  async checkPendingReminders(): Promise<{ minuteId: string; hoursRemaining: number }[]> {
    // This would be called by a cron job or scheduler
    // Returns reminders that should be sent now

    const pendingReminders: { minuteId: string; hoursRemaining: number }[] = [];

    try {
      const entries = await fs.readdir(this.notificationsDirectory, { withFileTypes: true });
      const minuteDirs = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);

      for (const minuteDir of minuteDirs) {
        const scheduleFile = join(this.notificationsDirectory, minuteDir, 'reminder_schedule.json');

        try {
          const scheduleContent = await fs.readFile(scheduleFile, 'utf-8');
          const schedule = JSON.parse(scheduleContent);
          const now = new Date();

          const dueReminders = schedule.filter((reminder: any) => {
            const scheduledTime = new Date(reminder.scheduledFor);
            return scheduledTime <= now;
          });

          for (const reminder of dueReminders) {
            pendingReminders.push({
              minuteId: reminder.minuteId,
              hoursRemaining: reminder.hoursBeforeDeadline
            });
          }

          // Update schedule to remove sent reminders
          const remainingSchedule = schedule.filter((reminder: any) => {
            const scheduledTime = new Date(reminder.scheduledFor);
            return scheduledTime > now;
          });

          await fs.writeFile(scheduleFile, JSON.stringify(remainingSchedule, null, 2), 'utf-8');

        } catch (error) {
          // Skip if no schedule file or invalid format
        }
      }
    } catch (error) {
      // No minutes directory or error reading
    }

    return pendingReminders;
  }

  /**
   * Get notification history for a minute
   */
  async getNotificationHistory(minuteId: string): Promise<NotificationEvent[]> {
    const notificationsFile = join(this.notificationsDirectory, minuteId, 'notifications.json');

    try {
      const content = await fs.readFile(notificationsFile, 'utf-8');
      const data = JSON.parse(content);

      return data.notifications.map((notif: any) => ({
        ...notif,
        timestamp: new Date(notif.timestamp)
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    try {
      const entries = await fs.readdir(this.notificationsDirectory, { withFileTypes: true });
      const minuteDirs = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);

      for (const minuteDir of minuteDirs) {
        const notificationsFile = join(this.notificationsDirectory, minuteDir, 'notifications.json');

        try {
          const content = await fs.readFile(notificationsFile, 'utf-8');
          const data = JSON.parse(content);

          const originalCount = data.notifications.length;
          data.notifications = data.notifications.filter((notif: any) => {
            const notifDate = new Date(notif.timestamp);
            return notifDate >= cutoffDate;
          });

          cleanedCount += originalCount - data.notifications.length;

          if (data.notifications.length === 0) {
            await fs.unlink(notificationsFile);
          } else {
            await fs.writeFile(notificationsFile, JSON.stringify(data, null, 2), 'utf-8');
          }
        } catch (error) {
          // Skip if file doesn't exist or invalid format
        }
      }
    } catch (error) {
      // No minutes directory
    }

    return cleanedCount;
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `notif_${timestamp}_${random}`;
  }

  /**
   * Save notification to persistent storage
   */
  private async saveNotification(notification: NotificationEvent): Promise<void> {
    const minuteDir = join(this.notificationsDirectory, notification.minuteId);
    const notificationsFile = join(minuteDir, 'notifications.json');

    await fs.mkdir(minuteDir, { recursive: true });

    let notifications: NotificationEvent[] = [];

    try {
      const content = await fs.readFile(notificationsFile, 'utf-8');
      const data = JSON.parse(content);
      notifications = data.notifications || [];
    } catch (error) {
      // File doesn't exist yet, start with empty array
    }

    notifications.push(notification);

    const data = {
      minuteId: notification.minuteId,
      lastUpdated: new Date().toISOString(),
      notifications
    };

    await fs.writeFile(notificationsFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Update existing notification
   */
  private async updateNotification(notification: NotificationEvent): Promise<void> {
    const minuteDir = join(this.notificationsDirectory, notification.minuteId);
    const notificationsFile = join(minuteDir, 'notifications.json');

    try {
      const content = await fs.readFile(notificationsFile, 'utf-8');
      const data = JSON.parse(content);

      const index = data.notifications.findIndex((n: NotificationEvent) => n.id === notification.id);
      if (index !== -1) {
        data.notifications[index] = notification;
        data.lastUpdated = new Date().toISOString();

        await fs.writeFile(notificationsFile, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (error) {
      // File might not exist, which is OK
    }
  }

  /**
   * Deliver notification (placeholder for actual delivery mechanism)
   */
  private async deliverNotification(notification: NotificationEvent): Promise<void> {
    // In a real implementation, this would:
    // - Send emails, Slack messages, Discord notifications, etc.
    // - Log to console for development
    // - Write to notification queues for external systems

    console.log(`[NOTIFICATION] ${notification.type.toUpperCase()}: ${notification.message}`);
    console.log(`Recipients: ${notification.recipients.join(', ')}`);

    if (notification.metadata) {
      console.log(`Metadata:`, JSON.stringify(notification.metadata, null, 2));
    }
  }
}
