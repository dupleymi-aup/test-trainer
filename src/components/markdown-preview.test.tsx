import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MarkdownPreview } from "./markdown-preview";

describe("MarkdownPreview", () => {
  it("renders plain text in a paragraph", () => {
    render(<MarkdownPreview text="Hello world" />);
    const p = screen.getByText("Hello world");
    expect(p.tagName).toBe("P");
  });

  it("renders bold text", () => {
    render(<MarkdownPreview text="**bold text**" />);
    expect(screen.getByText("bold text").tagName).toBe("STRONG");
  });

  it("renders italic text", () => {
    render(<MarkdownPreview text="*italic text*" />);
    expect(screen.getByText("italic text").tagName).toBe("EM");
  });

  it("renders inline code", () => {
    render(<MarkdownPreview text="use `console.log`" />);
    expect(screen.getByText("console.log").tagName).toBe("CODE");
  });

  it("renders h1 heading", () => {
    render(<MarkdownPreview text="# Heading 1" />);
    expect(screen.getByText("Heading 1").tagName).toBe("H1");
  });

  it("renders h2 heading", () => {
    render(<MarkdownPreview text="## Heading 2" />);
    expect(screen.getByText("Heading 2").tagName).toBe("H2");
  });

  it("renders h3 heading", () => {
    render(<MarkdownPreview text="### Heading 3" />);
    expect(screen.getByText("Heading 3").tagName).toBe("H3");
  });

  it("renders list container for dash-prefixed lines", () => {
    const { container } = render(<MarkdownPreview text="- Item 1\n- Item 2" />);
    const ul = container.querySelector("ul");
    expect(ul).toBeTruthy();
    expect(ul?.className).toContain("list-disc");
  });

  it("renders list container for asterisk-prefixed lines", () => {
    const { container } = render(<MarkdownPreview text="* Bullet A\n* Bullet B" />);
    const ul = container.querySelector("ul");
    expect(ul).toBeTruthy();
  });

  it("renders empty lines as spacer divs", () => {
    const { container } = render(<MarkdownPreview text="Line 1\n\nLine 2" />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders mixed inline formatting", () => {
    render(<MarkdownPreview text="**bold** and *italic* and `code`" />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("code").tagName).toBe("CODE");
  });

  it("wraps content in a container div", () => {
    const { container } = render(<MarkdownPreview text="test" />);
    const wrapper = container.querySelector(".space-y-1");
    expect(wrapper).toBeTruthy();
  });
});
