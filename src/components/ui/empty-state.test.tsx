import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        title="No items"
        description="Try adding some items"
      />
    );
    expect(screen.getByText("Try adding some items")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: "Add item", onClick }}
      />
    );
    expect(screen.getByText("Add item")).toBeInTheDocument();
  });

  it("calls action onClick when button is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: "Add item", onClick }}
      />
    );

    await user.click(screen.getByText("Add item"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not render action button when not provided", () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState title="No items" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
