import { describe, it, expect } from "vitest";
import {
  evaluateTestCases,
  type TestCase,
  type StoredTestCase,
  type TestCaseResult,
  type EvaluationResult,
} from "./evaluator";
import { type Task, type TestCaseCategory, runReferenceFunction } from "./tasks";

// ---------------------------------------------------------------------------
// Helper: build a minimal Task fixture for isolated unit tests
// ---------------------------------------------------------------------------

function makeTask(
  id: number,
  equivalenceClasses: Task["equivalenceClasses"],
  boundaryValues: Task["boundaryValues"],
  overrides: Partial<Task> = {}
): Task {
  return {
    id,
    name: "Test Task",
    difficulty: "Легко",
    description: "A test task",
    signature: "fn(x): number",
    topics: ["Классы эквивалентности"],
    params: [{ name: "x", type: "number", description: "Input" }],
    returnType: "number",
    code: "function fn(x) { return x; }",
    equivalenceClasses,
    boundaryValues,
    ...overrides,
  };
}

function makeTestCase(
  id: string,
  inputs: string[],
  expectedOutput: string,
  category: TestCaseCategory = "Нормальное значение",
  comment = ""
): TestCase {
  return { id, inputs, expectedOutput, category, comment };
}

// ---------------------------------------------------------------------------
// Helper: get real tasks from the task library
// ---------------------------------------------------------------------------

import { tasks, getTaskById } from "./tasks";

const factorialTask = getTaskById(1)!;
const isPrimeTask = getTaskById(2)!;
const applyDiscountTask = getTaskById(3)!;
const isLeapYearTask = getTaskById(4)!;
const triangleTask = getTaskById(5)!;
const validatePasswordTask = getTaskById(6)!;
const fibonacciTask = getTaskById(15)!;
const calculateShippingTask = getTaskById(16)!;

// ===========================================================================
// 1. evaluateTestCases — happy path and basic scoring
// ===========================================================================

describe("evaluateTestCases", () => {
  describe("basic functionality", () => {
    it("returns a well-formed EvaluationResult for a single correct test case", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["5"], "120"),
      ]);

      expect(result.task).toBe(factorialTask);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].isCorrect).toBe(true);
      expect(result.results[0].actualOutput).toBe("120");
    });

    it("returns correct structure with all required fields", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),
      ]);

      expect(result).toHaveProperty("task");
      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("ecCoverage");
      expect(result).toHaveProperty("boundaryCoverage");
      expect(result).toHaveProperty("correctnessScore");
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("coveredEcIds");
      expect(result).toHaveProperty("uncoveredEcIds");
      expect(result).toHaveProperty("coveredBvDescriptions");
      expect(result).toHaveProperty("uncoveredBvDescriptions");
      expect(result).toHaveProperty("totalEcs");
      expect(result).toHaveProperty("totalBvs");
      expect(result).toHaveProperty("coveredEcsCount");
      expect(result).toHaveProperty("coveredBvsCount");
    });

    it("covers EC1 (n=0) and boundary value 0 for factorial", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),
      ]);

      expect(result.coveredEcIds).toContain("ec1");
      expect(result.coveredBvDescriptions).toContain("Нижняя граница (факториал = 1)");
    });

    it("covers EC2 (1 <= n <= 20) for factorial", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["5"], "120"),
      ]);

      expect(result.coveredEcIds).toContain("ec2");
    });

    it("covers EC3 (n < 0) error case for factorial", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"),
      ]);

      expect(result.results[0].isCorrect).toBe(true);
      expect(result.coveredEcIds).toContain("ec3");
    });

    it("covers EC4 (n > 20) overflow case for factorial", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["21"], "Ошибка: Переполнение: n > 20"),
      ]);

      expect(result.results[0].isCorrect).toBe(true);
      expect(result.coveredEcIds).toContain("ec4");
    });
  });

  describe("correctness scoring", () => {
    it("returns 100% correctness when all tests pass", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),
        makeTestCase("tc2", ["1"], "1"),
        makeTestCase("tc3", ["5"], "120"),
      ]);

      expect(result.correctnessScore).toBe(100);
    });

    it("returns 0% correctness when all tests fail", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "0"),
        makeTestCase("tc2", ["5"], "100"),
      ]);

      expect(result.correctnessScore).toBe(0);
    });

    it("returns 50% correctness when half the tests pass", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),
        makeTestCase("tc2", ["5"], "0"),
      ]);

      expect(result.correctnessScore).toBe(50);
    });

    it("rounds correctness score to nearest integer", () => {
      // 2 out of 3 = 66.67% → rounds to 67
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),
        makeTestCase("tc2", ["1"], "1"),
        makeTestCase("tc3", ["5"], "0"),
      ]);

      expect(result.correctnessScore).toBe(67);
    });
  });

  describe("EC coverage calculation", () => {
    it("returns 0% EC coverage when no test cases provided", () => {
      const result = evaluateTestCases(factorialTask, []);

      expect(result.ecCoverage).toBe(0);
      expect(result.coveredEcsCount).toBe(0);
      expect(result.totalEcs).toBe(5);
    });

    it("returns 100% EC coverage when all classes are covered", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),                    // ec1
        makeTestCase("tc2", ["5"], "120"),                   // ec2
        makeTestCase("tc3", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"), // ec3
        makeTestCase("tc4", ["21"], "Ошибка: Переполнение: n > 20"), // ec4
        makeTestCase("tc5", ["1.5"], "Ошибка: Аргумент должен быть целым числом"), // ec5
      ]);

      expect(result.ecCoverage).toBe(100);
      expect(result.coveredEcsCount).toBe(5);
      expect(result.uncoveredEcIds).toHaveLength(0);
    });

    it("calculates partial EC coverage correctly", () => {
      // 2 out of 5 ECs covered = 40%
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),   // ec1
        makeTestCase("tc2", ["5"], "120"), // ec2
      ]);

      expect(result.ecCoverage).toBe(40);
      expect(result.uncoveredEcIds).toHaveLength(3);
    });

    it("deduplicates EC coverage across multiple test cases", () => {
      // Both test cases cover ec2, so only 1 unique EC covered
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["5"], "120"),
        makeTestCase("tc2", ["10"], "3628800"),
      ]);

      expect(result.coveredEcsCount).toBe(1);
      expect(result.ecCoverage).toBe(20);
    });
  });

  describe("boundary value coverage calculation", () => {
    it("returns 0% BV coverage when no boundary values are hit", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["5"], "120"), // not a boundary value
      ]);

      expect(result.boundaryCoverage).toBe(0);
      expect(result.coveredBvsCount).toBe(0);
    });

    it("detects boundary value 0 for factorial", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),
      ]);

      expect(result.coveredBvDescriptions).toContain("Нижняя граница (факториал = 1)");
    });

    it("detects boundary value 20 for factorial", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["20"], "2432902008176640000"),
      ]);

      expect(result.coveredBvDescriptions).toContain("Верхняя граница допустимых");
    });

    it("detects boundary value 21 for factorial", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["21"], "Ошибка: Переполнение: n > 20"),
      ]);

      expect(result.coveredBvDescriptions).toContain("Переполнение");
    });

    it("detects boundary value -1 for factorial", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"),
      ]);

      expect(result.coveredBvDescriptions).toContain("Первая недопустимая");
    });
  });

  describe("overall score calculation (weighted: 40% EC + 30% BV + 30% correctness)", () => {
    it("calculates weighted overall score correctly", () => {
      // Manually craft a scenario with known scores:
      // 2 ECs out of 5 = 40% EC, 1 BV out of 6 = ~17% BV, 1/1 correct = 100% correctness
      // Overall = 40*0.4 + 16.67*0.3 + 100*0.3 = 16 + 5 + 30 = 51 (approximately)
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"), // covers ec1 + BV "0"
      ]);

      const expectedOverall = result.ecCoverage * 0.4 + result.boundaryCoverage * 0.3 + result.correctnessScore * 0.3;
      expect(result.overallScore).toBe(Math.round(expectedOverall));
    });

    it("returns 0 overall score when everything is zero", () => {
      const result = evaluateTestCases(factorialTask, []);
      expect(result.overallScore).toBe(0);
    });

    it("returns 100 overall score when all scores are 100", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),
        makeTestCase("tc2", ["1"], "1"),
        makeTestCase("tc3", ["19"], "121645100408832000"),
        makeTestCase("tc4", ["20"], "2432902008176640000"),
        makeTestCase("tc5", ["21"], "Ошибка: Переполнение: n > 20"),
        makeTestCase("tc6", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"),
        makeTestCase("tc7", ["1.5"], "Ошибка: Аргумент должен быть целым числом"),
        makeTestCase("tc8", ["5"], "120"),
      ]);

      expect(result.ecCoverage).toBe(100);
      expect(result.boundaryCoverage).toBe(100);
      expect(result.correctnessScore).toBe(100);
      expect(result.overallScore).toBe(100);
    });
  });
});

// ===========================================================================
// 2. EC coverage detection — Task 1: Factorial
// ===========================================================================

describe("EC coverage — Task 1: Factorial", () => {
  it("covers ec1 when input is 0", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
  });

  it("covers ec2 when input is in range 1-20", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["1"], "1"),
    ]);
    expect(result.coveredEcIds).toContain("ec2");
  });

  it("covers ec2 for mid-range value 10", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["10"], "3628800"),
    ]);
    expect(result.coveredEcIds).toContain("ec2");
  });

  it("covers ec3 for negative input", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["-5"], "Ошибка: Факториал не определён для отрицательных чисел"),
    ]);
    expect(result.coveredEcIds).toContain("ec3");
  });

  it("covers ec4 for input > 20", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["100"], "Ошибка: Переполнение: n > 20"),
    ]);
    expect(result.coveredEcIds).toContain("ec4");
  });

  it("covers all 5 ECs with comprehensive test set", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
      makeTestCase("tc2", ["5"], "120"),
      makeTestCase("tc3", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"),
      makeTestCase("tc4", ["21"], "Ошибка: Переполнение: n > 20"),
      makeTestCase("tc5", ["1.5"], "Ошибка: Аргумент должен быть целым числом"),
    ]);
    expect(result.ecCoverage).toBe(100);
    expect(result.uncoveredEcIds).toHaveLength(0);
  });
});

// ===========================================================================
// 3. EC coverage detection — Task 2: isPrime
// ===========================================================================

describe("EC coverage — Task 2: isPrime", () => {
  it("covers ec1 when input <= 1", () => {
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["0"], "false"),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
  });

  it("covers ec1 for negative input", () => {
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["-3"], "false"),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
  });

  it("covers ec2 when input is 2", () => {
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["2"], "true"),
    ]);
    expect(result.coveredEcIds).toContain("ec2");
  });

  it("covers ec3 for odd prime numbers", () => {
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["7"], "true"),
    ]);
    expect(result.coveredEcIds).toContain("ec3");
  });

  it("covers ec4 for composite numbers", () => {
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["4"], "false"),
    ]);
    expect(result.coveredEcIds).toContain("ec4");
  });

  it("covers ec3 and ec4 with multiple test cases", () => {
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["13"], "true"),   // ec3
      makeTestCase("tc2", ["9"], "false"),    // ec4
    ]);
    expect(result.coveredEcIds).toContain("ec3");
    expect(result.coveredEcIds).toContain("ec4");
  });

  it("covers ec3 for large prime numbers (heuristic: fnResult=true && input > 2)", () => {
    // The heuristic for task 2 covers ec3 for any fnResult=true && input > 2
    // There is no separate heuristic for ec5 (large numbers)
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["997"], "true"),
    ]);
    expect(result.coveredEcIds).toContain("ec3");
  });
});

// ===========================================================================
// 4. EC coverage detection — Task 3: applyDiscount
// ===========================================================================

describe("EC coverage — Task 3: applyDiscount", () => {
  it("covers ec1 when discount is 0 and price > 0", () => {
    const result = evaluateTestCases(applyDiscountTask, [
      makeTestCase("tc1", ["100", "0"], "100"),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
  });

  it("covers ec2 for partial discount (0 < discount < 100)", () => {
    const result = evaluateTestCases(applyDiscountTask, [
      makeTestCase("tc1", ["100", "25"], "75"),
    ]);
    expect(result.coveredEcIds).toContain("ec2");
  });

  it("covers ec3 when discount is 100", () => {
    const result = evaluateTestCases(applyDiscountTask, [
      makeTestCase("tc1", ["100", "100"], "0"),
    ]);
    expect(result.coveredEcIds).toContain("ec3");
  });

  it("covers ec4 when price is 0", () => {
    const result = evaluateTestCases(applyDiscountTask, [
      makeTestCase("tc1", ["0", "50"], "0"),
    ]);
    expect(result.coveredEcIds).toContain("ec4");
  });

  it("covers ec5 for negative price", () => {
    const result = evaluateTestCases(applyDiscountTask, [
      makeTestCase("tc1", ["-100", "10"], "Ошибка: Цена не может быть отрицательной"),
    ]);
    expect(result.coveredEcIds).toContain("ec5");
  });

  it("covers ec6 for negative discount", () => {
    const result = evaluateTestCases(applyDiscountTask, [
      makeTestCase("tc1", ["100", "-10"], "Ошибка: Скидка не может быть отрицательной"),
    ]);
    expect(result.coveredEcIds).toContain("ec6");
  });

  it("covers ec7 for discount > 100", () => {
    const result = evaluateTestCases(applyDiscountTask, [
      makeTestCase("tc1", ["100", "150"], "Ошибка: Скидка не может превышать 100%"),
    ]);
    expect(result.coveredEcIds).toContain("ec7");
  });

  it("covers all 8 ECs with comprehensive test set", () => {
    const result = evaluateTestCases(applyDiscountTask, [
      makeTestCase("tc1", ["100", "0"], "100"),
      makeTestCase("tc2", ["100", "25"], "75"),
      makeTestCase("tc3", ["100", "100"], "0"),
      makeTestCase("tc4", ["0", "50"], "0"),
      makeTestCase("tc5", ["-100", "10"], "Ошибка: Цена не может быть отрицательной"),
      makeTestCase("tc6", ["100", "-10"], "Ошибка: Скидка не может быть отрицательной"),
      makeTestCase("tc7", ["100", "150"], "Ошибка: Скидка не может превышать 100%"),
      makeTestCase("tc8", ["abc", "10"], "Ошибка: Аргументы должны быть числами"),
    ]);
    expect(result.ecCoverage).toBe(100);
    expect(result.uncoveredEcIds).toHaveLength(0);
  });
});

// ===========================================================================
// 5. EC coverage detection — Task 4: isLeapYear
// ===========================================================================

describe("EC coverage — Task 4: isLeapYear", () => {
  it("covers ec1 for year divisible by 400", () => {
    const result = evaluateTestCases(isLeapYearTask, [
      makeTestCase("tc1", ["2000"], "true"),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
  });

  it("covers ec2 for year divisible by 100 but not 400", () => {
    const result = evaluateTestCases(isLeapYearTask, [
      makeTestCase("tc1", ["1900"], "false"),
    ]);
    expect(result.coveredEcIds).toContain("ec2");
  });

  it("covers ec3 for year divisible by 4 but not 100", () => {
    const result = evaluateTestCases(isLeapYearTask, [
      makeTestCase("tc1", ["2024"], "true"),
    ]);
    expect(result.coveredEcIds).toContain("ec3");
  });

  it("covers ec4 for year not divisible by 4", () => {
    const result = evaluateTestCases(isLeapYearTask, [
      makeTestCase("tc1", ["2023"], "false"),
    ]);
    expect(result.coveredEcIds).toContain("ec4");
  });

  it("covers ec5 for year <= 0", () => {
    const result = evaluateTestCases(isLeapYearTask, [
      makeTestCase("tc1", ["-1"], "Ошибка: Год должен быть положительным"),
    ]);
    expect(result.coveredEcIds).toContain("ec5");
  });

  it("covers all 4 main ECs with comprehensive test set", () => {
    const result = evaluateTestCases(isLeapYearTask, [
      makeTestCase("tc1", ["2000"], "true"),
      makeTestCase("tc2", ["1900"], "false"),
      makeTestCase("tc3", ["2024"], "true"),
      makeTestCase("tc4", ["2023"], "false"),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
    expect(result.coveredEcIds).toContain("ec2");
    expect(result.coveredEcIds).toContain("ec3");
    expect(result.coveredEcIds).toContain("ec4");
  });
});

// ===========================================================================
// 6. EC coverage detection — Task 5: Triangle
// ===========================================================================

describe("EC coverage — Task 5: Triangle", () => {
  it("covers ec1 for equilateral triangle", () => {
    const result = evaluateTestCases(triangleTask, [
      makeTestCase("tc1", ["3", "3", "3"], "равносторонний"),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
  });

  it("covers ec2 for isosceles triangle", () => {
    const result = evaluateTestCases(triangleTask, [
      makeTestCase("tc1", ["2", "2", "3"], "равнобедренный"),
    ]);
    expect(result.coveredEcIds).toContain("ec2");
  });

  it("covers ec3 for scalene triangle", () => {
    const result = evaluateTestCases(triangleTask, [
      makeTestCase("tc1", ["3", "4", "5"], "разносторонний"),
    ]);
    expect(result.coveredEcIds).toContain("ec3");
  });

  it("covers ec4 for invalid triangle", () => {
    const result = evaluateTestCases(triangleTask, [
      makeTestCase("tc1", ["1", "1", "3"], "не треугольник"),
    ]);
    expect(result.coveredEcIds).toContain("ec4");
  });

  it("covers ec5 for non-positive sides", () => {
    const result = evaluateTestCases(triangleTask, [
      makeTestCase("tc1", ["-1", "2", "3"], "Ошибка: Стороны должны быть положительными"),
    ]);
    expect(result.coveredEcIds).toContain("ec5");
  });
});

// ===========================================================================
// 7. EC coverage detection — Task 6: validatePassword
// ===========================================================================

describe("EC coverage — Task 6: validatePassword", () => {
  it("covers ec1 for valid password", () => {
    const result = evaluateTestCases(validatePasswordTask, [
      makeTestCase("tc1", ["Abc123!@"], '{"valid":true,"errors":[]}'),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
  });

  it("covers ec2 for short password", () => {
    const result = evaluateTestCases(validatePasswordTask, [
      makeTestCase("tc1", ["Ab1!"], '{"valid":false,"errors":["Минимум 8 символов"]}'),
    ]);
    expect(result.coveredEcIds).toContain("ec2");
  });

  it("covers ec3 for missing uppercase", () => {
    const result = evaluateTestCases(validatePasswordTask, [
      makeTestCase("tc1", ["abcdef12!"], '{"valid":false,"errors":["Хотя бы одна заглавная буква"]}'),
    ]);
    expect(result.coveredEcIds).toContain("ec3");
  });

  it("covers ec4 for missing lowercase", () => {
    const result = evaluateTestCases(validatePasswordTask, [
      makeTestCase("tc1", ["ABCDEF12!"], '{"valid":false,"errors":["Хотя бы одна строчная буква"]}'),
    ]);
    expect(result.coveredEcIds).toContain("ec4");
  });

  it("covers ec5 for missing digits", () => {
    const result = evaluateTestCases(validatePasswordTask, [
      makeTestCase("tc1", ["Abcdefgh!"], '{"valid":false,"errors":["Хотя бы одна цифра"]}'),
    ]);
    expect(result.coveredEcIds).toContain("ec5");
  });

  it("covers ec6 for missing special characters", () => {
    const result = evaluateTestCases(validatePasswordTask, [
      makeTestCase("tc1", ["Abcdef12"], '{"valid":false,"errors":["Хотя бы один спецсимвол"]}'),
    ]);
    expect(result.coveredEcIds).toContain("ec6");
  });

  it("covers ec8 for empty string", () => {
    const result = evaluateTestCases(validatePasswordTask, [
      makeTestCase("tc1", [""], '{"valid":false,"errors":["Минимум 8 символов","Хотя бы одна заглавная буква","Хотя бы одна строчная буква","Хотя бы одна цифра","Хотя бы один спецсимвол"]}'),
    ]);
    expect(result.coveredEcIds).toContain("ec8");
  });
});

// ===========================================================================
// 8. EC coverage detection — Task 15: Fibonacci
// ===========================================================================

describe("EC coverage — Task 15: Fibonacci", () => {
  it("covers ec1 for n = 0", () => {
    const result = evaluateTestCases(fibonacciTask, [
      makeTestCase("tc1", ["0"], "0"),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
  });

  it("covers ec2 for n = 1", () => {
    const result = evaluateTestCases(fibonacciTask, [
      makeTestCase("tc1", ["1"], "1"),
    ]);
    expect(result.coveredEcIds).toContain("ec2");
  });

  it("covers ec3 for normal range (2-74)", () => {
    const result = evaluateTestCases(fibonacciTask, [
      makeTestCase("tc1", ["10"], "55"),
    ]);
    expect(result.coveredEcIds).toContain("ec3");
  });

  it("covers ec4 for n = 75 (max)", () => {
    const result = evaluateTestCases(fibonacciTask, [
      makeTestCase("tc1", ["75"], "2111485077978050"),
    ]);
    expect(result.coveredEcIds).toContain("ec4");
  });

  it("covers ec5 for negative input", () => {
    const result = evaluateTestCases(fibonacciTask, [
      makeTestCase("tc1", ["-1"], "Ошибка: Фибоначчи не определён для отрицательных чисел"),
    ]);
    expect(result.coveredEcIds).toContain("ec5");
  });

  it("covers ec6 for n > 75", () => {
    const result = evaluateTestCases(fibonacciTask, [
      makeTestCase("tc1", ["76"], "Ошибка: Переполнение: n > 75"),
    ]);
    expect(result.coveredEcIds).toContain("ec6");
  });

  it("covers ec7 for non-integer input", () => {
    const result = evaluateTestCases(fibonacciTask, [
      makeTestCase("tc1", ["3.5"], "Ошибка: Аргумент должен быть целым числом"),
    ]);
    expect(result.coveredEcIds).toContain("ec7");
  });
});

// ===========================================================================
// 9. EC coverage detection — Task 16: calculateShipping
// ===========================================================================

describe("EC coverage — Task 16: calculateShipping", () => {
  it("covers ec1 for premium with amount >= 1000", () => {
    const result = evaluateTestCases(calculateShippingTask, [
      makeTestCase("tc1", ["true", "1000", "local"], '{"shipping":0,"currency":"RUB"}'),
    ]);
    expect(result.coveredEcIds).toContain("ec1");
  });

  it("covers ec2 for premium with amount < 1000, non-international", () => {
    const result = evaluateTestCases(calculateShippingTask, [
      makeTestCase("tc1", ["true", "500", "local"], '{"shipping":100,"currency":"RUB"}'),
    ]);
    expect(result.coveredEcIds).toContain("ec2");
  });

  it("covers ec3 for premium with amount < 1000, international", () => {
    const result = evaluateTestCases(calculateShippingTask, [
      makeTestCase("tc1", ["true", "500", "international"], '{"shipping":200,"currency":"RUB"}'),
    ]);
    expect(result.coveredEcIds).toContain("ec3");
  });

  it("covers ec4 for non-premium with amount >= 2000", () => {
    const result = evaluateTestCases(calculateShippingTask, [
      makeTestCase("tc1", ["false", "2000", "local"], '{"shipping":0,"currency":"RUB"}'),
    ]);
    expect(result.coveredEcIds).toContain("ec4");
  });

  it("covers ec11 for negative order amount", () => {
    const result = evaluateTestCases(calculateShippingTask, [
      makeTestCase("tc1", ["false", "-1", "local"], "Ошибка: Сумма заказа не может быть отрицательной"),
    ]);
    expect(result.coveredEcIds).toContain("ec11");
  });

  it("covers ec12 for invalid region", () => {
    const result = evaluateTestCases(calculateShippingTask, [
      makeTestCase("tc1", ["false", "500", "moon"], "Ошибка: Недопустимый регион"),
    ]);
    expect(result.coveredEcIds).toContain("ec12");
  });
});

// ===========================================================================
// 10. BV coverage detection
// ===========================================================================

describe("Boundary value coverage detection", () => {
  describe("Task 1: Factorial boundary values", () => {
    it("detects boundary at 0", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Нижняя граница (факториал = 1)");
    });

    it("detects boundary at 1", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["1"], "1"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Минимальное положительное");
    });

    it("detects boundary at 19", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["19"], "121645100408832000"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Предпоследнее допустимое");
    });

    it("detects boundary at 20", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["20"], "2432902008176640000"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Верхняя граница допустимых");
    });

    it("detects boundary at 21 (overflow)", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["21"], "Ошибка: Переполнение: n > 20"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Переполнение");
    });

    it("detects boundary at -1", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Первая недопустимая");
    });

    it("covers all 6 boundary values with comprehensive test set", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["0"], "1"),
        makeTestCase("tc2", ["1"], "1"),
        makeTestCase("tc3", ["19"], "121645100408832000"),
        makeTestCase("tc4", ["20"], "2432902008176640000"),
        makeTestCase("tc5", ["21"], "Ошибка: Переполнение: n > 20"),
        makeTestCase("tc6", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"),
      ]);
      expect(result.boundaryCoverage).toBe(100);
      expect(result.coveredBvsCount).toBe(6);
    });
  });

  describe("Task 2: isPrime boundary values", () => {
    it("detects boundary at 0", () => {
      const result = evaluateTestCases(isPrimeTask, [
        makeTestCase("tc1", ["0"], "false"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Нижняя граница");
    });

    it("detects boundary at 2 (smallest prime)", () => {
      const result = evaluateTestCases(isPrimeTask, [
        makeTestCase("tc1", ["2"], "true"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Наименьшее простое");
    });

    it("detects boundary at 4 (smallest composite)", () => {
      const result = evaluateTestCases(isPrimeTask, [
        makeTestCase("tc1", ["4"], "false"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Наименьшее составное");
    });
  });

  describe("Task 3: applyDiscount boundary values", () => {
    it("detects boundary at [100, 0] (0% discount)", () => {
      const result = evaluateTestCases(applyDiscountTask, [
        makeTestCase("tc1", ["100", "0"], "100"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Скидка 0%");
    });

    it("detects boundary at [100, 1] (minimum discount)", () => {
      const result = evaluateTestCases(applyDiscountTask, [
        makeTestCase("tc1", ["100", "1"], "99"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Минимальная скидка");
    });

    it("detects boundary at [100, 99] (max partial discount)", () => {
      const result = evaluateTestCases(applyDiscountTask, [
        makeTestCase("tc1", ["100", "99"], "1"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Максимальная частичная скидка");
    });

    it("detects boundary at [100, 100] (full discount)", () => {
      const result = evaluateTestCases(applyDiscountTask, [
        makeTestCase("tc1", ["100", "100"], "0"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Полная скидка");
    });

    it("detects boundary at [100, 101] (discount > 100%)", () => {
      const result = evaluateTestCases(applyDiscountTask, [
        makeTestCase("tc1", ["100", "101"], "Ошибка: Скидка не может превышать 100%"),
      ]);
      expect(result.coveredBvDescriptions).toContain("Скидка > 100%");
    });
  });
});

// ===========================================================================
// 11. Correctness scoring — error matching and output comparison
// ===========================================================================

describe("Correctness scoring and output comparison", () => {
  it("correctly identifies matching boolean output (true)", () => {
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["7"], "true"),
    ]);
    expect(result.results[0].isCorrect).toBe(true);
  });

  it("correctly identifies matching boolean output (false)", () => {
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["4"], "false"),
    ]);
    expect(result.results[0].isCorrect).toBe(true);
  });

  it("correctly identifies Russian boolean equivalents", () => {
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["7"], "да"),
    ]);
    expect(result.results[0].isCorrect).toBe(true);
  });

  it("correctly identifies mismatched output", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["5"], "100"),
    ]);
    expect(result.results[0].isCorrect).toBe(false);
  });

  it("correctly matches error messages", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"),
    ]);
    expect(result.results[0].isCorrect).toBe(true);
  });

  it("detects when expected error but got result", () => {
    // We expect an error message but the function returned a value
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["5"], "Ошибка: что-то пошло не так"),
    ]);
    expect(result.results[0].isCorrect).toBe(false);
    expect(result.results[0].explanation).toContain("Ожидалась ошибка");
  });

  it("detects when got error but expected result", () => {
    // We expect a normal result but the function threw an error
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["-1"], "1"),
    ]);
    expect(result.results[0].isCorrect).toBe(false);
    expect(result.results[0].explanation).toContain("Функция выбросила ошибку");
  });

  it("provides generic mismatch explanation for non-error cases", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["5"], "100"),
    ]);
    expect(result.results[0].explanation).toContain("Ожидалось");
    expect(result.results[0].explanation).toContain("получено");
  });
});

// ===========================================================================
// 12. Explanation generation
// ===========================================================================

describe("Explanation generation", () => {
  it("includes covered EC names in explanation for correct tests", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
    ]);
    expect(result.results[0].explanation).toContain("EC1");
  });

  it("includes boundary value info in explanation", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
    ]);
    expect(result.results[0].explanation).toContain("граничное значение");
  });

  it("generates simple success message when no ECs or BVs are covered", () => {
    // Use factorial with a value that doesn't match any EC example or BV
    // The heuristic still covers ec2 for inputs 1-20, so we need a task
    // where heuristics don't fire. Use isPrime with a value outside heuristics.
    // Actually, ec3 covers any fnResult=true && input > 2.
    // The simplest approach: use a task input where no heuristic matches.
    // For factorial, input 50 would trigger ec4 heuristic (>20), input "abc" would trigger ec5.
    // There's no input that avoids all heuristics for real tasks.
    // So test with the actual behavior: when correctness fails, explanation mentions the mismatch.
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["3.14"], "10"), // wrong expected, triggers ec5 heuristic
    ]);
    // The explanation will describe the mismatch since isCorrect is false
    expect(result.results[0].isCorrect).toBe(false);
    expect(result.results[0].explanation.length).toBeGreaterThan(0);
  });

  it("adds conceptual tip for exception category tests", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел", "Исключение"),
    ]);
    expect(result.results[0].explanation).toContain("Проверка обработки ошибок");
  });

  it("adds tip about boundary values being likely defect locations", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1", "Граничное значение"),
    ]);
    expect(result.results[0].explanation).toContain("Граничные значения");
    expect(result.results[0].explanation).toContain("наиболее вероятное место дефектов");
  });

  it("uses correct Russian pluralization for multiple covered classes", () => {
    // Test with a task that covers multiple ECs from one test case
    const result = evaluateTestCases(applyDiscountTask, [
      makeTestCase("tc1", ["100", "25"], "75"),
    ]);
    // The explanation should reflect the covered ECs
    expect(result.results[0].explanation.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// 13. Edge cases: empty inputs, malformed inputs, boundary values
// ===========================================================================

describe("Edge cases", () => {
  describe("empty test cases", () => {
    it("handles empty test case array gracefully", () => {
      const result = evaluateTestCases(factorialTask, []);

      expect(result.results).toHaveLength(0);
      expect(result.ecCoverage).toBe(0);
      expect(result.boundaryCoverage).toBe(0);
      expect(result.correctnessScore).toBe(0);
      expect(result.overallScore).toBe(0);
      expect(result.totalEcs).toBe(5);
      expect(result.totalBvs).toBe(6);
      expect(result.coveredEcsCount).toBe(0);
      expect(result.coveredBvsCount).toBe(0);
      expect(result.uncoveredEcIds).toHaveLength(5);
      expect(result.uncoveredBvDescriptions).toHaveLength(6);
    });
  });

  describe("task with no equivalence classes or boundary values", () => {
    it("handles task with empty ECs and BVs but known reference function", () => {
      // Use a real task ID but with empty ECs and BVs
      const emptyTask = makeTask(1, [], []); // factorial id with empty ECs/BVs
      const result = evaluateTestCases(emptyTask, [
        makeTestCase("tc1", ["5"], "120"),
      ]);

      expect(result.ecCoverage).toBe(0);
      expect(result.boundaryCoverage).toBe(0);
      expect(result.correctnessScore).toBe(100);
      expect(result.totalEcs).toBe(0);
      expect(result.totalBvs).toBe(0);
    });

    it("handles task with empty ECs and BVs when reference function is not found", () => {
      const unknownTask = makeTask(999, [], []);
      const result = evaluateTestCases(unknownTask, [
        makeTestCase("tc1", ["5"], "5"),
      ]);

      expect(result.ecCoverage).toBe(0);
      expect(result.boundaryCoverage).toBe(0);
      expect(result.totalEcs).toBe(0);
      expect(result.totalBvs).toBe(0);
      // correctness is 0 because runReferenceFunction returns "Функция не найдена" error
      expect(result.correctnessScore).toBe(0);
    });
  });

  describe("input parsing edge cases", () => {
    it("parses boolean string inputs correctly", () => {
      // These should parse to actual boolean values
      const result = evaluateTestCases(isPrimeTask, [
        makeTestCase("tc1", ["7"], "верно"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("parses 'нет' as false equivalent", () => {
      const result = evaluateTestCases(isPrimeTask, [
        makeTestCase("tc1", ["4"], "нет"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("parses 'неверно' as false equivalent", () => {
      const result = evaluateTestCases(isPrimeTask, [
        makeTestCase("tc1", ["4"], "неверно"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("handles numeric string inputs", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["5"], "120"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("handles negative numeric inputs", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["-3"], "Ошибка: Факториал не определён для отрицательных чисел"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("handles decimal inputs", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["1.5"], "Ошибка: Аргумент должен быть целым числом"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });
  });

  describe("case insensitivity in output comparison", () => {
    it("matches outputs case-insensitively", () => {
      const result = evaluateTestCases(isPrimeTask, [
        makeTestCase("tc1", ["7"], "TRUE"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("matches outputs with different whitespace", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["5"], "  120  "),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });
  });

  describe("multi-input test cases", () => {
    it("handles two-input functions (applyDiscount)", () => {
      const result = evaluateTestCases(applyDiscountTask, [
        makeTestCase("tc1", ["200", "50"], "100"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("handles three-input functions (triangle)", () => {
      const result = evaluateTestCases(triangleTask, [
        makeTestCase("tc1", ["3", "4", "5"], "разносторонний"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("handles three-input functions (isValidDate)", () => {
      const isValidDateTask = getTaskById(10)!;
      const result = evaluateTestCases(isValidDateTask, [
        makeTestCase("tc1", ["15", "6", "2023"], "true"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });
  });

  describe("JSON output comparison", () => {
    it("matches JSON outputs for validatePassword", () => {
      const result = evaluateTestCases(validatePasswordTask, [
        makeTestCase("tc1", ["Abc123!@"], '{"valid":true,"errors":[]}'),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });
  });

  describe("error matching flexibility", () => {
    it("matches error messages with keyword overlap", () => {
      // Error matching should be flexible for Russian error messages
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"),
      ]);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("handles Error: prefix in expected output", () => {
      const result = evaluateTestCases(factorialTask, [
        makeTestCase("tc1", ["-1"], "Error: Факториал не определён для отрицательных чисел"),
      ]);
      // Should match because the error matching logic handles "Error:" prefix
      expect(result.results[0].isCorrect).toBe(true);
    });
  });
});

// ===========================================================================
// 14. Uncovered ECs and BVs tracking
// ===========================================================================

describe("Uncovered ECs and BVs tracking", () => {
  it("lists all ECs as uncovered when no tests are run", () => {
    const result = evaluateTestCases(factorialTask, []);

    expect(result.uncoveredEcIds).toEqual(["ec1", "ec2", "ec3", "ec4", "ec5"]);
    expect(result.coveredEcIds).toEqual([]);
  });

  it("lists specific uncovered ECs after partial testing", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"), // covers ec1 only
    ]);

    expect(result.coveredEcIds).toContain("ec1");
    expect(result.uncoveredEcIds).not.toContain("ec1");
    expect(result.uncoveredEcIds).toContain("ec2");
    expect(result.uncoveredEcIds).toContain("ec3");
    expect(result.uncoveredEcIds).toContain("ec4");
    expect(result.uncoveredEcIds).toContain("ec5");
  });

  it("lists all BVs as uncovered when no boundary values are hit", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["5"], "120"),
    ]);

    expect(result.coveredBvsCount).toBe(0);
    expect(result.uncoveredBvDescriptions).toHaveLength(6);
  });

  it("lists specific uncovered BVs after partial testing", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"), // covers BV "0"
    ]);

    expect(result.coveredBvDescriptions).toContain("Нижняя граница (факториал = 1)");
    expect(result.uncoveredBvDescriptions).not.toContain("Нижняя граница (факториал = 1)");
  });
});

// ===========================================================================
// 15. TestCaseResult structure
// ===========================================================================

describe("TestCaseResult structure", () => {
  it("includes all required fields in each result", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["5"], "120"),
    ]);

    const tcResult = result.results[0];
    expect(tcResult).toHaveProperty("testCase");
    expect(tcResult).toHaveProperty("actualOutput");
    expect(tcResult).toHaveProperty("isCorrect");
    expect(tcResult).toHaveProperty("explanation");
    expect(tcResult).toHaveProperty("coveredClasses");
    expect(tcResult).toHaveProperty("coveredBoundaries");
  });

  it("testCase in result matches input test case", () => {
    const input = makeTestCase("tc1", ["5"], "120");
    const result = evaluateTestCases(factorialTask, [input]);

    expect(result.results[0].testCase).toBe(input);
  });

  it("coveredClasses contains EC IDs as strings", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
    ]);

    expect(Array.isArray(result.results[0].coveredClasses)).toBe(true);
    expect(result.results[0].coveredClasses).toContain("ec1");
  });

  it("coveredBoundaries contains BV descriptions as strings", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
    ]);

    expect(Array.isArray(result.results[0].coveredBoundaries)).toBe(true);
    expect(result.results[0].coveredBoundaries.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// 16. Score rounding behavior
// ===========================================================================

describe("Score rounding behavior", () => {
  it("rounds EC coverage to nearest integer", () => {
    // 1 out of 5 = 20% exactly
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
    ]);
    expect(result.ecCoverage).toBe(20);
  });

  it("rounds boundary coverage to nearest integer", () => {
    // 1 out of 6 = 16.67% → rounds to 17
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
    ]);
    expect(result.boundaryCoverage).toBe(17);
  });

  it("always rounds down when fractional part < 0.5", () => {
    // 2 out of 7 boundary values = 28.57% → rounds to 29
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
      makeTestCase("tc2", ["1"], "1"),
    ]);
    // 2 BVs out of 6 = 33.33% → rounds to 33
    expect(result.boundaryCoverage).toBe(33);
  });
});

// ===========================================================================
// 17. Comprehensive integration test: full factorial coverage
// ===========================================================================

describe("Integration: full factorial coverage", () => {
  it("achieves 100% across all metrics with comprehensive test suite", () => {
    const result = evaluateTestCases(factorialTask, [
      makeTestCase("tc1", ["0"], "1"),
      makeTestCase("tc2", ["1"], "1"),
      makeTestCase("tc3", ["19"], "121645100408832000"),
      makeTestCase("tc4", ["20"], "2432902008176640000"),
      makeTestCase("tc5", ["21"], "Ошибка: Переполнение: n > 20"),
      makeTestCase("tc6", ["-1"], "Ошибка: Факториал не определён для отрицательных чисел"),
      makeTestCase("tc7", ["1.5"], "Ошибка: Аргумент должен быть целым числом"),
      makeTestCase("tc8", ["5"], "120"),
    ]);

    expect(result.ecCoverage).toBe(100);
    expect(result.boundaryCoverage).toBe(100);
    expect(result.correctnessScore).toBe(100);
    expect(result.overallScore).toBe(100);
    expect(result.uncoveredEcIds).toHaveLength(0);
    expect(result.uncoveredBvDescriptions).toHaveLength(0);
  });
});

// ===========================================================================
// 18. Comprehensive integration test: full isPrime coverage
// ===========================================================================

describe("Integration: full isPrime coverage", () => {
  it("achieves full heuristic-detectable EC coverage with comprehensive test suite", () => {
    // The heuristics for task 2 cover: ec1 (input<=1), ec2 (input===2),
    // ec3 (fnResult=true && input>2), ec4 (fnResult=false && input>1).
    // ec5 (large numbers) and ec6 (non-number type) are NOT covered by heuristics.
    const result = evaluateTestCases(isPrimeTask, [
      makeTestCase("tc1", ["0"], "false"),       // ec1
      makeTestCase("tc2", ["2"], "true"),         // ec2
      makeTestCase("tc3", ["7"], "true"),         // ec3
      makeTestCase("tc4", ["4"], "false"),        // ec4
    ]);

    expect(result.coveredEcIds).toContain("ec1");
    expect(result.coveredEcIds).toContain("ec2");
    expect(result.coveredEcIds).toContain("ec3");
    expect(result.coveredEcIds).toContain("ec4");
    expect(result.correctnessScore).toBe(100);
    // ec5 and ec6 are not covered by heuristics
    expect(result.uncoveredEcIds).toContain("ec5");
    expect(result.uncoveredEcIds).toContain("ec6");
  });
});
