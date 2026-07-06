import * as React from "react";
import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { Confetti } from "./confetti";

describe("Confetti", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when active is false", () => {
    const { container } = render(<Confetti active={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders particles when active is true", () => {
    vi.useFakeTimers();
    const { container } = render(<Confetti active={true} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const particles = container.querySelectorAll(".absolute");
    expect(particles.length).toBe(50);
    vi.useRealTimers();
  });

  it("clears particles after timeout", () => {
    vi.useFakeTimers();
    const { container } = render(<Confetti active={true} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(container.querySelectorAll(".absolute").length).toBe(50);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(container.querySelectorAll(".absolute").length).toBe(0);
    vi.useRealTimers();
  });

  it("has fixed overlay container", () => {
    vi.useFakeTimers();
    const { container } = render(<Confetti active={true} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const overlay = container.querySelector(".fixed");
    expect(overlay).toBeTruthy();
    expect(overlay?.className).toContain("pointer-events-none");
    expect(overlay?.className).toContain("z-[100]");
    vi.useRealTimers();
  });
});
