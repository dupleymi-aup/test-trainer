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
