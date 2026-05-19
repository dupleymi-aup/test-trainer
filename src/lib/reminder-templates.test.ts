import { describe, it, expect } from "vitest";
import {
  generateDeadlineReminderEmail,
  generateDeadlineOverdueEmail,
  generateDeadlineReminderSMS,
  generateDeadlineOverdueSMS,
} from "./reminder-templates";

const BASE_URL = "https://example.com";

function makeDeadline(overrides: Record<string, unknown> = {}) {
  return {
    title: "Final Exam",
    type: "EXAM",
    dueDate: new Date("2025-06-15T10:00:00Z"),
    description: "Comprehensive final",
    groupName: "CS101",
    ...overrides,
  };
}

describe("reminder-templates", () => {
  // --- generateDeadlineReminderEmail ---
  describe("generateDeadlineReminderEmail", () => {
    it("generates email with all fields", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline(),
        userName: "Ivan",
        daysRemaining: 3,
        baseUrl: BASE_URL,
      });

      expect(result.subject).toContain("Final Exam");
      expect(result.subject).toContain("Осталось 3 дн.");
      expect(result.html).toContain("Здравствуйте, Ivan!");
      expect(result.html).toContain("Final Exam");
      expect(result.html).toContain("Comprehensive final");
      expect(result.html).toContain("Группа: CS101");
      expect(result.html).toContain(`${BASE_URL}/student/reminders`);
      expect(result.text).toContain("Здравствуйте, Ivan!");
    });

    it("uses generic greeting when userName is null", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline(),
        userName: null,
        daysRemaining: 5,
        baseUrl: BASE_URL,
      });
      expect(result.subject).toContain("Напоминание");
      expect(result.html).toContain("Здравствуйте!");
    });

    it("uses generic greeting when userName is undefined", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline(),
        daysRemaining: 5,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("Здравствуйте!");
    });

    it("shows 'Сегодня последний день!' when daysRemaining is 0", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline(),
        daysRemaining: 0,
        baseUrl: BASE_URL,
      });
      expect(result.subject).toContain("Сегодня последний день!");
      expect(result.html).toContain("Сегодня последний день!");
    });

    it("shows 'Остался 1 день' when daysRemaining is 1", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline(),
        daysRemaining: 1,
        baseUrl: BASE_URL,
      });
      expect(result.subject).toContain("Остался 1 день");
      expect(result.html).toContain("Остался 1 день");
    });

    it("uses correct type label for EXAM", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline({ type: "EXAM" }),
        daysRemaining: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("Экзамен");
    });

    it("uses correct type label for TEST", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline({ type: "TEST" }),
        daysRemaining: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("Зачёт");
    });

    it("uses correct type label for ASSIGNMENT", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline({ type: "ASSIGNMENT" }),
        daysRemaining: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("Задание");
    });

    it("uses correct type label for COURSE_END", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline({ type: "COURSE_END" }),
        daysRemaining: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("Окончание курса");
    });

    it("uses correct type label for REGISTRATION_END", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline({ type: "REGISTRATION_END" }),
        daysRemaining: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("Окончание регистрации");
    });

    it("falls back to raw type for unknown type", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline({ type: "UNKNOWN_TYPE" }),
        daysRemaining: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("UNKNOWN_TYPE");
    });

    it("omits description when null", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline({ description: null }),
        daysRemaining: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).not.toContain("Comprehensive final");
    });

    it("omits groupName when null", () => {
      const result = generateDeadlineReminderEmail({
        deadline: makeDeadline({ groupName: null }),
        daysRemaining: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).not.toContain("Группа:");
    });

    it("omits description when missing", () => {
      const deadline = {
        title: "Quiz",
        type: "TEST",
        dueDate: new Date("2025-06-15T10:00:00Z"),
      } as const;
      const result = generateDeadlineReminderEmail({
        deadline,
        daysRemaining: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("Quiz");
    });
  });

  // --- generateDeadlineOverdueEmail ---
  describe("generateDeadlineOverdueEmail", () => {
    it("generates overdue email", () => {
      const result = generateDeadlineOverdueEmail({
        deadline: makeDeadline(),
        userName: "Maria",
        daysOverdue: 3,
        baseUrl: BASE_URL,
      });

      expect(result.subject).toContain("СРОЧНО");
      expect(result.subject).toContain("просрочен");
      expect(result.html).toContain("Здравствуйте, Maria!");
      expect(result.html).toContain("ПРОСРОЧЕН");
      expect(result.html).toContain("Просрочен на 3 дн.");
      expect(result.html).toContain("обратитесь к преподавателю");
    });

    it("uses generic greeting when userName is null", () => {
      const result = generateDeadlineOverdueEmail({
        deadline: makeDeadline(),
        userName: null,
        daysOverdue: 1,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("Здравствуйте!");
    });

    it("includes type label with ПРОСРОЧЕН suffix", () => {
      const result = generateDeadlineOverdueEmail({
        deadline: makeDeadline({ type: "EXAM" }),
        daysOverdue: 2,
        baseUrl: BASE_URL,
      });
      expect(result.html).toContain("Экзамен — ПРОСРОЧЕН");
    });

    it("returns subject, html, and text", () => {
      const result = generateDeadlineOverdueEmail({
        deadline: makeDeadline(),
        daysOverdue: 1,
        baseUrl: BASE_URL,
      });
      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("text");
      expect(typeof result.subject).toBe("string");
      expect(typeof result.html).toBe("string");
      expect(typeof result.text).toBe("string");
    });
  });

  // --- generateDeadlineReminderSMS ---
  describe("generateDeadlineReminderSMS", () => {
    it("generates reminder SMS", () => {
      const result = generateDeadlineReminderSMS({
        deadline: makeDeadline(),
        daysRemaining: 3,
      });
      expect(result).toContain("Напоминание: Final Exam");
      expect(result).toContain("Осталось 3 дн.");
      expect(result).toContain("Тренажёр тестирования");
    });

    it("shows 'Сегодня последний день!' when daysRemaining is 0", () => {
      const result = generateDeadlineReminderSMS({
        deadline: makeDeadline(),
        daysRemaining: 0,
      });
      expect(result).toContain("Сегодня последний день!");
    });

    it("shows 'Остался 1 день' when daysRemaining is 1", () => {
      const result = generateDeadlineReminderSMS({
        deadline: makeDeadline(),
        daysRemaining: 1,
      });
      expect(result).toContain("Остался 1 день");
    });

    it("includes formatted due date", () => {
      const result = generateDeadlineReminderSMS({
        deadline: makeDeadline(),
        daysRemaining: 5,
      });
      // ru-RU format: DD.MM.YYYY, HH:MM
      expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    });
  });

  // --- generateDeadlineOverdueSMS ---
  describe("generateDeadlineOverdueSMS", () => {
    it("generates overdue SMS", () => {
      const result = generateDeadlineOverdueSMS({
        deadline: makeDeadline(),
        daysOverdue: 2,
      });
      expect(result).toContain("СРОЧНО: Final Exam просрочен на 2 дн.!");
      expect(result).toContain("Обратитесь к преподавателю");
      expect(result).toContain("Тренажёр тестирования");
    });

    it("handles zero days overdue", () => {
      const result = generateDeadlineOverdueSMS({
        deadline: makeDeadline(),
        daysOverdue: 0,
      });
      expect(result).toContain("просрочен на 0 дн.");
    });

    it("handles large overdue values", () => {
      const result = generateDeadlineOverdueSMS({
        deadline: makeDeadline(),
        daysOverdue: 100,
      });
      expect(result).toContain("просрочен на 100 дн.");
    });
  });

  // --- formatDate consistency ---
  describe("date formatting", () => {
    it("formats date in ru-RU locale across email and SMS", () => {
      const email = generateDeadlineReminderEmail({
        deadline: makeDeadline(),
        daysRemaining: 3,
        baseUrl: BASE_URL,
      });
      const sms = generateDeadlineReminderSMS({
        deadline: makeDeadline(),
        daysRemaining: 3,
      });
      // Both should contain the same formatted date pattern
      const emailDate = email.html.match(/\d{2}\.\d{2}\.\d{4}/)?.[0];
      const smsDate = sms.match(/\d{2}\.\d{2}\.\d{4}/)?.[0];
      expect(emailDate).toBeDefined();
      expect(emailDate).toBe(smsDate);
    });
  });
});
