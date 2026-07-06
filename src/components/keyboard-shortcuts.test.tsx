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
    expect(screen.getByText("Check test cases")).toBeTruthy();
    expect(screen.getByText("Undo")).toBeTruthy();
    expect(screen.getByText("Redo")).toBeTruthy();
    expect(screen.getByText("Hint (random uncovered EC)")).toBeTruthy();
    expect(screen.getByText("Fill all uncovered ECs")).toBeTruthy();
    expect(screen.getByText("Fill all uncovered BVs")).toBeTruthy();
    expect(screen.getByText("Random task")).toBeTruthy();
    expect(screen.getByText("Show keyboard shortcuts")).toBeTruthy();
    expect(screen.getByText("Quick task selection")).toBeTruthy();
    expect(screen.getByText("Close dialog")).toBeTruthy();
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
