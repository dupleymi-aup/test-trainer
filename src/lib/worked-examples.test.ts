import { describe, it, expect } from "vitest";
import { workedExamples } from "./worked-examples";

describe("workedExamples", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(workedExamples)).toBe(true);
    expect(workedExamples.length).toBeGreaterThan(0);
  });

  it("each example has required fields", () => {
    for (const example of workedExamples) {
      expect(example).toHaveProperty("taskId");
      expect(example).toHaveProperty("taskName");
      expect(example).toHaveProperty("introduction");
      expect(example).toHaveProperty("steps");
      expect(example).toHaveProperty("keyTakeaways");
      expect(typeof example.taskId).toBe("number");
      expect(typeof example.taskName).toBe("string");
      expect(typeof example.introduction).toBe("string");
      expect(Array.isArray(example.steps)).toBe(true);
      expect(Array.isArray(example.keyTakeaways)).toBe(true);
    }
  });

  it("each step has required fields", () => {
    for (const example of workedExamples) {
      for (const step of example.steps) {
        expect(step).toHaveProperty("stepNumber");
        expect(step).toHaveProperty("title");
        expect(step).toHaveProperty("action");
        expect(step).toHaveProperty("reasoning");
        expect(typeof step.stepNumber).toBe("number");
        expect(typeof step.title).toBe("string");
        expect(typeof step.action).toBe("string");
        expect(typeof step.reasoning).toBe("string");
      }
    }
  });

  it("step numbers are sequential starting from 1", () => {
    for (const example of workedExamples) {
      const numbers = example.steps.map((s) => s.stepNumber);
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, numbers.length));
    }
  });

  it("each example has at least one key takeaway", () => {
    for (const example of workedExamples) {
      expect(example.keyTakeaways.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("example with optional example field has correct shape", () => {
    for (const example of workedExamples) {
      for (const step of example.steps) {
        if (step.example) {
          expect(step.example).toHaveProperty("input");
          expect(step.example).toHaveProperty("expectedOutput");
          expect(step.example).toHaveProperty("category");
          expect(typeof step.example.input).toBe("string");
          expect(typeof step.example.expectedOutput).toBe("string");
          expect(typeof step.example.category).toBe("string");
        }
      }
    }
  });

  it("contains factorial example (taskId 1)", () => {
    const factorial = workedExamples.find((e) => e.taskId === 1);
    expect(factorial).toBeDefined();
    expect(factorial?.taskName).toContain("Факториал");
    expect(factorial?.steps.length).toBeGreaterThanOrEqual(7);
  });

  it("contains prime example (taskId 2)", () => {
    const prime = workedExamples.find((e) => e.taskId === 2);
    expect(prime).toBeDefined();
    expect(prime?.taskName).toContain("Простое число");
  });

  it("contains leap year example (taskId 4)", () => {
    const leapYear = workedExamples.find((e) => e.taskId === 4);
    expect(leapYear).toBeDefined();
    expect(leapYear?.taskName).toContain("Високосный год");
  });

  it("contains triangle example (taskId 5)", () => {
    const triangle = workedExamples.find((e) => e.taskId === 5);
    expect(triangle).toBeDefined();
    expect(triangle?.taskName).toContain("Треугольник");
  });

  it("all taskIds are unique", () => {
    const ids = workedExamples.map((e) => e.taskId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
