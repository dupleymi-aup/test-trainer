import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { getPasswordStrength, PasswordStrengthIndicator } from "./password-strength-indicator";

describe("getPasswordStrength", () => {
  it("returns score 0 for empty password", () => {
    const result = getPasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("");
  });

  it("returns score 1 (weak) for single check", () => {
    const result = getPasswordStrength("short");
    expect(result.score).toBe(1);
    expect(result.label).toBe("Слабый");
  });

  it("returns score 2 (medium) for two checks", () => {
    const result = getPasswordStrength("longer!");
    expect(result.score).toBe(2);
    expect(result.label).toBe("Средний");
  });

  it("returns score 3 (good) for three checks", () => {
    const result = getPasswordStrength("Good1pass");
    expect(result.score).toBe(3);
    expect(result.label).toBe("Хороший");
  });

  it("returns score 3 (good) for four checks", () => {
    const result = getPasswordStrength("Goodpass1");
    expect(result.score).toBe(3);
    expect(result.label).toBe("Хороший");
  });

  it("returns score 4 (strong) for all five checks", () => {
    const result = getPasswordStrength("Str0ng!Pass");
    expect(result.score).toBe(4);
    expect(result.label).toBe("Надёжный");
  });

  it("includes all 5 check results", () => {
    const result = getPasswordStrength("test");
    expect(result.checks).toHaveLength(5);
    expect(result.checks.map((c) => c.label)).toEqual([
      "Минимум 8 символов",
      "Заглавная буква",
      "Строчная буква",
      "Цифра",
      "Спецсимвол",
    ]);
  });

  it("length check passes for 8+ chars", () => {
    expect(getPasswordStrength("12345678").checks[0].passed).toBe(true);
    expect(getPasswordStrength("1234567").checks[0].passed).toBe(false);
  });

  it("uppercase check detects Cyrillic", () => {
    expect(getPasswordStrength("Абвг123!").checks[1].passed).toBe(true);
  });

  it("lowercase check detects Cyrillic", () => {
    expect(getPasswordStrength("АБВГ123!").checks[2].passed).toBe(false);
    expect(getPasswordStrength("Абвг123!").checks[2].passed).toBe(true);
  });
});

describe("PasswordStrengthIndicator", () => {
  it("renders nothing for empty password", () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders strength label for non-empty password", () => {
    render(<PasswordStrengthIndicator password="test" />);
    expect(screen.getByText("Слабый")).toBeTruthy();
  });

  it("renders all check items", () => {
    render(<PasswordStrengthIndicator password="test" />);
    expect(screen.getByText("Минимум 8 символов")).toBeTruthy();
    expect(screen.getByText("Заглавная буква")).toBeTruthy();
    expect(screen.getByText("Строчная буква")).toBeTruthy();
    expect(screen.getByText("Цифра")).toBeTruthy();
    expect(screen.getByText("Спецсимвол")).toBeTruthy();
  });

  it("renders strong label for strong password", () => {
    render(<PasswordStrengthIndicator password="Str0ng!Pass" />);
    expect(screen.getByText("Надёжный")).toBeTruthy();
  });
});
