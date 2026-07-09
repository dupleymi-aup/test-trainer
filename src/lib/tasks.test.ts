import { describe, it, expect } from "vitest";

import {
  tasks,
  referenceFunctions,
  getTaskById,
  runReferenceFunction,
} from "./tasks";

describe("tasks", () => {
  describe("getTaskById", () => {
    it("returns task for valid id", () => {
      const task = getTaskById(1);
      expect(task).toMatchObject({ id: 1, name: "Факториал" });
    });

    it("returns undefined for nonexistent id", () => {
      expect(getTaskById(999)).toBeUndefined();
    });

    it("returns all 17 tasks", () => {
      expect(tasks).toHaveLength(17);
    });

    it("each task has required fields", () => {
      for (const task of tasks) {
        expect(task.id).toBeTypeOf("number");
        expect(task.name).toBeTypeOf("string");
        expect(task.description).toBeTypeOf("string");
        expect(task.signature).toBeTypeOf("string");
        expect(task.topics.length).toBeGreaterThan(0);
        expect(task.params.length).toBeGreaterThan(0);
        expect(task.returnType).toBeTypeOf("string");
        expect(task.code).toBeTypeOf("string");
        expect(task.equivalenceClasses.length).toBeGreaterThan(0);
        expect(task.boundaryValues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("runReferenceFunction", () => {
    it("returns error for nonexistent task", () => {
      const result = runReferenceFunction(999, [1]);
      expect(result.error).toBe("Функция не найдена");
      expect(result.result).toBeUndefined();
    });

    it("returns result on success", () => {
      const result = runReferenceFunction(1, [5]);
      expect(result.error).toBeNull();
      expect(result.result).toBe(120);
    });

    it("returns error message on function error", () => {
      const result = runReferenceFunction(1, [-1]);
      expect(result.error).toContain("отрицательных");
      expect(result.result).toBeUndefined();
    });
  });

  describe("referenceFunctions", () => {
    describe("task 1: factorial", () => {
      const fn = referenceFunctions[1];
      it("factorial(0) = 1", () => expect(fn([0])).toBe(1));
      it("factorial(1) = 1", () => expect(fn([1])).toBe(1));
      it("factorial(5) = 120", () => expect(fn([5])).toBe(120));
      it("factorial(20) = 2432902008176640000", () => expect(fn([20])).toBe(2432902008176640000));
      it("throws for negative", () => expect(() => fn([-1])).toThrow());
      it("throws for > 20", () => expect(() => fn([21])).toThrow());
      it("throws for non-integer", () => expect(() => fn([1.5])).toThrow());
    });

    describe("task 2: isPrime", () => {
      const fn = referenceFunctions[2];
      it("isPrime(2) = true", () => expect(fn([2])).toBe(true));
      it("isPrime(3) = true", () => expect(fn([3])).toBe(true));
      it("isPrime(1) = false", () => expect(fn([1])).toBe(false));
      it("isPrime(0) = false", () => expect(fn([0])).toBe(false));
      it("isPrime(4) = false", () => expect(fn([4])).toBe(false));
      it("isPrime(17) = true", () => expect(fn([17])).toBe(true));
      it("isPrime(997) = true", () => expect(fn([997])).toBe(true));
      it("throws for non-integer", () => expect(() => fn([1.5])).toThrow());
    });

    describe("task 3: applyDiscount", () => {
      const fn = referenceFunctions[3];
      it("0% discount", () => expect(fn([100, 0])).toBe(100));
      it("50% discount", () => expect(fn([100, 50])).toBe(50));
      it("100% discount", () => expect(fn([100, 100])).toBe(0));
      it("rounds to 2 decimals", () => expect(fn([100, 33])).toBe(67));
      it("throws for negative price", () => expect(() => fn([-100, 10])).toThrow());
      it("throws for negative discount", () => expect(() => fn([100, -10])).toThrow());
      it("throws for discount > 100", () => expect(() => fn([100, 150])).toThrow());
    });

    describe("task 4: isLeapYear", () => {
      const fn = referenceFunctions[4];
      it("2024 is leap", () => expect(fn([2024])).toBe(true));
      it("2000 is leap (÷400)", () => expect(fn([2000])).toBe(true));
      it("1900 is not leap (÷100, not ÷400)", () => expect(fn([1900])).toBe(false));
      it("2023 is not leap", () => expect(fn([2023])).toBe(false));
      it("throws for year <= 0", () => expect(() => fn([0])).toThrow());
      it("throws for non-integer", () => expect(() => fn([2024.5])).toThrow());
    });

    describe("task 5: triangleType", () => {
      const fn = referenceFunctions[5];
      it("equilateral", () => expect(fn([3, 3, 3])).toBe("равносторонний"));
      it("isosceles", () => expect(fn([2, 2, 3])).toBe("равнобедренный"));
      it("scalene", () => expect(fn([3, 4, 5])).toBe("разносторонний"));
      it("not a triangle", () => expect(fn([1, 1, 3])).toBe("не треугольник"));
      it("degenerate", () => expect(fn([1, 2, 3])).toBe("не треугольник"));
      it("throws for negative", () => expect(() => fn([-1, 2, 3])).toThrow());
    });

    describe("task 6: validatePassword", () => {
      const fn = referenceFunctions[6];
      it("valid password", () => {
        const r = fn(["Abc123!@"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(true);
        expect(r.errors).toHaveLength(0);
      });
      it("too short", () => {
        const r = fn(["Ab1!"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(false);
        expect(r.errors).toContain("Минимум 8 символов");
      });
      it("no uppercase", () => {
        const r = fn(["abcdef12!"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(false);
        expect(r.errors).toContain("Хотя бы одна заглавная буква");
      });
      it("empty string", () => {
        const r = fn([""]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(false);
      });
      it("throws for non-string", () => expect(() => fn([123])).toThrow());
    });

    describe("task 7: isPalindrome", () => {
      const fn = referenceFunctions[7];
      it("racecar is palindrome", () => expect(fn(["racecar"])).toBe(true));
      it("hello is not", () => expect(fn(["hello"])).toBe(false));
      it("empty string is palindrome", () => expect(fn([""])).toBe(true));
      it("single char", () => expect(fn(["a"])).toBe(true));
      it("with spaces (A man a plan a canal Panama)", () =>
        expect(fn(["A man a plan a canal Panama"])).toBe(true));
      it("throws for non-string", () => expect(() => fn([123])).toThrow());
    });

    describe("task 8: validateEmail", () => {
      const fn = referenceFunctions[8];
      it("valid email", () => {
        const r = fn(["user@example.com"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(true);
      });
      it("no @ sign", () => {
        const r = fn(["userexample.com"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(false);
        expect(r.errors.some(e => e.includes("@"))).toBe(true);
      });
      it("multiple @ signs", () => {
        const r = fn(["a@b@c.com"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(false);
      });
      it("empty string", () => {
        const r = fn([""]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(false);
      });
    });

    describe("task 9: toRoman", () => {
      const fn = referenceFunctions[9];
      it("1 = I", () => expect(fn([1])).toBe("I"));
      it("4 = IV", () => expect(fn([4])).toBe("IV"));
      it("9 = IX", () => expect(fn([9])).toBe("IX"));
      it("58 = LVIII", () => expect(fn([58])).toBe("LVIII"));
      it("1994 = MCMXCIV", () => expect(fn([1994])).toBe("MCMXCIV"));
      it("3999 = MMMCMXCIX", () => expect(fn([3999])).toBe("MMMCMXCIX"));
      it("throws for 0", () => expect(() => fn([0])).toThrow());
      it("throws for 4000", () => expect(() => fn([4000])).toThrow());
    });

    describe("task 10: isValidDate", () => {
      const fn = referenceFunctions[10];
      it("valid date", () => expect(fn([15, 6, 2023])).toBe(true));
      it("29 feb in leap year", () => expect(fn([29, 2, 2024])).toBe(true));
      it("29 feb in non-leap year", () => expect(fn([29, 2, 2023])).toBe(false));
      it("month 0", () => expect(fn([1, 0, 2023])).toBe(false));
      it("month 13", () => expect(fn([1, 13, 2023])).toBe(false));
      it("day 0", () => expect(fn([0, 1, 2023])).toBe(false));
    });

    describe("task 11: validatePhone", () => {
      const fn = referenceFunctions[11];
      it("valid +7 phone", () => {
        const r = fn(["+79991234567"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(true);
      });
      it("valid 8 phone", () => {
        const r = fn(["89991234567"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(true);
      });
      it("too short", () => {
        const r = fn(["123456789"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(false);
      });
      it("contains letters", () => {
        const r = fn(["+7abc1234567"]) as { valid: boolean; errors: string[] };
        expect(r.valid).toBe(false);
      });
    });

    describe("task 12: calculateBMI", () => {
      const fn = referenceFunctions[12];
      it("normal BMI", () => {
        const r = fn([70, 175]) as { bmi: number; category: string };
        expect(r.bmi).toBe(22.9);
        expect(r.category).toBe("Норма");
      });
      it("underweight", () => {
        const r = fn([45, 170]) as { bmi: number; category: string };
        expect(r.category).toBe("Недостаточный вес");
      });
      it("obese", () => {
        const r = fn([110, 170]) as { bmi: number; category: string };
        expect(r.category).toBe("Ожирение");
      });
      it("throws for weight < 20", () => expect(() => fn([15, 170])).toThrow());
      it("throws for height < 50", () => expect(() => fn([70, 30])).toThrow());
    });

    describe("task 13: parseNumber", () => {
      const fn = referenceFunctions[13];
      it("decimal", () => expect(fn(["42"])).toBe(42));
      it("hex", () => expect(fn(["0xFF"])).toBe(255));
      it("binary", () => expect(fn(["0b1010"])).toBe(10));
      it("empty returns NaN", () => expect(fn([""])).toBeNaN());
      it("non-numeric returns NaN", () => expect(fn(["abc"])).toBeNaN());
      it("throws for non-string", () => expect(() => fn([42])).toThrow());
    });

    describe("task 14: flattenArray", () => {
      const fn = referenceFunctions[14];
      it("flat array unchanged", () => expect(fn([[1, 2, 3]])).toEqual([1, 2, 3]));
      it("nested array flattened", () => expect(fn([[[1, 2], [3]]])).toEqual([1, 2, 3]));
      it("deeply nested", () => expect(fn([[[[1]]]])).toEqual([1]));
      it("empty array", () => expect(fn([[]])).toEqual([]));
      it("mixed types", () => expect(fn([[1, "a", true]])).toEqual([1, "a", true]));
      it("throws for non-array", () => expect(() => fn(["not array"])).toThrow());
    });

    describe("task 15: fibonacci", () => {
      const fn = referenceFunctions[15];
      it("F(0) = 0", () => expect(fn([0])).toBe(0));
      it("F(1) = 1", () => expect(fn([1])).toBe(1));
      it("F(10) = 55", () => expect(fn([10])).toBe(55));
      it("F(75) = 2111485077978050", () => expect(fn([75])).toBe(2111485077978050));
      it("throws for negative", () => expect(() => fn([-1])).toThrow());
      it("throws for > 75", () => expect(() => fn([76])).toThrow());
      it("throws for non-integer", () => expect(() => fn([3.5])).toThrow());
    });

    describe("task 16: calculateShipping", () => {
      const fn = referenceFunctions[16];
      it("premium >= 1000: free", () => expect(fn([true, 1000, "local"])).toEqual({ shipping: 0, currency: "RUB" }));
      it("premium < 1000 local", () => expect(fn([true, 500, "local"])).toEqual({ shipping: 100, currency: "RUB" }));
      it("premium international", () => expect(fn([true, 500, "international"])).toEqual({ shipping: 200, currency: "RUB" }));
      it("normal >= 2000: free", () => expect(fn([false, 2000, "local"])).toEqual({ shipping: 0, currency: "RUB" }));
      it("normal 500-1999 local", () => expect(fn([false, 500, "local"])).toEqual({ shipping: 100, currency: "RUB" }));
      it("normal < 500 international", () => expect(fn([false, 100, "international"])).toEqual({ shipping: 500, currency: "RUB" }));
      it("throws for invalid region", () => expect(() => fn([false, 500, "moon"])).toThrow());
      it("throws for negative amount", () => expect(() => fn([false, -1, "local"])).toThrow());
    });

    describe("task 17: handleLoginAction", () => {
      const fn = referenceFunctions[17];
      it("first login attempt", () => {
        const r = fn(["login", 0, null]) as { status: string; remainingAttempts: number };
        expect(r.status).toBe("failed");
        expect(r.remainingAttempts).toBe(2);
      });
      it("third attempt locks account", () => {
        const r = fn(["login", 2, null]) as { status: string; remainingAttempts: number };
        expect(r.status).toBe("locked");
        expect(r.remainingAttempts).toBe(0);
      });
      it("success resets", () => {
        const r = fn(["success", 0, null]) as { status: string; remainingAttempts: number };
        expect(r.status).toBe("success");
        expect(r.remainingAttempts).toBe(3);
      });
      it("wait unlocks", () => {
        const r = fn(["wait", 3, 0]) as { status: string; remainingAttempts: number };
        expect(r.status).toBe("unlocked");
        expect(r.remainingAttempts).toBe(3);
      });
      it("throws for invalid action", () => expect(() => fn(["reset", 0, null])).toThrow());
      it("throws for negative attempts", () => expect(() => fn(["login", -1, null])).toThrow());
    });
  });
});
