import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AchievementsPanel } from "./achievements-panel";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const translations: Record<string, string> = {
  "achievements.title": "Достижения",
  "achievements.subtitle": "{unlocked} из {total} получено",
  "achievements.share": "Поделиться",
  "achievements.shareTitle": "Тренажёр тестирования — Мои достижения",
  "achievements.shareCount": "{count} из {total} получено",
  "achievements.copied": "Достижения скопированы в буфер обмена!",
  "achievements.copyFailed": "Не удалось скопировать",
  "achievements.unlockedToast": "Достижение разблокировано!",
  "achievements.first_blood_name": "Первый тест",
  "achievements.first_blood_desc": "Отправьте первую проверку тест-кейсов",
  "achievements.first_perfect_name": "Безупречно",
  "achievements.first_perfect_desc": "Получите оценку 100% по любому заданию",
};

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, params?: Record<string, string | number>) => {
    const fullKey = `${ns}.${key}`;
    let text = translations[fullKey] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return text;
  },
}));

describe("AchievementsPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders achievements heading", () => {
    render(<AchievementsPanel />);
    expect(screen.getByText(/Достижения/)).toBeTruthy();
  });

  it("shows unlocked count as 0 when no achievements unlocked", () => {
    render(<AchievementsPanel />);
    expect(screen.getByText("0 из 23 получено")).toBeTruthy();
  });

  it("does not show share button when nothing unlocked", () => {
    render(<AchievementsPanel />);
    expect(screen.queryByText("Поделиться")).toBeFalsy();
  });

  it("shows share button when achievements are unlocked", () => {
    localStorage.setItem(
      "test-trainer-achievements",
      JSON.stringify(["first_blood"])
    );
    render(<AchievementsPanel />);
    expect(screen.getByText("Поделиться")).toBeTruthy();
  });

  it("shows correct count when achievements are unlocked", () => {
    localStorage.setItem(
      "test-trainer-achievements",
      JSON.stringify(["first_blood", "first_perfect"])
    );
    render(<AchievementsPanel />);
    expect(screen.getByText("2 из 23 получено")).toBeTruthy();
  });

  it("copies achievements to clipboard on share click", async () => {
    localStorage.setItem(
      "test-trainer-achievements",
      JSON.stringify(["first_blood"])
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<AchievementsPanel />);
    fireEvent.click(screen.getByText("Поделиться"));

    expect(writeText).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("shows achievement icons", () => {
    localStorage.setItem(
      "test-trainer-achievements",
      JSON.stringify(["first_blood"])
    );
    render(<AchievementsPanel />);
    expect(screen.getByText("🎯")).toBeTruthy();
  });

  it("shows locked achievements", () => {
    render(<AchievementsPanel />);
    expect(screen.getByText("Первый тест")).toBeTruthy();
    expect(screen.getByText("Безупречно")).toBeTruthy();
  });
});
