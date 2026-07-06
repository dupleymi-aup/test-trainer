import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { LoadingSpinner, LoadingSkeleton, PageLoadingSkeleton } from "./loading";

describe("LoadingSpinner", () => {
  it("renders with default size", () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders with custom size", () => {
    render(<LoadingSpinner size="lg" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders with text", () => {
    render(<LoadingSpinner text="Loading..." />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

describe("LoadingSkeleton", () => {
  it("renders with default lines", () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.querySelectorAll(".rounded.bg-muted")).toHaveLength(3);
  });

  it("renders with custom lines count", () => {
    const { container } = render(<LoadingSkeleton lines={5} />);
    expect(container.querySelectorAll(".rounded.bg-muted")).toHaveLength(5);
  });

  it("has aria-label", () => {
    render(<LoadingSkeleton />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading...");
  });
});

describe("PageLoadingSkeleton", () => {
  it("renders full page skeleton", () => {
    render(<PageLoadingSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders with custom text", () => {
    render(<PageLoadingSkeleton text="Loading page..." />);
    expect(screen.getByRole("status", { name: "Loading page..." })).toBeInTheDocument();
  });
});
