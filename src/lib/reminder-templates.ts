/**
 * Email and SMS templates for deadline reminders
 */

const typeLabels: Record<string, string> = {
  EXAM: "Экзамен",
  TEST: "Зачёт",
  ASSIGNMENT: "Задание",
  COURSE_END: "Окончание курса",
  REGISTRATION_END: "Окончание регистрации",
};

const typeColors: Record<string, string> = {
  EXAM: "#dc2626",
  TEST: "#d97706",
  ASSIGNMENT: "#2563eb",
  COURSE_END: "#7c3aed",
  REGISTRATION_END: "#ea580c",
};

interface DeadlineInfo {
  title: string;
  type: string;
  dueDate: Date;
  description?: string | null;
  groupName?: string | null;
}

interface ReminderEmailOptions {
  deadline: DeadlineInfo;
  userName?: string | null;
  daysRemaining: number;
  baseUrl: string;
}

interface OverdueEmailOptions {
  deadline: DeadlineInfo;
  userName?: string | null;
  daysOverdue: number;
  baseUrl: string;
}

interface ReminderSMSOptions {
  deadline: DeadlineInfo;
  daysRemaining: number;
}

interface OverdueSMSOptions {
  deadline: DeadlineInfo;
  daysOverdue: number;
}

function formatDate(date: Date): string {
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateDeadlineReminderEmail({
  deadline,
  userName,
  daysRemaining,
  baseUrl,
}: ReminderEmailOptions): { subject: string; html: string; text: string } {
  const typeLabel = typeLabels[deadline.type] || deadline.type;
  const color = typeColors[deadline.type] || "#2563eb";
  const greeting = userName ? `Здравствуйте, ${userName}!` : "Здравствуйте!";

  let timeText: string;
  if (daysRemaining === 0) {
    timeText = "Сегодня последний день!";
  } else if (daysRemaining === 1) {
    timeText = "Остался 1 день";
  } else {
    timeText = `Осталось ${daysRemaining} дн.`;
  }

  const subject = `Напоминание: ${deadline.title} — ${timeText}`;

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:${color};color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">${greeting}</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
        <div style="display:inline-block;padding:4px 12px;background:${color}15;color:${color};border-radius:4px;font-size:12px;font-weight:600;margin-bottom:12px;">
          ${typeLabel}
        </div>
        <h3 style="margin:0 0 8px;font-size:20px;">${deadline.title}</h3>
        ${deadline.description ? `<p style="color:#6b7280;margin:0 0 16px;font-size:14px;">${deadline.description}</p>` : ""}
        ${deadline.groupName ? `<p style="color:#6b7280;margin:0 0 8px;font-size:13px;">Группа: ${deadline.groupName}</p>` : ""}
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Срок:</strong> ${formatDate(deadline.dueDate)}</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:${color};">${timeText}</p>
        </div>
        <a href="${baseUrl}/student/reminders" style="display:inline-block;padding:12px 24px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          Перейти к напоминаниям
        </a>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">Тренажёр тестирования — автоматическое напоминание</p>
      </div>
    </div>
  `;

  const text = `${greeting}\n\nНапоминание: ${deadline.title} (${typeLabel})\nСрок: ${formatDate(deadline.dueDate)}\n${timeText}\n\nПерейти: ${baseUrl}/student/reminders`;

  return { subject, html, text };
}

export function generateDeadlineOverdueEmail({
  deadline,
  userName,
  daysOverdue,
  baseUrl,
}: OverdueEmailOptions): { subject: string; html: string; text: string } {
  const typeLabel = typeLabels[deadline.type] || deadline.type;
  const greeting = userName ? `Здравствуйте, ${userName}!` : "Здравствуйте!";

  const subject = `СРОЧНО: ${deadline.title} — дедлайн просрочен!`;

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#dc2626;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">⚠ ${greeting}</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
        <div style="display:inline-block;padding:4px 12px;background:#dc262615;color:#dc2626;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:12px;">
          ${typeLabel} — ПРОСРОЧЕН
        </div>
        <h3 style="margin:0 0 8px;font-size:20px;">${deadline.title}</h3>
        ${deadline.description ? `<p style="color:#6b7280;margin:0 0 16px;font-size:14px;">${deadline.description}</p>` : ""}
        ${deadline.groupName ? `<p style="color:#6b7280;margin:0 0 8px;font-size:13px;">Группа: ${deadline.groupName}</p>` : ""}
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Срок был:</strong> ${formatDate(deadline.dueDate)}</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#dc2626;">Просрочен на ${daysOverdue} дн.</p>
        </div>
        <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">Пожалуйста, обратитесь к преподавателю для уточнения ситуации.</p>
        <a href="${baseUrl}/student/reminders" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          Перейти к напоминаниям
        </a>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">Тренажёр тестирования — автоматическое напоминание</p>
      </div>
    </div>
  `;

  const text = `${greeting}\n\nСРОЧНО: ${deadline.title} (${typeLabel}) — ПРОСРОЧЕН!\nСрок был: ${formatDate(deadline.dueDate)}\nПросрочен на ${daysOverdue} дн.\n\nОбратитесь к преподавателю.\nПерейти: ${baseUrl}/student/reminders`;

  return { subject, html, text };
}

export function generateDeadlineReminderSMS({
  deadline,
  daysRemaining,
}: ReminderSMSOptions): string {
  let timeText: string;
  if (daysRemaining === 0) {
    timeText = "Сегодня последний день!";
  } else if (daysRemaining === 1) {
    timeText = "Остался 1 день";
  } else {
    timeText = `Осталось ${daysRemaining} дн.`;
  }

  return `Напоминание: ${deadline.title} до ${formatDate(deadline.dueDate)}. ${timeText}. Тренажёр тестирования.`;
}

export function generateDeadlineOverdueSMS({
  deadline,
  daysOverdue,
}: OverdueSMSOptions): string {
  return `СРОЧНО: ${deadline.title} просрочен на ${daysOverdue} дн.! Обратитесь к преподавателю. Тренажёр тестирования.`;
}
