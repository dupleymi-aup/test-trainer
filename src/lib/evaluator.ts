import {
  type Task,
  type TestCaseCategory,
  runReferenceFunction,
} from "./tasks";

/** Weights for the overall score formula */
const EC_COVERAGE_WEIGHT = 0.4;
const BOUNDARY_COVERAGE_WEIGHT = 0.3;
const CORRECTNESS_WEIGHT = 0.3;

/** Safely convert input to number — returns NaN for undefined/null, preventing silent incorrect comparisons. */
function safeNum(val: unknown): number {
  if (val === undefined || val === null) return NaN;
  const n = Number(val);
  return n;
}

export interface TestCase {
  id: string;
  inputs: string[];
  expectedOutput: string;
  category: TestCaseCategory;
  comment: string;
}

/** Test case shape as stored in the database (parsed from JSON). */
export interface StoredTestCase {
  id: string;
  inputs: unknown[];
  expectedOutput: string;
  category: string;
  comment?: string;
}

export interface TestCaseResult {
  testCase: TestCase;
  actualOutput: string;
  isCorrect: boolean;
  explanation: string;
  coveredClasses: string[];
  coveredBoundaries: string[];
}

export interface EvaluationResult {
  task: Task;
  results: TestCaseResult[];
  ecCoverage: number;
  boundaryCoverage: number;
  correctnessScore: number;
  overallScore: number;
  coveredEcIds: string[];
  uncoveredEcIds: string[];
  coveredBvDescriptions: string[];
  uncoveredBvDescriptions: string[];
  totalEcs: number;
  totalBvs: number;
  coveredEcsCount: number;
  coveredBvsCount: number;
}

function normalizeValue(val: unknown): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function parseInputValue(raw: string): unknown {
  const trimmed = raw.trim();

  // Handle special strings
  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // Handle Russian boolean words
  if (trimmed === "да" || trimmed === "верно") return true;
  if (trimmed === "нет" || trimmed === "неверно") return false;

  // Try parsing as number — improved to handle decimals and negatives better
  const num = Number(trimmed);
  if (trimmed !== "" && !isNaN(num)) {
    // Check that it looks like a number (allow negatives, decimals)
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
      return num;
    }
  }

  // Try parsing as JSON (for objects, arrays)
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" || Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON
  }

  // Return as string
  return trimmed;
}

function matchBoundaryValue(
  inputs: unknown[],
  boundaryValue: unknown
): boolean {
  const bv = boundaryValue;

  // If boundary is array, compare with inputs array
  if (Array.isArray(bv)) {
    if (inputs.length !== bv.length) return false;
    return bv.every((val, i) => {
      const parsed = inputs[i];
      return normalizeValue(parsed) === normalizeValue(val);
    });
  }

  // Single value — compare with first input
  if (inputs.length === 1) {
    return normalizeValue(inputs[0]) === normalizeValue(bv);
  }

  return false;
}

function findCoveredEquivalenceClasses(
  taskId: number,
  inputs: unknown[],
  task: Task,
  fnResult: unknown,
  fnError: string | null
): string[] {
  const covered: string[] = [];

  // Use the cached result instead of calling runReferenceFunction again

  for (const ec of task.equivalenceClasses) {
    // Check if any example value matches
    for (const example of ec.exampleValues) {
      if (Array.isArray(example)) {
        if (inputs.length === example.length) {
          const match = example.every(
            (val, i) =>
              normalizeValue(inputs[i]) === normalizeValue(val)
          );
          if (match) {
            covered.push(ec.id);
            break;
          }
        }
      } else {
        if (inputs.length === 1) {
          if (normalizeValue(inputs[0]) === normalizeValue(example)) {
            covered.push(ec.id);
            break;
          }
        }
      }
    }
  }

  // Heuristic: also check by error / result matching
  if (fnError) {
    // Check if error matches EC descriptions
    for (const ec of task.equivalenceClasses) {
      if (covered.includes(ec.id)) continue;
      const desc = ec.description.toLowerCase();
      if (
        desc.includes("недопустим") ||
        desc.includes("ошибк") ||
        desc.includes("переполнен") ||
        desc.includes("неверный тип")
      ) {
        // If we get an error and there's an error-related EC, cover it
        // But only if the input is in a reasonable range for that EC
        const inp0 = safeNum(inputs[0]);
        const inp1 = safeNum(inputs[1]);
        if (
          (desc.includes("отрицательн") && !isNaN(inp0) && inp0 < 0) ||
          (desc.includes("не число") && !Number.isInteger(inputs[0]) && typeof inputs[0] !== "number") ||
          (taskId === 1 && desc.includes("переполнен") && !isNaN(inp0) && inp0 > 20) ||
          (desc.includes("превышает") && !isNaN(inp1) && inp1 > 100) ||
          (desc.includes("отрицательн") && !isNaN(inp1) && inp1 < 0)
        ) {
          covered.push(ec.id);
        }
      }
    }
  }

  // Heuristic for specific tasks based on result
  for (const ec of task.equivalenceClasses) {
    if (covered.includes(ec.id)) continue;

    if (taskId === 1) {
      // Factorial
      const n = safeNum(inputs[0]);
      if (ec.id === "ec1" && inputs[0] === 0) covered.push(ec.id);
      if (
        ec.id === "ec2" &&
        Number.isInteger(inputs[0]) &&
        !isNaN(n) && n >= 1 && n <= 20
      )
        covered.push(ec.id);
    }

    if (taskId === 2) {
      // isPrime
      const n = safeNum(inputs[0]);
      if (ec.id === "ec1" && !isNaN(n) && n <= 1) covered.push(ec.id);
      if (ec.id === "ec2" && !isNaN(n) && n === 2) covered.push(ec.id);
      if (
        ec.id === "ec3" &&
        fnResult === true &&
        !isNaN(n) && n > 2
      )
        covered.push(ec.id);
      if (
        ec.id === "ec4" &&
        fnResult === false &&
        !isNaN(n) && n > 1
      )
        covered.push(ec.id);
    }

    if (taskId === 3) {
      // applyDiscount — improved heuristic based on result + input ranges
      const price = safeNum(inputs[0]);
      const discount = safeNum(inputs[1]);

      if (ec.id === "ec1" && !fnError && discount === 0 && price > 0) {
        covered.push(ec.id);
      }
      if (ec.id === "ec2" && !fnError && discount > 0 && discount < 100 && price > 0) {
        covered.push(ec.id);
      }
      if (ec.id === "ec3" && !fnError && discount === 100 && price > 0) {
        covered.push(ec.id);
      }
      if (ec.id === "ec4" && !fnError && price === 0) {
        covered.push(ec.id);
      }
      if (ec.id === "ec5" && fnError && typeof price === "number" && !isNaN(price) && price < 0) {
        covered.push(ec.id);
      }
      if (ec.id === "ec6" && fnError && typeof discount === "number" && !isNaN(discount) && discount < 0) {
        covered.push(ec.id);
      }
      if (ec.id === "ec7" && fnError && typeof discount === "number" && !isNaN(discount) && discount > 100) {
        covered.push(ec.id);
      }
      if (ec.id === "ec8" && fnError && (typeof inputs[0] !== "number" || typeof inputs[1] !== "number")) {
        covered.push(ec.id);
      }
    }

    if (taskId === 4) {
      // isLeapYear
      const y = safeNum(inputs[0]);
      if (!isNaN(y) &&
        ec.id === "ec1" &&
        y % 400 === 0
      )
        covered.push(ec.id);
      if (!isNaN(y) &&
        ec.id === "ec2" &&
        y % 100 === 0 &&
        y % 400 !== 0
      )
        covered.push(ec.id);
      if (!isNaN(y) &&
        ec.id === "ec3" &&
        y % 4 === 0 &&
        y % 100 !== 0
      )
        covered.push(ec.id);
      if (!isNaN(y) &&
        ec.id === "ec4" &&
        y % 4 !== 0
      )
        covered.push(ec.id);
      if (ec.id === "ec5" && fnError && y <= 0)
        covered.push(ec.id);
    }

    if (taskId === 5) {
      // triangle
      if (
        ec.id === "ec1" &&
        fnResult === "равносторонний"
      )
        covered.push(ec.id);
      if (
        ec.id === "ec2" &&
        fnResult === "равнобедренный"
      )
        covered.push(ec.id);
      if (
        ec.id === "ec3" &&
        fnResult === "разносторонний"
      )
        covered.push(ec.id);
      if (
        ec.id === "ec4" &&
        fnResult === "не треугольник" &&
        !fnError
      )
        covered.push(ec.id);
      if (
        ec.id === "ec5" &&
        fnError &&
        (inputs as number[]).some(v => typeof v === "number" && v <= 0)
      )
        covered.push(ec.id);
      if (
        ec.id === "ec6" &&
        fnResult === "не треугольник" &&
        !fnError
      ) {
        const [a, b, c] = inputs as number[];
        if (a + b === c || a + c === b || b + c === a)
          covered.push(ec.id);
      }
    }

    if (taskId === 6) {
      // validatePassword — match ECs by specific error presence
      if (
        fnResult &&
        typeof fnResult === "object" &&
        "valid" in fnResult &&
        "errors" in fnResult
      ) {
        const res = fnResult as { valid: boolean; errors: string[] };
        const errors = res.errors;
        const inputStr = String(inputs[0]);

        if (ec.id === "ec1" && res.valid) {
          covered.push(ec.id);
        }
        if (ec.id === "ec2" && errors.some(e => e.includes("Минимум 8"))) {
          covered.push(ec.id);
        }
        if (ec.id === "ec3" && errors.some(e => e.includes("заглавную"))) {
          covered.push(ec.id);
        }
        if (ec.id === "ec4" && errors.some(e => e.includes("строчную"))) {
          covered.push(ec.id);
        }
        if (ec.id === "ec5" && errors.some(e => e.includes("цифр"))) {
          covered.push(ec.id);
        }
        if (ec.id === "ec6" && errors.some(e => e.includes("спецсимвол"))) {
          covered.push(ec.id);
        }
        if (ec.id === "ec7" && errors.length >= 2 && inputStr !== "") {
          covered.push(ec.id);
        }
        if (ec.id === "ec8" && inputStr === "") {
          covered.push(ec.id);
        }
        if (ec.id === "ec9" && fnError) {
          covered.push(ec.id);
        }
      } else if (ec.id === "ec9" && fnError) {
        covered.push(ec.id);
      }
    }

    if (taskId === 7) {
      // isPalindrome
      const inputStr = String(inputs[0]);
      const cleaned = inputStr.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
      const isPalin = cleaned === cleaned.split("").reverse().join("");

      if (ec.id === "ec1" && isPalin && /^[a-z]+$/.test(cleaned)) covered.push(ec.id);
      if (ec.id === "ec2" && isPalin && /[а-яё]/i.test(cleaned)) covered.push(ec.id);
      if (ec.id === "ec3" && !isPalin && !fnError) covered.push(ec.id);
      if (ec.id === "ec4" && isPalin && /[a-zа-яё0-9]/i.test(inputStr) && (inputStr.includes(" ") || /[^a-zа-яё0-9]/i.test(inputStr))) covered.push(ec.id);
      if (ec.id === "ec5" && inputStr.trim() === "" && !fnError) covered.push(ec.id);
      if (ec.id === "ec6" && !fnError && inputStr.trim().length === 1) covered.push(ec.id);
      if (ec.id === "ec7" && fnError) covered.push(ec.id);
    }

    if (taskId === 8) {
      // validateEmail
      if (fnResult && typeof fnResult === "object" && "valid" in fnResult && "errors" in fnResult) {
        const res = fnResult as { valid: boolean; errors: string[] };
        const errors = res.errors;
        const inputStr = String(inputs[0]);

        if (ec.id === "ec1" && res.valid) covered.push(ec.id);
        if (ec.id === "ec2" && errors.some(e => e.includes("Отсутствует символ @"))) covered.push(ec.id);
        if (ec.id === "ec3" && errors.some(e => e.includes("Более одного"))) covered.push(ec.id);
        if (ec.id === "ec4" && errors.some(e => e.includes("Пустая локальная"))) covered.push(ec.id);
        if (ec.id === "ec5" && errors.some(e => e.includes("Недопустимые символы в локальной"))) covered.push(ec.id);
        if (ec.id === "ec6" && errors.some(e => e.includes("Пустая доменная"))) covered.push(ec.id);
        if (ec.id === "ec7" && errors.some(e => e.includes("не содержит точку"))) covered.push(ec.id);
        if (ec.id === "ec8" && errors.some(e => e.includes("слишком короткий"))) covered.push(ec.id);
        if (ec.id === "ec9" && errors.some(e => e.includes("слишком длинный"))) covered.push(ec.id);
        if (ec.id === "ec10" && inputStr === "" && errors.length > 0) covered.push(ec.id);
        if (ec.id === "ec11" && fnError) covered.push(ec.id);
      } else if (ec.id === "ec11" && fnError) {
        covered.push(ec.id);
      }
    }

    if (taskId === 9) {
      // toRoman
      const n = safeNum(inputs[0]);

      if (ec.id === "ec1" && !fnError && !isNaN(n) && n === 1) covered.push(ec.id);
      if (ec.id === "ec2" && !fnError && !isNaN(n) && n >= 2 && n <= 3998) covered.push(ec.id);
      if (ec.id === "ec3" && !fnError && !isNaN(n) && n === 3999) covered.push(ec.id);
      if (ec.id === "ec4" && fnError && !isNaN(n) && n < 1) covered.push(ec.id);
      if (ec.id === "ec5" && fnError && !isNaN(n) && n > 3999) covered.push(ec.id);
      if (ec.id === "ec6" && fnError && !isNaN(n) && !Number.isInteger(n)) covered.push(ec.id);
    }

    if (taskId === 10) {
      // isValidDate
      const day = safeNum(inputs[0]);
      const month = safeNum(inputs[1]);
      const year = safeNum(inputs[2]);
      if (fnError) {
        if (ec.id === "ec8") covered.push(ec.id);
      } else if (fnResult !== undefined) {
        const isValid = fnResult === true;
        const isLeap = (!isNaN(year) && year % 4 === 0 && year % 100 !== 0) || (!isNaN(year) && year % 400 === 0);
        const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        if (ec.id === "ec1" && isValid && !isNaN(month) && month >= 1 && month <= 12 && !isNaN(day) && day >= 1 && day <= daysInMonth[month - 1]) covered.push(ec.id);
        if (ec.id === "ec2" && isValid && !isNaN(day) && day === 29 && !isNaN(month) && month === 2 && isLeap) covered.push(ec.id);
        if (ec.id === "ec3" && !isValid && !isNaN(month) && month >= 1 && month <= 12 && !isNaN(day) && day > daysInMonth[month - 1]) covered.push(ec.id);
        if (ec.id === "ec4" && !isValid && !isNaN(day) && day === 29 && !isNaN(month) && month === 2 && !isLeap) covered.push(ec.id);
        if (ec.id === "ec5" && !isValid && (!isNaN(month) && (month < 1 || month > 12))) covered.push(ec.id);
        if (ec.id === "ec6" && !isValid && !isNaN(day) && day < 1 && !isNaN(month) && month >= 1 && month <= 12) covered.push(ec.id);
        if (ec.id === "ec7" && isValid && (!isNaN(day) && (day === 30 || day === 31)) && !isNaN(month) && month >= 1 && month <= 12) covered.push(ec.id);
      }
    }

    if (taskId === 11) {
      // validatePhone
      if (fnError) {
        if (ec.id === "ec8") covered.push(ec.id);
      } else if (fnResult && typeof fnResult === "object" && "valid" in fnResult && "errors" in fnResult) {
        const res = fnResult as { valid: boolean; errors: string[] };
        const errors = res.errors;
        const inputStr = String(inputs[0]);

        if (ec.id === "ec1" && res.valid && inputStr.startsWith("+7")) covered.push(ec.id);
        if (ec.id === "ec2" && res.valid && (inputStr.startsWith("8") || inputStr.startsWith("+"))) covered.push(ec.id);
        if (ec.id === "ec3" && res.valid && !inputStr.startsWith("+7") && !inputStr.startsWith("8")) covered.push(ec.id);
        if (ec.id === "ec4" && errors.some(e => e.includes("короткий"))) covered.push(ec.id);
        if (ec.id === "ec5" && errors.some(e => e.includes("длинный"))) covered.push(ec.id);
        if (ec.id === "ec6" && errors.some(e => e.includes("букв"))) covered.push(ec.id);
        if (ec.id === "ec7" && inputStr === "" && errors.some(e => e.includes("цифр"))) covered.push(ec.id);
      }
    }

    if (taskId === 12) {
      // calculateBMI
      const weight = safeNum(inputs[0]);
      const height = safeNum(inputs[1]);
      if (fnError) {
        if (ec.id === "ec9" && fnError) covered.push(ec.id);
        if (ec.id === "ec5" && fnError && !isNaN(weight) && weight < 20) covered.push(ec.id);
        if (ec.id === "ec6" && fnError && !isNaN(weight) && weight > 300) covered.push(ec.id);
        if (ec.id === "ec7" && fnError && !isNaN(height) && height < 50) covered.push(ec.id);
        if (ec.id === "ec8" && fnError && !isNaN(height) && height > 250) covered.push(ec.id);
      } else if (fnResult && typeof fnResult === "object" && "category" in fnResult) {
        const res = fnResult as { category: string };
        if (ec.id === "ec1" && res.category === "Недостаточный вес") covered.push(ec.id);
        if (ec.id === "ec2" && res.category === "Норма") covered.push(ec.id);
        if (ec.id === "ec3" && res.category === "Избыточный вес") covered.push(ec.id);
        if (ec.id === "ec4" && res.category === "Ожирение") covered.push(ec.id);
      }
    }

    if (taskId === 13) {
      // parseNumber
      if (fnError) {
        if (ec.id === "ec7") covered.push(ec.id);
      } else {
        const numResult = fnResult as number;
        const inputStr = String(inputs[0]).trim();
        const isNaNResult = isNaN(numResult);

        if (ec.id === "ec1" && !isNaNResult && !inputStr.toLowerCase().startsWith("0x") && !inputStr.toLowerCase().startsWith("0b")) covered.push(ec.id);
        if (ec.id === "ec2" && !isNaNResult && inputStr.toLowerCase().startsWith("0x")) covered.push(ec.id);
        if (ec.id === "ec3" && !isNaNResult && inputStr.toLowerCase().startsWith("0b")) covered.push(ec.id);
        if (ec.id === "ec4" && !isNaNResult && (inputStr !== String(inputs[0]))) covered.push(ec.id);
        if (ec.id === "ec5" && isNaNResult && inputStr.trim() === "") covered.push(ec.id);
        if (ec.id === "ec6" && isNaNResult && inputStr.trim() !== "") covered.push(ec.id);
      }
    }

    if (taskId === 14) {
      // flattenArray — detect EC coverage by analyzing input structure + result
      if (fnError) {
        if (ec.id === "ec7" && fnError) covered.push(ec.id);
      } else if (fnResult && Array.isArray(fnResult)) {
        const input = inputs[0];

        if (ec.id === "ec1" && Array.isArray(input) && input.length === 0) covered.push(ec.id);
        if (ec.id === "ec2" && Array.isArray(input) && input.length > 0 && input.every(v => !Array.isArray(v))) covered.push(ec.id);
        if (ec.id === "ec3" && Array.isArray(input) && input.some(v => Array.isArray(v)) && !(input as unknown[]).some(v => Array.isArray(v) && (v as unknown[]).some(x => Array.isArray(x)))) covered.push(ec.id);
        if (ec.id === "ec4" && Array.isArray(input) && (input as unknown[]).some(v => {
          const check = (a: unknown): boolean => Array.isArray(a) && a.some(check);
          return Array.isArray(v) && (v as unknown[]).some(check);
        })) covered.push(ec.id);
        if (ec.id === "ec5" && Array.isArray(input) && (input as unknown[]).some(v => v === null || v === undefined)) covered.push(ec.id);
        if (ec.id === "ec6" && Array.isArray(input) && input.some(v => typeof v === "boolean" || (typeof v === "object" && v !== null && !Array.isArray(v)))) covered.push(ec.id);
      }
    }

    if (taskId === 15) {
      // fibonacci — detect EC coverage by input value + result/error
      const n = safeNum(inputs[0]);
      if (fnError) {
        if (ec.id === "ec5" && fnError && !isNaN(n) && n < 0) covered.push(ec.id);
        if (ec.id === "ec6" && fnError && !isNaN(n) && n > 75) covered.push(ec.id);
        if (ec.id === "ec7" && fnError && !isNaN(n) && !Number.isInteger(n)) covered.push(ec.id);
      } else if (typeof fnResult === "number") {
        if (ec.id === "ec1" && !isNaN(n) && n === 0 && fnResult === 0) covered.push(ec.id);
        if (ec.id === "ec2" && !isNaN(n) && n === 1 && fnResult === 1) covered.push(ec.id);
        if (ec.id === "ec3" && !isNaN(n) && n >= 2 && n <= 74) covered.push(ec.id);
        if (ec.id === "ec4" && !isNaN(n) && n === 75) covered.push(ec.id);
      }
    }

    if (taskId === 16) {
      // calculateShipping — decision table
      const amount = safeNum(inputs[1]);
      if (fnError) {
        if (ec.id === "ec11" && !isNaN(amount) && amount < 0) covered.push(ec.id);
        if (ec.id === "ec12" && typeof inputs[2] === "string" && !["local", "national", "international"].includes(inputs[2] as string)) covered.push(ec.id);
        if (ec.id === "ec13" && fnError) covered.push(ec.id);
      } else if (fnResult && typeof fnResult === "object" && "shipping" in fnResult) {
        const res = fnResult as { shipping: number };
        const isPremium = inputs[0] as boolean;
        const region = inputs[2] as string;

        if (ec.id === "ec1" && isPremium === true && amount >= 1000 && res.shipping === 0) covered.push(ec.id);
        if (ec.id === "ec2" && isPremium === true && amount < 1000 && region !== "international" && res.shipping === 100) covered.push(ec.id);
        if (ec.id === "ec3" && isPremium === true && amount < 1000 && region === "international" && res.shipping === 200) covered.push(ec.id);
        if (ec.id === "ec4" && isPremium === false && amount >= 2000 && res.shipping === 0) covered.push(ec.id);
        if (ec.id === "ec5" && isPremium === false && amount >= 500 && amount < 2000 && region === "local" && res.shipping === 100) covered.push(ec.id);
        if (ec.id === "ec6" && isPremium === false && amount >= 500 && amount < 2000 && region === "national" && res.shipping === 200) covered.push(ec.id);
        if (ec.id === "ec7" && isPremium === false && amount >= 500 && amount < 2000 && region === "international" && res.shipping === 400) covered.push(ec.id);
        if (ec.id === "ec8" && isPremium === false && amount < 500 && region === "local" && res.shipping === 200) covered.push(ec.id);
        if (ec.id === "ec9" && isPremium === false && amount < 500 && region === "national" && res.shipping === 350) covered.push(ec.id);
        if (ec.id === "ec10" && isPremium === false && amount < 500 && region === "international" && res.shipping === 500) covered.push(ec.id);
      }
    }

    if (taskId === 17) {
      // handleLoginAction — state transitions
      if (fnError) {
        if (ec.id === "ec9" && typeof inputs[0] === "string" && !["login", "success", "wait"].includes(inputs[0] as string)) covered.push(ec.id);
        if (ec.id === "ec10" && typeof inputs[1] === "number" && (inputs[1] as number) < 0) covered.push(ec.id);
        if (ec.id === "ec11" && fnError && (typeof inputs[0] !== "string" || (typeof inputs[1] !== "number" && inputs[1] !== null))) covered.push(ec.id);
      } else if (fnResult && typeof fnResult === "object" && "status" in fnResult) {
        const res = fnResult as { status: string; remainingAttempts: number };
        const action = inputs[0] as string;
        const attempts = inputs[1] as number;
        const lockout = inputs[2];

        if (ec.id === "ec1" && action === "success" && attempts === 0 && res.status === "success") covered.push(ec.id);
        if (ec.id === "ec2" && action === "success" && (attempts === 1 || attempts === 2) && res.status === "success") covered.push(ec.id);
        if (ec.id === "ec3" && action === "login" && attempts === 0 && res.status === "failed" && res.remainingAttempts === 2) covered.push(ec.id);
        if (ec.id === "ec4" && action === "login" && attempts === 1 && res.status === "failed" && res.remainingAttempts === 1) covered.push(ec.id);
        if (ec.id === "ec5" && action === "login" && attempts === 2 && res.status === "locked") covered.push(ec.id);
        if (ec.id === "ec6" && action === "login" && lockout !== null && res.status === "locked") covered.push(ec.id);
        if (ec.id === "ec7" && action === "wait" && res.status === "unlocked") covered.push(ec.id);
        if (ec.id === "ec8" && action === "success" && lockout !== null && res.status === "locked") covered.push(ec.id);
      }
    }
  }

  return [...new Set(covered)];
}

function compareOutputs(expected: string, actual: unknown): boolean {
  const normalizedExpected = expected.trim().toLowerCase();
  const normalizedActual = normalizeValue(actual).trim().toLowerCase();

  if (normalizedExpected === normalizedActual) return true;

  // Handle "true"/"false" comparisons — including Russian variants
  const trueValues = ["true", "да", "верно"];
  const falseValues = ["false", "нет", "неверно"];

  if (trueValues.includes(normalizedExpected) && (actual === true || normalizedActual === "true")) {
    return true;
  }
  if (falseValues.includes(normalizedExpected) && (actual === false || normalizedActual === "false")) {
    return true;
  }

  // Handle JSON comparison for validatePassword — if expected starts with { parse as JSON
  const trimmedExpected = expected.trim();
  if (trimmedExpected.startsWith("{")) {
    try {
      const expectedObj = JSON.parse(trimmedExpected);
      if (typeof actual === "object" && actual !== null) {
        return JSON.stringify(expectedObj) === JSON.stringify(actual);
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  // Handle "Error:" prefix matching better
  if (normalizedExpected.includes("ошибк") || normalizedExpected.includes("исключен") || normalizedExpected.startsWith("error:")) {
    let strippedExpected = normalizedExpected;
    if (strippedExpected.startsWith("error:")) {
      strippedExpected = strippedExpected.slice(6).trim();
    }
    if (strippedExpected.startsWith("ошибка:")) {
      strippedExpected = strippedExpected.slice(7).trim();
    }
    let strippedActual = normalizedActual;
    if (strippedActual.startsWith("ошибка:")) {
      strippedActual = strippedActual.slice(7).trim();
    }
    // Flexible matching: exact, keyword, or substring for medium messages
    if (strippedExpected === strippedActual) return true;
    const keywords = strippedExpected.split(/\s+/).filter(w => w.length > 3);
    if (keywords.length > 0 && keywords.some(kw => strippedActual.includes(kw))) return true;
    if (strippedExpected.length <= 50 && (strippedActual.includes(strippedExpected) || strippedExpected.includes(strippedActual))) return true;
    return false;
  }

  // Handle { valid: true, errors: [] } — compare by parsing expected as JSON
  if (trimmedExpected.includes("valid") && trimmedExpected.includes("errors")) {
    try {
      const expectedObj = JSON.parse(trimmedExpected);
      if (typeof actual === "object" && actual !== null) {
        // Deep compare valid and errors fields
        const act = actual as { valid?: boolean; errors?: unknown[] };
        if (expectedObj.valid !== undefined && expectedObj.errors !== undefined) {
          if (expectedObj.valid === act.valid && JSON.stringify(expectedObj.errors) === JSON.stringify(act.errors)) {
            return true;
          }
        }
      }
    } catch {
      // Not valid JSON
    }
  }

  return false;
}

export function evaluateTestCases(
  task: Task,
  testCases: TestCase[]
): EvaluationResult {
  const results: TestCaseResult[] = [];
  const allCoveredEcs = new Set<string>();
  const allCoveredBvs = new Set<string>();

  for (const tc of testCases) {
    const parsedInputs = tc.inputs.map(parseInputValue);
    const { result, error } = runReferenceFunction(task.id, parsedInputs);

    let actualOutput: string;
    if (error) {
      actualOutput = `Ошибка: ${error}`;
    } else {
      actualOutput = normalizeValue(result);
    }

    // Compare expected with actual
    const isCorrect = compareOutputs(tc.expectedOutput, error ? `Ошибка: ${error}` : result);

    // Find covered ECs - pass cached result to avoid duplicate runReferenceFunction call
    const coveredClasses = findCoveredEquivalenceClasses(
      task.id,
      parsedInputs,
      task,
      result,
      error
    );
    coveredClasses.forEach((id) => allCoveredEcs.add(id));

    // Find covered boundary values
    const coveredBoundaries: string[] = [];
    for (const bv of task.boundaryValues) {
      if (matchBoundaryValue(parsedInputs, bv.value)) {
        const desc = bv.description;
        coveredBoundaries.push(desc);
        allCoveredBvs.add(desc);
      }
    }

    // Generate explanation
    let explanation: string;
    if (isCorrect) {
      const coveredEcNames = coveredClasses
        .map((id) => task.equivalenceClasses.find((ec) => ec.id === id))
        .filter((ec): ec is NonNullable<ReturnType<typeof task.equivalenceClasses.find>> => ec !== undefined)
        .map((ec) => ec.name);

      const coveredBvNames = coveredBoundaries;

      const parts: string[] = [];

      if (coveredEcNames.length > 0) {
        parts.push(`Покрыт${coveredEcNames.length > 1 ? 'ы' : ''} класс${coveredEcNames.length > 1 ? 'ы' : ''}: ${coveredEcNames.join(", ")}`);
      }
      if (coveredBvNames.length > 0) {
        parts.push(`граничное значение: ${coveredBvNames.join(", ")}`);
      }

      if (parts.length > 0) {
        explanation = parts.join("; ");
      } else {
        explanation = "Тест-кейс пройден успешно";
      }

      // Add conceptual tip for first-time coverage
      if (coveredClasses.length > 0 && tc.category === "Исключение") {
        explanation += ". Проверка обработки ошибок — важная часть покрытия.";
      }
      if (coveredBoundaries.length > 0) {
        explanation += ". Граничные значения — наиболее вероятное место дефектов.";
      }
    } else {
      const normExpected = tc.expectedOutput.trim().toLowerCase();
      const normActual = actualOutput.trim().toLowerCase();
      const expectedIsError = normExpected.includes("ошибк") || normExpected.includes("исключен") || normExpected.startsWith("error");
      const actualIsError = normActual.includes("ошибк") || normActual.startsWith("ошибка");

      if (expectedIsError && !actualIsError) {
        explanation = `Ожидалась ошибка, но функция вернула результат. Фактический: ${actualOutput}. Проверьте, попадает ли вход в класс невалидных данных.`;
      } else if (!expectedIsError && actualIsError) {
        explanation = `Функция выбросила ошибку вместо ожидаемого результата. Фактический: ${actualOutput}. Возможно, вход относится к другому классу эквивалентности.`;
      } else {
        explanation = `Ожидалось: ${tc.expectedOutput}, получено: ${actualOutput}. Сверьтесь с кодом функции и уточните ожидаемый результат.`;
      }
    }

    results.push({
      testCase: tc,
      actualOutput,
      isCorrect,
      explanation,
      coveredClasses,
      coveredBoundaries,
    });
  }

  // Calculate scores
  const totalEcs = task.equivalenceClasses.length;
  const coveredEcsCount = allCoveredEcs.size;
  const ecCoverage = totalEcs > 0 ? (coveredEcsCount / totalEcs) * 100 : 0;

  const totalBvs = task.boundaryValues.length;
  const coveredBvsCount = allCoveredBvs.size;
  const boundaryCoverage = totalBvs > 0 ? (coveredBvsCount / totalBvs) * 100 : 0;

  const totalTests = results.length;
  const correctTests = results.filter((r) => r.isCorrect).length;
  const correctnessScore =
    totalTests > 0 ? (correctTests / totalTests) * 100 : 0;

  // Weighted average: EC 40%, Boundary 30%, Correctness 30%
  const overallScore =
    ecCoverage * EC_COVERAGE_WEIGHT + boundaryCoverage * BOUNDARY_COVERAGE_WEIGHT + correctnessScore * CORRECTNESS_WEIGHT;

  // Determine uncovered items
  const coveredEcIds = Array.from(allCoveredEcs);
  const uncoveredEcIds = task.equivalenceClasses
    .filter((ec) => !allCoveredEcs.has(ec.id))
    .map((ec) => ec.id);

  const coveredBvDescriptions = Array.from(allCoveredBvs);
  const uncoveredBvDescriptions = task.boundaryValues
    .filter((bv) => !allCoveredBvs.has(bv.description))
    .map((bv) => bv.description);

  return {
    task,
    results,
    ecCoverage: Math.round(ecCoverage),
    boundaryCoverage: Math.round(boundaryCoverage),
    correctnessScore: Math.round(correctnessScore),
    overallScore: Math.round(overallScore),
    coveredEcIds,
    uncoveredEcIds,
    coveredBvDescriptions,
    uncoveredBvDescriptions,
    totalEcs,
    totalBvs,
    coveredEcsCount,
    coveredBvsCount,
  };
}
