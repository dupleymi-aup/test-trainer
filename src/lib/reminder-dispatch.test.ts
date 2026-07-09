import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  deadline: {
    findMany: vi.fn(),
  },
  reminder: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/sms", () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock("@/lib/reminder-templates", () => ({
  generateDeadlineReminderEmail: vi.fn(() => ({
    subject: "Reminder: Test deadline",
    html: "<p>Reminder</p>",
    text: "Reminder text",
  })),
  generateDeadlineOverdueEmail: vi.fn(() => ({
    subject: "Overdue: Test deadline",
    html: "<p>Overdue</p>",
    text: "Overdue text",
  })),
  generateDeadlineReminderSMS: vi.fn(() => "SMS reminder text"),
  generateDeadlineOverdueSMS: vi.fn(() => "SMS overdue text"),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { sendDeadlineReminders } from "./reminder-dispatch";
import { sendEmail } from "@/lib/email";
import { generateDeadlineReminderEmail, generateDeadlineOverdueEmail } from "@/lib/reminder-templates";

const NOW = new Date("2026-07-09T12:00:00Z");

const baseUser = {
  id: "u-1",
  name: "Alice",
  email: "alice@test.com" as string | null,
  phone: "+79991234567",
  notificationPreferences: JSON.stringify({ email: true, sms: false, inApp: true }),
};

interface ReminderShape {
  id: string; offsetDays: number; sent: boolean; sentAt: Date | null;
  userId: string; deadlineId: string; user: typeof baseUser;
}

function makeReminder(overrides: Partial<ReminderShape> = {}): ReminderShape {
  return {
    id: "rem-1", offsetDays: 1, sent: false, sentAt: null,
    userId: "u-1", deadlineId: "dl-1", user: { ...baseUser },
    ...overrides,
  };
}

function makeDeadline(overrides: Record<string, unknown> = {}) {
  return {
    id: "dl-1",
    title: "Math Exam",
    type: "EXAM",
    description: "Final exam",
    dueDate: NOW,
    reminderSchedule: JSON.stringify([7, 3, 1, 0, -1]),
    group: { name: "Group A" },
    reminders: [],
    ...overrides,
  };
}

describe("sendDeadlineReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns zero counts when no deadlines found", async () => {
    mockDb.deadline.findMany.mockResolvedValue([]);

    const result = await sendDeadlineReminders();
    expect(result).toEqual({ sentCount: 0, failedCount: 0, errors: [] });
  });

  function setupDeadline(reminder: ReminderShape, dueDate: Date) {
    mockDb.deadline.findMany
      .mockResolvedValueOnce([makeDeadline({ dueDate, reminders: [reminder] })])
      .mockResolvedValueOnce([]);
  }

  it("sends email reminders for due offsets", async () => {
    const reminder = makeReminder({ offsetDays: 1 });
    const dueDate = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);
    setupDeadline(reminder, dueDate);
    mockDb.reminder.update.mockResolvedValue({});

    const result = await sendDeadlineReminders();
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(0);

    expect(sendEmail).toHaveBeenCalledWith({
      to: "alice@test.com",
      subject: "Reminder: Test deadline",
      html: "<p>Reminder</p>",
      text: "Reminder text",
    });
    expect(generateDeadlineReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ userName: "Alice", daysRemaining: 1 })
    );
    expect(mockDb.reminder.update).toHaveBeenCalledWith({
      where: { id: "rem-1" },
      data: expect.objectContaining({ sent: true, sentAt: expect.any(Date) }),
    });
  });

  it("sends overdue emails for negative offsets", async () => {
    const reminder = makeReminder({ offsetDays: -1 });
    const dueDate = new Date(NOW.getTime() - 30 * 60 * 60 * 1000);
    setupDeadline(reminder, dueDate);
    mockDb.reminder.update.mockResolvedValue({});

    const result = await sendDeadlineReminders();
    expect(result.sentCount).toBe(1);
    expect(generateDeadlineOverdueEmail).toHaveBeenCalledWith(
      expect.objectContaining({ userName: "Alice", daysOverdue: 1 })
    );
  });

  it("skips reminders that are already sent", async () => {
    const reminder = makeReminder({ offsetDays: 1, sent: true });
    const dueDate = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);
    setupDeadline(reminder, dueDate);

    const result = await sendDeadlineReminders();
    expect(result.sentCount).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips users without email when email is enabled", async () => {
    const reminder = makeReminder({
      offsetDays: 1,
      user: { ...baseUser, email: null },
    });
    const dueDate = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);
    setupDeadline(reminder, dueDate);
    mockDb.reminder.update.mockResolvedValue({});

    const result = await sendDeadlineReminders();
    expect(result.sentCount).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("handles email sending failures gracefully", async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("SMTP error"));
    const reminder = makeReminder({ offsetDays: 1 });
    const dueDate = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);
    setupDeadline(reminder, dueDate);

    const result = await sendDeadlineReminders();
    expect(result.sentCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("SMTP error");
  });

  it("processes multiple reminders for the same deadline", async () => {
    const rem1 = makeReminder({ id: "rem-1", offsetDays: 1 });
    const rem2 = makeReminder({
      id: "rem-2",
      offsetDays: 1,
      user: { ...baseUser, id: "u-2", name: "Bob", email: "bob@test.com" },
    });
    const dueDate = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);
    mockDb.deadline.findMany
      .mockResolvedValueOnce([makeDeadline({ dueDate, reminders: [rem1, rem2] })])
      .mockResolvedValueOnce([]);
    mockDb.reminder.update.mockResolvedValue({});

    const result = await sendDeadlineReminders();
    expect(result.sentCount).toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("considers overdue deadlines beyond 7 days", async () => {
    const overdueReminder = makeReminder({ offsetDays: -1 });
    const dueDate = new Date(NOW.getTime() - 30 * 60 * 60 * 1000);
    mockDb.deadline.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeDeadline({ id: "dl-old", dueDate, reminders: [overdueReminder] }),
      ]);
    mockDb.reminder.update.mockResolvedValue({});

    const result = await sendDeadlineReminders();
    expect(result.sentCount).toBe(1);
  });

  it("skips offsets that are not currently due", async () => {
    const reminder = makeReminder({ offsetDays: 7 });
    const farFuture = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
    mockDb.deadline.findMany
      .mockResolvedValueOnce([makeDeadline({ dueDate: farFuture, reminders: [reminder] })])
      .mockResolvedValueOnce([]);

    const result = await sendDeadlineReminders();
    expect(result.sentCount).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
