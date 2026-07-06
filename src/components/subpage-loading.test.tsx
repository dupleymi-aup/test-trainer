import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SubpageLoading } from "./subpage-loading";

describe("SubpageLoading", () => {
  it("renders loading spinner with page name", () => {
    render(<SubpageLoading pageName="Dashboard" />);
    expect(screen.getByText("Загрузка: Dashboard...")).toBeTruthy();
  });

  it("renders with different page name", () => {
    render(<SubpageLoading pageName="Analytics" />);
    expect(screen.getByText("Загрузка: Analytics...")).toBeTruthy();
  });

  it("has min-height container", () => {
    const { container } = render(<SubpageLoading pageName="Test" />);
    const wrapper = container.querySelector(".min-h-\\[400px\\]");
    expect(wrapper).toBeTruthy();
  });
});
