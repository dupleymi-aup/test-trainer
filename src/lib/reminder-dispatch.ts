/**
 * Reminder dispatch service
 *
 * Orchestrates finding due reminders, checking user preferences,
 * sending emails, and updating database state.
 */

import { DEFAULT_APP_URL } from "@/lib/constants";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import {
  generateDeadlineReminderEmail,
  generateDeadlineOverdueEmail,
  generateDeadlineReminderSMS,
  generateDeadlineOverdueSMS,
} from "@/lib/reminder-templates";
import { logger } from "@/lib/logger";

const DEFAULT_REMINDER_SCHEDULE = [7, 3, 1, 0, -1];
const SMS_ENABLED = false; // Can be toggled via env or system setting

interface DispatchResult {
  sentCount: number;
  failedCount: number;
  errors: string[];
}

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

function parseNotificationPreferences(raw: string | null): NotificationPreferences {
  if (!raw) return { email: true, sms: false, inApp: true };
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      email: parsed.email ?? true,
      sms: parsed.sms ?? false,
      inApp: parsed.inApp ?? true,
    };
  } catch {
    return { email: true, sms: false, inApp: true };
  }
}

function parseReminderSchedule(raw: string | null): number[] {
  if (!raw) return DEFAULT_REMINDER_SCHEDULE;
  try {
    const parsed = JSON.parse(raw) as number[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return DEFAULT_REMINDER_SCHEDULE;
}

/**
 * Given a deadline's dueDate and reminderSchedule, returns which offsets
 * are currently due (within the last 24-hour window).
 */
function getDueOffsets(dueDate: Date, schedule: number[]): number[] {
  const now = new Date();
  const dueOffsets: number[] = [];

  for (const offset of schedule) {
    // The target date for this offset: dueDate - offset days
    // (negative offset means days after dueDate, i.e., overdue)
    const targetDate = new Date(dueDate);
    targetDate.setDate(targetDate.getDate() - offset);

    // Consider this offset "due" if targetDate is within the last 24 hours
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (targetDate >= twentyFourHoursAgo && targetDate <= now) {
      dueOffsets.push(offset);
    }
  }

  return dueOffsets;
}

/**
 * Main function: finds all deadlines with unsent reminders and dispatches them.
 */
export async function sendDeadlineReminders(): Promise<DispatchResult> {
  const now = new Date();
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fetch all deadlines from 7 days ago to 7 days ahead, plus all overdue
  const deadlines = await db.deadline.findMany({
    where: {
      dueDate: {
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        lte: sevenDaysAhead,
      },
    },
    include: {
      group: { select: { name: true } },
      reminders: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              notificationPreferences: true,
            },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  // Also fetch overdue deadlines beyond 7 days
  const overdueDeadlines = await db.deadline.findMany({
    where: {
      dueDate: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
    include: {
      group: { select: { name: true } },
      reminders: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              notificationPreferences: true,
            },
          },
        },
      },
    },
  });

  const allDeadlines = [...deadlines, ...overdueDeadlines];

  const result: DispatchResult = { sentCount: 0, failedCount: 0, errors: [] };
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_APP_URL;

  for (const deadline of allDeadlines) {
    const schedule = parseReminderSchedule(deadline.reminderSchedule);
    const dueOffsets = getDueOffsets(deadline.dueDate, schedule);

    if (dueOffsets.length === 0) continue;

    const deadlineInfo = {
      title: deadline.title,
      type: deadline.type,
      dueDate: deadline.dueDate,
      description: deadline.description,
      groupName: deadline.group?.name || null,
    };

    for (const offset of dueOffsets) {
      // Find reminders for this deadline+offset that haven't been sent yet
      const unsentReminders = deadline.reminders.filter(
        (r) => r.offsetDays === offset && !r.sent
      );

      if (unsentReminders.length === 0) continue;

      const isOverdue = offset < 0;
      const daysRemaining = offset;
      const daysOverdue = Math.abs(offset);

      // Send in parallel with error handling per reminder
      const sendPromises = unsentReminders.map(async (reminder) => {
        const prefs = parseNotificationPreferences(reminder.user.notificationPreferences);

        try {
          // Email
          if (prefs.email && reminder.user.email) {
            let emailData;
            if (isOverdue) {
              emailData = generateDeadlineOverdueEmail({
                deadline: deadlineInfo,
                userName: reminder.user.name,
                daysOverdue,
                baseUrl,
              });
            } else {
              emailData = generateDeadlineReminderEmail({
                deadline: deadlineInfo,
                userName: reminder.user.name,
                daysRemaining,
                baseUrl,
              });
            }

            await sendEmail({
              to: reminder.user.email,
              subject: emailData.subject,
              html: emailData.html,
              text: emailData.text,
            });
          }

          // SMS (optional, disabled by default)
          if (SMS_ENABLED && prefs.sms && reminder.user.phone) {
            let smsText;
            if (isOverdue) {
              smsText = generateDeadlineOverdueSMS({ deadline: deadlineInfo, daysOverdue });
            } else {
              smsText = generateDeadlineReminderSMS({ deadline: deadlineInfo, daysRemaining });
            }
            await sendSMS({ phone: reminder.user.phone, message: smsText });
          }

          // Mark as sent
          await db.reminder.update({
            where: { id: reminder.id },
            data: { sent: true, sentAt: new Date() },
          });

          return { success: true, reminderId: reminder.id };
        } catch (error) {
          const msg = `Failed to send reminder ${reminder.id} to ${reminder.user.email || reminder.user.phone}: ${error instanceof Error ? error.message : String(error)}`;
          logger.error(msg, error instanceof Error ? error : undefined);
          return { success: false, reminderId: reminder.id, error: msg };
        }
      });

      const outcomes = await Promise.allSettled(sendPromises);

      for (const outcome of outcomes) {
        if (outcome.status === "fulfilled") {
          if (outcome.value.success) {
            result.sentCount++;
          } else {
            result.failedCount++;
            result.errors.push(outcome.value.error || "Unknown error");
          }
        } else {
          result.failedCount++;
          result.errors.push(outcome.reason?.toString() || "Unexpected error");
        }
      }
    }
  }

  return result;
}
