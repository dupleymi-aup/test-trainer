import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubpageError, AdminSubpageError } from "./subpage-error";
import { StudentSubpageError } from "./student-subpage-error";
import { TeacherSubpageError } from "./teacher-subpage-error";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe("SubpageError", () => {
  const mockReset = vi.fn();
  const error = new Error("Test error message");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page name in heading", () => {
    render(<SubpageError error={error} reset={mockReset} pageName="Dashboard" role="student" />);
    expect(screen.getByText("Ошибка загрузки: Dashboard")).toBeTruthy();
  });

  it("renders retry button", () => {
    render(<SubpageError error={error} reset={mockReset} pageName="Test" role="student" />);
    expect(screen.getByText("Попробовать снова")).toBeTruthy();
  });

  it("renders reload button", () => {
    render(<SubpageError error={error} reset={mockReset} pageName="Test" role="student" />);
    expect(screen.getByText("Обновить страницу")).toBeTruthy();
  });

  it("calls reset when retry button is clicked", () => {
    render(<SubpageError error={error} reset={mockReset} pageName="Test" role="student" />);
    fireEvent.click(screen.getByText("Попробовать снова"));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("shows error message in development mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    render(<SubpageError error={error} reset={mockReset} pageName="Test" role="student" />);
    expect(screen.getByText("Test error message")).toBeTruthy();
    process.env.NODE_ENV = originalEnv;
  });

  it("shows digest when available", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const errorWithDigest = Object.assign(new Error("Error"), { digest: "abc123" });
    render(<SubpageError error={errorWithDigest} reset={mockReset} pageName="Test" role="student" />);
    expect(screen.getByText(/Digest: abc123/)).toBeTruthy();
    process.env.NODE_ENV = originalEnv;
  });

  it("logs error on mount", async () => {
    const { logger } = await import("@/lib/logger");
    render(<SubpageError error={error} reset={mockReset} pageName="Dashboard" role="teacher" />);
    expect(logger.error).toHaveBeenCalledWith(
      "[TeacherError:Dashboard]",
      { error: "Test error message" }
    );
  });
});

describe("AdminSubpageError", () => {
  it("renders with admin role", async () => {
    const { logger } = await import("@/lib/logger");
    const error = new Error("Admin error");
    render(<AdminSubpageError error={error} reset={vi.fn()} pageName="Settings" />);
    expect(screen.getByText("Ошибка загрузки: Settings")).toBeTruthy();
    expect(logger.error).toHaveBeenCalledWith(
      "[AdminError:Settings]",
      { error: "Admin error" }
    );
  });
});

describe("StudentSubpageError", () => {
  it("renders with student role", async () => {
    const { logger } = await import("@/lib/logger");
    const error = new Error("Student error");
    render(<StudentSubpageError error={error} reset={vi.fn()} pageName="Profile" />);
    expect(screen.getByText("Ошибка загрузки: Profile")).toBeTruthy();
    expect(logger.error).toHaveBeenCalledWith(
      "[StudentError:Profile]",
      { error: "Student error" }
    );
  });
});

describe("TeacherSubpageError", () => {
  it("renders with teacher role", async () => {
    const { logger } = await import("@/lib/logger");
    const error = new Error("Teacher error");
    render(<TeacherSubpageError error={error} reset={vi.fn()} pageName="Gradebook" />);
    expect(screen.getByText("Ошибка загрузки: Gradebook")).toBeTruthy();
    expect(logger.error).toHaveBeenCalledWith(
      "[TeacherError:Gradebook]",
      { error: "Teacher error" }
    );
  });
});
