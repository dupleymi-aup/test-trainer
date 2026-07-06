import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts";

describe("KeyboardShortcutsDialog", () => {
  it("renders dialog when open", () => {
    render(<KeyboardShortcutsDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("renders all shortcut descriptions", () => {
    render(<KeyboardShortcutsDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Проверить тест-кейсы")).toBeTruthy();
    expect(screen.getByText("Отменить (undo)")).toBeTruthy();
    expect(screen.getByText("Вернуть (redo)")).toBeTruthy();
    expect(screen.getByText("Подсказка (случайный непокрытый EC)")).toBeTruthy();
    expect(screen.getByText("Заполнить все непокрытые EC")).toBeTruthy();
    expect(screen.getByText("Заполнить все непокрытые BV")).toBeTruthy();
    expect(screen.getByText("Случайное задание")).toBeTruthy();
    expect(screen.getByText("Показать горячие клавиши")).toBeTruthy();
    expect(screen.getByText("Быстрый выбор задания")).toBeTruthy();
    expect(screen.getByText("Закрыть диалог")).toBeTruthy();
  });

  it("renders kbd elements for keyboard shortcuts", () => {
    render(<KeyboardShortcutsDialog open={true} onOpenChange={vi.fn()} />);
    const kbds = screen.getAllByText("Ctrl");
    expect(kbds.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Enter")).toBeTruthy();
    expect(screen.getByText("Shift")).toBeTruthy();
  });

  it("calls onOpenChange when close button is clicked", () => {
    const onOpenChange = vi.fn();
    render(<KeyboardShortcutsDialog open={true} onOpenChange={onOpenChange} />);
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
