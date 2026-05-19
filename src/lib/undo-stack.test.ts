import { describe, it, expect } from "vitest";
import { UndoStack } from "./undo-stack";

describe("UndoStack", () => {
  describe("initial state", () => {
    it("starts empty", () => {
      const stack = new UndoStack<string>();
      expect(stack.current).toBeNull();
      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(false);
      expect(stack.size).toBe(0);
    });
  });

  describe("push", () => {
    it("adds a single item", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      expect(stack.current).toBe("a");
      expect(stack.size).toBe(1);
    });

    it("adds multiple items", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      stack.push("c");
      expect(stack.current).toBe("c");
      expect(stack.size).toBe(3);
    });

    it("clears redo history on new push", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      stack.push("c");
      stack.undo(); // back to "b"
      expect(stack.current).toBe("b");
      expect(stack.canRedo).toBe(true);
      stack.push("d"); // should remove "c" from future
      expect(stack.current).toBe("d");
      expect(stack.canRedo).toBe(false);
      expect(stack.size).toBe(3); // a, b, d
    });

    it("respects maxSize limit", () => {
      const stack = new UndoStack<number>(3);
      stack.push(1);
      stack.push(2);
      stack.push(3);
      stack.push(4); // should evict 1
      expect(stack.size).toBe(3);
      expect(stack.current).toBe(4);
      // Can only undo twice since oldest was evicted
      stack.undo();
      expect(stack.current).toBe(3);
      stack.undo();
      expect(stack.current).toBe(2);
      expect(stack.canUndo).toBe(false);
    });

    it("handles maxSize of 1", () => {
      const stack = new UndoStack<string>(1);
      stack.push("a");
      stack.push("b");
      expect(stack.size).toBe(1);
      expect(stack.current).toBe("b");
      expect(stack.canUndo).toBe(false);
    });
  });

  describe("undo", () => {
    it("returns previous state", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      const result = stack.undo();
      expect(result).toBe("a");
      expect(stack.current).toBe("a");
    });

    it("returns null when at beginning", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      expect(stack.undo()).toBeNull();
    });

    it("returns null when empty", () => {
      const stack = new UndoStack<string>();
      expect(stack.undo()).toBeNull();
    });

    it("can undo multiple times", () => {
      const stack = new UndoStack<number>();
      for (let i = 0; i < 5; i++) stack.push(i);
      expect(stack.undo()).toBe(3);
      expect(stack.undo()).toBe(2);
      expect(stack.undo()).toBe(1);
      expect(stack.undo()).toBe(0);
      expect(stack.undo()).toBeNull();
    });
  });

  describe("redo", () => {
    it("returns next state after undo", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      stack.push("c");
      stack.undo();
      const result = stack.redo();
      expect(result).toBe("c");
      expect(stack.current).toBe("c");
    });

    it("returns null when at latest state", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      expect(stack.redo()).toBeNull();
    });

    it("returns null when no undo was performed", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      stack.push("c");
      expect(stack.redo()).toBeNull();
    });

    it("can redo multiple times", () => {
      const stack = new UndoStack<number>();
      for (let i = 0; i < 4; i++) stack.push(i);
      stack.undo();
      stack.undo();
      stack.undo();
      expect(stack.redo()).toBe(1);
      expect(stack.redo()).toBe(2);
      expect(stack.redo()).toBe(3);
      expect(stack.redo()).toBeNull();
    });

    it("clears redo after new push", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      stack.push("c");
      stack.undo();
      stack.push("d");
      expect(stack.redo()).toBeNull();
    });
  });

  describe("canUndo / canRedo", () => {
    it("canUndo is false when empty or at first item", () => {
      const stack = new UndoStack<string>();
      expect(stack.canUndo).toBe(false);
      stack.push("a");
      expect(stack.canUndo).toBe(false);
    });

    it("canUndo is true after second push", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      expect(stack.canUndo).toBe(true);
    });

    it("canRedo is false without undo", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      expect(stack.canRedo).toBe(false);
    });

    it("canRedo is true after undo", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      stack.undo();
      expect(stack.canRedo).toBe(true);
    });

    it("canRedo becomes false after redo to end", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      stack.undo();
      stack.redo();
      expect(stack.canRedo).toBe(false);
    });
  });

  describe("clear", () => {
    it("resets the stack completely", () => {
      const stack = new UndoStack<string>();
      stack.push("a");
      stack.push("b");
      stack.undo();
      stack.clear();
      expect(stack.current).toBeNull();
      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(false);
      expect(stack.size).toBe(0);
    });

    it("allows new pushes after clear", () => {
      const stack = new UndoStack<number>();
      stack.push(1);
      stack.push(2);
      stack.clear();
      stack.push(3);
      expect(stack.current).toBe(3);
      expect(stack.size).toBe(1);
    });
  });

  describe("with complex data types", () => {
    it("works with objects", () => {
      const stack = new UndoStack<{ x: number; y: number }>();
      stack.push({ x: 0, y: 0 });
      stack.push({ x: 1, y: 2 });
      stack.push({ x: 3, y: 5 });
      expect(stack.current).toEqual({ x: 3, y: 5 });
      stack.undo();
      expect(stack.current).toEqual({ x: 1, y: 2 });
    });

    it("works with arrays", () => {
      const stack = new UndoStack<number[]>();
      stack.push([1, 2]);
      stack.push([1, 2, 3]);
      stack.undo();
      expect(stack.current).toEqual([1, 2]);
    });
  });
});
