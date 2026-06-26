import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { LoadingButton } from "./loading-button";

describe("LoadingButton", () => {
  it("renders children when not loading", () => {
    render(<LoadingButton>Click me</LoadingButton>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders loading text when loading", () => {
    render(
      <LoadingButton isLoading loadingText="Saving...">
        Click me
      </LoadingButton>
    );
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("renders children as loading text when no loadingText", () => {
    render(<LoadingButton isLoading>Click me</LoadingButton>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("is disabled when loading", () => {
    render(<LoadingButton isLoading>Click me</LoadingButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<LoadingButton disabled>Click me</LoadingButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows spinner when loading", () => {
    const { container } = render(<LoadingButton isLoading>Click me</LoadingButton>);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("does not show spinner when not loading", () => {
    const { container } = render(<LoadingButton>Click me</LoadingButton>);
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
  });
});
