export type Difficulty = "Легко" | "Средне" | "Сложно";

export type TestCaseCategory =
  | "Нормальное значение"
  | "Граничное значение"
  | "Исключение"
  | "Недопустимый тип";

export interface EquivalenceClass {
  id: string;
  name: string;
  description: string;
  exampleValues: unknown[];
}

export interface BoundaryValue {
  value: unknown;
  description: string;
}

export interface TaskParam {
  name: string;
  type: string;
  description: string;
}

export interface Task {
  id: number;
  name: string;
  difficulty: Difficulty;
  description: string;
  signature: string;
  topics: string[];
  params: TaskParam[];
  returnType: string;
  code: string;
  equivalenceClasses: EquivalenceClass[];
  boundaryValues: BoundaryValue[];
  commonMistakes?: string[];
}

// Helper to auto-generate code display string from a function
function getCode<T extends (...args: unknown[]) => unknown>(fn: T): string {
  const source = fn.toString();
  // If it's an arrow function wrapper like "(args) => factorial(args[0])", extract the inner call
  const arrowMatch = source.match(/\)\s*=>\s*(\w+)\(/);
  if (arrowMatch) {
    const fnName = arrowMatch[1];
    // Try to find the original function and return its source
    const originalFn = fn.name !== "" ? fn : null;
    if (originalFn && originalFn.name) {
      try {
        return originalFn.toString();
      } catch {
        // Fall through
      }
    }
  }
  return source;
}
function factorial(n: number): number {
  if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
  if (n < 0) throw new Error("Факториал не определён для отрицательных чисел");
  if (n > 20) throw new Error("Переполнение: n > 20");
  if (n === 0) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function isPrime(n: number): boolean {
  if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function applyDiscount(price: number, discountPercent: number): number {
  if (
    typeof price !== "number" ||
    typeof discountPercent !== "number" ||
    isNaN(price) ||
    isNaN(discountPercent)
  )
    throw new Error("Аргументы должны быть числами");
  if (price < 0) throw new Error("Цена не может быть отрицательной");
  if (discountPercent < 0)
    throw new Error("Скидка не может быть отрицательной");
  if (discountPercent > 100) throw new Error("Скидка не может превышать 100%");
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}

function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year)) throw new Error("Год должен быть целым числом");
  if (year <= 0) throw new Error("Год должен быть положительным");
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function triangleType(
  a: number,
  b: number,
  c: number
): string {
  if ([a, b, c].some((v) => typeof v !== "number" || isNaN(v)))
    throw new Error("Стороны должны быть числами");
  if (a <= 0 || b <= 0 || c <= 0)
    throw new Error("Стороны должны быть положительными");
  if (a + b <= c || a + c <= b || b + c <= a) return "не треугольник";
  if (a === b && b === c) return "равносторонний";
  if (a === b || b === c || a === c) return "равнобедренный";
  return "разносторонний";
}

function toRoman(n: number): string {
  if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
  if (n < 1) throw new Error("Число должно быть больше 0");
  if (n > 3999) throw new Error("Число не должно превышать 3999");
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      result += syms[i];
      n -= vals[i];
    }
  }
  return result;
}

function isValidDate(day: number, month: number, year: number): boolean {
  if ([day, month, year].some(v => typeof v !== "number" || isNaN(v)))
    throw new Error("Аргументы должны быть числами");
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year))
    throw new Error("Аргументы должны быть целыми числами");
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return false;
  return true;
}

function validatePassword(
  password: string
): { valid: boolean; errors: string[] } {
  if (typeof password !== "string")
    throw new Error("Пароль должен быть строкой");
  const errors: string[] = [];
  if (password.length < 8) errors.push("Минимум 8 символов");
  if (!/[A-ZА-ЯЁ]/.test(password)) errors.push("Хотя бы одна заглавная буква");
  if (!/[a-zа-яё]/.test(password)) errors.push("Хотя бы одна строчная буква");
  if (!/[0-9]/.test(password)) errors.push("Хотя бы одна цифра");
  if (
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  )
    errors.push("Хотя бы один спецсимвол");
  return { valid: errors.length === 0, errors };
}

// Helper functions for new tasks
function validatePhone(phone: string): { valid: boolean; errors: string[] } {
  if (typeof phone !== "string") throw new Error("Аргумент должен быть строкой");
  const errors: string[] = [];
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) errors.push("Номер не содержит цифр");
  else if (digits.length < 10) errors.push("Слишком короткий номер (минимум 10 цифр)");
  else if (digits.length > 15) errors.push("Слишком длинный номер (максимум 15 цифр)");
  if (phone.length > 0 && !phone[0].match(/[+\d8]/)) errors.push("Номер должен начинаться с +, цифры или 8");
  if (/[a-zA-Zа-яА-ЯёЁ]/.test(phone)) errors.push("Номер не должен содержать букв");
  return { valid: errors.length === 0, errors };
}

function calculateBMI(weight: number, height: number): { bmi: number; category: string } {
  if (typeof weight !== "number" || typeof height !== "number" || isNaN(weight) || isNaN(height))
    throw new Error("Аргументы должны быть числами");
  if (weight < 20) throw new Error("Вес должен быть не менее 20 кг");
  if (weight > 300) throw new Error("Вес должен быть не более 300 кг");
  if (height < 50) throw new Error("Рост должен быть не менее 50 см");
  if (height > 250) throw new Error("Рост должен быть не более 250 см");
  const heightM = height / 100;
  const bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
  let category: string;
  if (bmi < 18.5) category = "Недостаточный вес";
  else if (bmi < 25) category = "Норма";
  else if (bmi < 30) category = "Избыточный вес";
  else category = "Ожирение";
  return { bmi, category };
}

function parseNumber(str: string): number {
  if (typeof str !== "string") throw new Error("Аргумент должен быть строкой");
  if (str.trim() === "") return NaN;
  const trimmed = str.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    const n = parseInt(trimmed, 16);
    return isNaN(n) ? NaN : n;
  }
  if (trimmed.startsWith("0b") || trimmed.startsWith("0B")) {
    const n = parseInt(trimmed.slice(2), 2);
    return isNaN(n) ? NaN : n;
  }
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? NaN : n;
}

function isPalindrome(str: string): boolean {
  if (typeof str !== "string") throw new Error("Аргумент должен быть строкой");
  const cleaned = str.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
  return cleaned === cleaned.split("").reverse().join("");
}

function validateEmail(email: string): { valid: boolean; errors: string[] } {
  if (typeof email !== "string") throw new Error("Аргумент должен быть строкой");
  const errors: string[] = [];
  if (!email.includes("@")) {
    errors.push("Отсутствует символ @");
  } else if (email.indexOf("@") !== email.lastIndexOf("@")) {
    errors.push("Более одного символа @");
  } else {
    const [local, domain] = email.split("@");
    if (!local || local.length === 0) errors.push("Пустая локальная часть (до @)");
    else if (!/^[a-zA-Z0-9.\-]+$/.test(local)) errors.push("Недопустимые символы в локальной части");
    if (!domain || domain.length === 0) errors.push("Пустая доменная часть (после @)");
    else if (!domain.includes(".")) errors.push("Домен не содержит точку");
    else {
      const parts = domain.split(".");
      const tld = parts[parts.length - 1];
      if (tld.length < 2) errors.push("Домен верхнего уровня слишком короткий (минимум 2 символа)");
      else if (tld.length > 6) errors.push("Домен верхнего уровня слишком длинный (максимум 6 символов)");
      if (!/^[a-zA-Z0-9.\-]+$/.test(domain)) errors.push("Недопустимые символы в домене");
    }
  }
  return { valid: errors.length === 0, errors };
}

function flattenArray(arr: unknown[]): unknown[] {
  if (!Array.isArray(arr)) throw new Error("Аргумент должен быть массивом");
  const flatten = (a: unknown[]): unknown[] =>
    a.reduce((acc: unknown[], v) => acc.concat(Array.isArray(v) ? flatten(v) : [v]), []);
  return flatten(arr);
}

function fibonacci(n: number): number {
  if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
  if (n < 0) throw new Error("Фибоначчи не определён для отрицательных чисел");
  if (n > 75) throw new Error("Переполнение: n > 75");
  if (n === 0) return 0;
  if (n === 1) return 1;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) { const t = a + b; a = b; b = t; }
  return b;
}

function calculateShipping(
  isPremium: boolean,
  orderAmount: number,
  region: string
): { shipping: number; currency: string } {
  if (typeof isPremium !== "boolean") throw new Error("isPremium должен быть булевым");
  if (typeof orderAmount !== "number" || isNaN(orderAmount)) throw new Error("orderAmount должен быть числом");
  if (typeof region !== "string") throw new Error("region должен быть строкой");
  if (orderAmount < 0) throw new Error("Сумма заказа не может быть отрицательной");
  const validRegions = ["local", "national", "international"];
  if (!validRegions.includes(region)) throw new Error("Недопустимый регион");
  let shipping: number;
  if (isPremium && orderAmount >= 1000) {
    shipping = 0;
  } else if (isPremium) {
    shipping = region === "international" ? 200 : 100;
  } else if (orderAmount >= 2000) {
    shipping = region === "international" ? 300 : 0;
  } else if (orderAmount >= 500) {
    shipping = region === "local" ? 100 : region === "national" ? 200 : 400;
  } else {
    shipping = region === "local" ? 200 : region === "national" ? 350 : 500;
  }
  return { shipping, currency: "RUB" };
}

function handleLoginAction(
  action: string,
  currentAttempts: number,
  lockoutTime: number | null
): { status: string; remainingAttempts: number; message: string } {
  const maxAttempts = 3;
  const lockoutDuration = 300;
  if (typeof action !== "string") throw new Error("action должен быть строкой");
  if (!Number.isInteger(currentAttempts) || currentAttempts < 0) throw new Error("currentAttempts должен быть неотрицательным целым");
  if (lockoutTime !== null && (typeof lockoutTime !== "number" || lockoutTime < 0)) throw new Error("lockoutTime должен быть неотрицательным числом или null");
  const now = 0;
  const isLockedOut = lockoutTime !== null && (now - lockoutTime) < lockoutDuration;
  if (action === "login") {
    if (isLockedOut) {
      return { status: "locked", remainingAttempts: 0, message: "Аккаунт заблокирован. Попробуйте позже." };
    }
    const newAttempts = currentAttempts + 1;
    if (newAttempts >= maxAttempts) {
      return { status: "locked", remainingAttempts: 0, message: "Аккаунт заблокирован после 3 неудачных попыток." };
    }
    return { status: "failed", remainingAttempts: maxAttempts - newAttempts, message: `Неверный пароль. Осталось попыток: ${maxAttempts - newAttempts}` };
  }
  if (action === "success") {
    if (isLockedOut) {
      return { status: "locked", remainingAttempts: 0, message: "Аккаунт заблокирован." };
    }
    return { status: "success", remainingAttempts: maxAttempts, message: "Вход выполнен успешно." };
  }
  if (action === "wait") {
    return { status: "unlocked", remainingAttempts: maxAttempts, message: "Блокировка снята. Попытки сброшены." };
  }
  throw new Error("Недопустимое действие");
}

// Map of reference functions
export const referenceFunctions: Record<
  number,
  (args: unknown[]) => unknown
> = {
  1: (args: unknown[]) => factorial(args[0] as number),
  2: (args: unknown[]) => isPrime(args[0] as number),
  3: (args: unknown[]) => applyDiscount(args[0] as number, args[1] as number),
  4: (args: unknown[]) => isLeapYear(args[0] as number),
  5: (args: unknown[]) => triangleType(args[0] as number, args[1] as number, args[2] as number),
  6: (args: unknown[]) => validatePassword(args[0] as string),
  7: (args: unknown[]) => isPalindrome(args[0] as string),
  8: (args: unknown[]) => validateEmail(args[0] as string),
  9: (args: unknown[]) => toRoman(args[0] as number),
  10: (args: unknown[]) => isValidDate(args[0] as number, args[1] as number, args[2] as number),
  11: (args: unknown[]) => validatePhone(args[0] as string),
  12: (args: unknown[]) => calculateBMI(args[0] as number, args[1] as number),
  13: (args: unknown[]) => parseNumber(args[0] as string),
  14: (args: unknown[]) => flattenArray(args[0] as unknown[]),
  15: (args: unknown[]) => fibonacci(args[0] as number),
  16: (args: unknown[]) => calculateShipping(args[0] as boolean, args[1] as number, args[2] as string),
  17: (args: unknown[]) => handleLoginAction(args[0] as string, args[1] as number, args[2] as number | null),
};

export const tasks: Task[] = [
  {
    id: 1,
    name: "Факториал",
    difficulty: "Легко",
    description:
      "Вычисляет факториал целого неотрицательного числа n. Факториал нуля равен 1, для чисел больше 20 происходит переполнение.",
    signature: "factorial(n: number): number",
    topics: ["Классы эквивалентности", "Граничные значения"],
    params: [
      { name: "n", type: "number", description: "Целое неотрицательное число (0–20)" },
    ],
    returnType: "number",
    code: getCode(factorial),
    equivalenceClasses: [
      {
        id: "ec1",
        name: "EC1: n = 0",
        description: "Граничное значение — факториал 0 равен 1",
        exampleValues: [0],
      },
      {
        id: "ec2",
        name: "EC2: 1 ≤ n ≤ 20",
        description: "Нормальные значения",
        exampleValues: [1, 5, 10, 20],
      },
      {
        id: "ec3",
        name: "EC3: n < 0",
        description: "Недопустимые — ошибка",
        exampleValues: [-1, -5],
      },
      {
        id: "ec4",
        name: "EC4: n > 20",
        description: "Переполнение",
        exampleValues: [21, 100],
      },
      {
        id: "ec5",
        name: "EC5: n — не число",
        description: "Недопустимый тип",
        exampleValues: [1.5, "abc", null],
      },
    ],
    boundaryValues: [
      { value: 0, description: "Нижняя граница (факториал = 1)" },
      { value: 1, description: "Минимальное положительное" },
      { value: 19, description: "Предпоследнее допустимое" },
      { value: 20, description: "Верхняя граница допустимых" },
      { value: 21, description: "Переполнение" },
      { value: -1, description: "Первая недопустимая" },
    ],
    commonMistakes: [
      "Студенты часто забывают проверить n = 0 — граничный случай, где факториал равен 1",
      "Пропускают проверку дробных чисел (например, 3.5) — функция должна выбросить ошибку",
      "Тестируют только положительные значения, забывая про отрицательные и превышающие 20",
    ],
  },
  {
    id: 2,
    name: "Простое число",
    difficulty: "Средне",
    description:
      "Проверяет, является ли целое число n простым. Простое число — это натуральное число больше 1, которое делится только на 1 и на себя.",
    signature: "isPrime(n: number): boolean",
    topics: ["Классы эквивалентности", "Граничные значения", "Нелинейные классы"],
    params: [
      { name: "n", type: "number", description: "Целое число для проверки" },
    ],
    returnType: "boolean",
    code: getCode(isPrime),
    equivalenceClasses: [
      {
        id: "ec1",
        name: "EC1: n ≤ 1",
        description: "Недопустимые — не являются простыми",
        exampleValues: [0, 1, -3],
      },
      {
        id: "ec2",
        name: "EC2: n = 2",
        description: "Единственное чётное простое число",
        exampleValues: [2],
      },
      {
        id: "ec3",
        name: "EC3: Простое нечётное",
        description: "Нечётные простые числа",
        exampleValues: [3, 5, 7, 11, 13],
      },
      {
        id: "ec4",
        name: "EC4: Составное число",
        description: "Числа, которые не являются простыми",
        exampleValues: [4, 6, 8, 9, 10],
      },
      {
        id: "ec5",
        name: "EC5: Большое число",
        description: "Проверка на больших значениях",
        exampleValues: [997, 1000, 7919],
      },
      {
        id: "ec6",
        name: "EC6: n — не число",
        description: "Недопустимый тип",
        exampleValues: [1.5, "abc", null],
      },
    ],
    boundaryValues: [
      { value: 0, description: "Нижняя граница" },
      { value: 1, description: "Не простое" },
      { value: 2, description: "Наименьшее простое" },
      { value: 3, description: "Наименьшее нечётное простое" },
      { value: 4, description: "Наименьшее составное" },
    ],
    commonMistakes: [
      "Часто забывают, что 1 — не простое число (должно вернуть false)",
      "Пропускают проверку n = 2 — единственное чётное простое число",
      "Не тестируют дробные числа и нечисловые аргументы",
    ],
  },
  {
    id: 3,
    name: "Калькулятор скидки",
    difficulty: "Средне",
    description:
      "Применяет скидку к цене. Принимает цену и процент скидки, возвращает итоговую сумму со скидкой. Скидка округляется до 2 знаков.",
    signature: "applyDiscount(price: number, discountPercent: number): number",
    topics: [
      "Классы эквивалентности",
      "Граничные значения",
      "Многофакторное тестирование",
    ],
    params: [
      { name: "price", type: "number", description: "Цена товара (>= 0)" },
      {
        name: "discountPercent",
        type: "number",
        description: "Процент скидки (0–100)",
      },
    ],
    returnType: "number",
    code: getCode(applyDiscount),
    equivalenceClasses: [
      {
        id: "ec1",
        name: "EC1: Без скидки",
        description: "price >= 0, discountPercent = 0",
        exampleValues: [[100, 0]],
      },
      {
        id: "ec2",
        name: "EC2: Частичная скидка",
        description: "price >= 0, 0 < discountPercent < 100",
        exampleValues: [[100, 25], [500, 50]],
      },
      {
        id: "ec3",
        name: "EC3: Бесплатно",
        description: "price >= 0, discountPercent = 100",
        exampleValues: [[100, 100]],
      },
      {
        id: "ec4",
        name: "EC4: price = 0",
        description: "Нулевая цена",
        exampleValues: [[0, 50]],
      },
      {
        id: "ec5",
        name: "EC5: price < 0",
        description: "Недопустимая цена",
        exampleValues: [[-100, 10]],
      },
      {
        id: "ec6",
        name: "EC6: discountPercent < 0",
        description: "Отрицательная скидка",
        exampleValues: [[100, -10]],
      },
      {
        id: "ec7",
        name: "EC7: discountPercent > 100",
        description: "Скидка больше 100%",
        exampleValues: [[100, 150]],
      },
      {
        id: "ec8",
        name: "EC8: Нечисловые аргументы",
        description: "Неверный тип аргументов",
        exampleValues: [["abc", 10], [100, "abc"]],
      },
    ],
    boundaryValues: [
      { value: [0.01, 0], description: "Минимальная цена, без скидки" },
      { value: [0, 0], description: "Нулевая цена" },
      { value: [100, 0], description: "Скидка 0%" },
      { value: [100, 1], description: "Минимальная скидка" },
      { value: [100, 99], description: "Максимальная частичная скидка" },
      { value: [100, 100], description: "Полная скидка" },
      { value: [100, 101], description: "Скидка > 100%" },
    ],
    commonMistakes: [
      "Забывают проверить price = 0 — нулевая цена допустима, результат должен быть 0",
      "Не тестируют комбинации: отрицательная цена И отрицательная скидка одновременно",
      "Пропускают проверку discountPercent = 100 — товар должен стать бесплатным",
    ],
  },
  {
    id: 4,
    name: "Високосный год",
    difficulty: "Легко",
    description:
      "Проверяет, является ли год високосным. Год високосный, если он делится на 4, но не на 100, за исключением годов, делящихся на 400.",
    signature: "isLeapYear(year: number): boolean",
    topics: ["Классы эквивалентности", "Граничные значения", "Логические условия"],
    params: [
      { name: "year", type: "number", description: "Год (положительное целое число)" },
    ],
    returnType: "boolean",
    code: getCode(isLeapYear),
    equivalenceClasses: [
      {
        id: "ec1",
        name: "EC1: Делится на 400",
        description: "Високосный год (правило 400)",
        exampleValues: [1600, 2000, 2400],
      },
      {
        id: "ec2",
        name: "EC2: Делится на 100, но не на 400",
        description: "Не високосный год (исключение 100)",
        exampleValues: [1700, 1800, 1900, 2100],
      },
      {
        id: "ec3",
        name: "EC3: Делится на 4, но не на 100",
        description: "Високосный год (правило 4)",
        exampleValues: [2004, 2008, 2024, 2028],
      },
      {
        id: "ec4",
        name: "EC4: Не делится на 4",
        description: "Обычный год",
        exampleValues: [2023, 2025, 2026],
      },
      {
        id: "ec5",
        name: "EC5: year ≤ 0",
        description: "Недопустимое значение",
        exampleValues: [0, -1, -100],
      },
      {
        id: "ec6",
        name: "EC6: Нечисловой аргумент",
        description: "Недопустимый тип",
        exampleValues: [1.5, "2024", null],
      },
    ],
    boundaryValues: [
      { value: 1600, description: "Високосный (÷400)" },
      { value: 1700, description: "Не високосный (÷100, не ÷400)" },
      { value: 2000, description: "Високосный (÷400)" },
      { value: 2004, description: "Високосный (÷4, не ÷100)" },
      { value: 2024, description: "Високосный (÷4, не ÷100)" },
      { value: 2025, description: "Не високосный" },
      { value: 2100, description: "Не високосный (÷100, не ÷400)" },
    ],
    commonMistakes: [
      "Часто думают, что любой год, делящийся на 4 — високосный, забывая про правило 100/400",
      "Не тестируют годы типа 1900 или 2100 (делятся на 100, но не на 400 — не високосные)",
      "Пропускают проверку year = 1 — минимальный допустимый год",
    ],
  },
  {
    id: 5,
    name: "Треугольник",
    difficulty: "Сложно",
    description:
      "Определяет тип треугольника по трём сторонам. Возвращает «равносторонний», «равнобедренный», «разносторонний» или «не треугольник».",
    signature: "triangleType(a: number, b: number, c: number): string",
    topics: [
      "Классы эквивалентности",
      "Граничные значения",
      "Комбинаторное тестирование",
    ],
    params: [
      { name: "a", type: "number", description: "Первая сторона" },
      { name: "b", type: "number", description: "Вторая сторона" },
      { name: "c", type: "number", description: "Третья сторона" },
    ],
    returnType: "string",
    code: getCode(triangleType),
    equivalenceClasses: [
      {
        id: "ec1",
        name: "EC1: Равносторонний",
        description: "Все три стороны равны",
        exampleValues: [[3, 3, 3], [5, 5, 5]],
      },
      {
        id: "ec2",
        name: "EC2: Равнобедренный",
        description: "Две стороны равны",
        exampleValues: [[2, 2, 3], [5, 5, 8]],
      },
      {
        id: "ec3",
        name: "EC3: Разносторонний",
        description: "Все стороны разные",
        exampleValues: [[3, 4, 5], [5, 7, 9]],
      },
      {
        id: "ec4",
        name: "EC4: Не треугольник",
        description: "Не выполняется неравенство треугольника",
        exampleValues: [[1, 1, 3], [1, 2, 10]],
      },
      {
        id: "ec5",
        name: "EC5: Сторона ≤ 0",
        description: "Недопустимые значения",
        exampleValues: [[-1, 2, 3], [0, 0, 0]],
      },
      {
        id: "ec6",
        name: "EC6: Вырожденный",
        description: "Сумма двух сторон равна третьей",
        exampleValues: [[1, 2, 3], [2, 3, 5]],
      },
      {
        id: "ec7",
        name: "EC7: Нечисловые аргументы",
        description: "Неверный тип аргументов",
        exampleValues: [["a", 2, 3], [1, null, 3]],
      },
    ],
    boundaryValues: [
      { value: [1, 1, 1], description: "Равносторонний" },
      { value: [2, 2, 3], description: "Равнобедренный" },
      { value: [3, 4, 5], description: "Разносторонний" },
      { value: [1, 2, 3], description: "Вырожденный (не треугольник)" },
      { value: [1, 1, 3], description: "Не треугольник" },
    ],
    commonMistakes: [
      "Забывают проверить вырожденный треугольник (a + b = c) — это «не треугольник»",
      "Не тестируют случай, когда только две стороны равны (равнобедренный, но не равносторонний)",
      "Пропускают проверку с нулевыми или отрицательными сторонами",
    ],
  },
  {
    id: 6,
    name: "Валидация пароля",
    difficulty: "Сложно",
    description:
      "Проверяет пароль на соответствие требованиям безопасности: минимум 8 символов, хотя бы одна заглавная и одна строчная буква, хотя бы одна цифра и один спецсимвол.",
    signature:
      "validatePassword(password: string): { valid: boolean; errors: string[] }",
    topics: [
      "Классы эквивалентности",
      "Комбинаторное тестирование",
      "Проверка форматов",
    ],
    params: [
      {
        name: "password",
        type: "string",
        description: "Пароль для валидации",
      },
    ],
    returnType: "{ valid: boolean; errors: string[] }",
    code: getCode(validatePassword),
    equivalenceClasses: [
      {
        id: "ec1",
        name: "EC1: Валидный пароль",
        description: "Соответствует всем требованиям",
        exampleValues: ["Abc123!@", "MyPass99#"],
      },
      {
        id: "ec2",
        name: "EC2: Длина < 8",
        description: "Слишком короткий",
        exampleValues: ["Ab1!", "A1!a"],
      },
      {
        id: "ec3",
        name: "EC3: Нет заглавных",
        description: "Отсутствуют заглавные буквы",
        exampleValues: ["abcdef12!"],
      },
      {
        id: "ec4",
        name: "EC4: Нет строчных",
        description: "Отсутствуют строчные буквы",
        exampleValues: ["ABCDEF12!"],
      },
      {
        id: "ec5",
        name: "EC5: Нет цифр",
        description: "Отсутствуют цифры",
        exampleValues: ["Abcdefgh!"],
      },
      {
        id: "ec6",
        name: "EC6: Нет спецсимволов",
        description: "Отсутствуют спецсимволы",
        exampleValues: ["Abcdef12"],
      },
      {
        id: "ec7",
        name: "EC7: Комбинации нарушений",
        description: "Несколько нарушений одновременно",
        exampleValues: ["abc", "ABC", "12345678"],
      },
      {
        id: "ec8",
        name: "EC8: Пустая строка",
        description: "Пустой пароль",
        exampleValues: [""],
      },
      {
        id: "ec9",
        name: "EC9: Не строковый тип",
        description: "Неверный тип",
        exampleValues: [123, null, undefined],
      },
    ],
    boundaryValues: [
      { value: "Abcdefg1!", description: "Минимальный валидный (8 символов)" },
      { value: "Abcdef1!", description: "7 символов (недостаточно)" },
      { value: "", description: "Пустая строка" },
      { value: "ABCDEFG1!", description: "Нет строчных" },
      { value: "abcdefg1!", description: "Нет заглавных" },
      { value: "Abcdefgh!", description: "Нет цифр" },
      { value: "Abcdefg12", description: "Нет спецсимволов" },
    ],
    commonMistakes: [
      "Тестируют каждый критерий отдельно, забывая про комбинации нарушений (например, «abc» нарушает сразу 4 правила)",
      "Не проверяют кириллические буквы — функция поддерживает и русские заглавные/строчные",
      "Пропускают проверку нестроковых типов (null, undefined, число)",
    ],
  },
  {
    id: 7,
    name: "Палиндром",
    difficulty: "Средне",
    description: "Функция проверяет, является ли строка палиндромом (читается одинаково слева направо и справа налево). Учитываются только буквы и цифры, регистр игнорируется. Пустая строка считается палиндромом.",
    signature: "isPalindrome(str: string): boolean",
    topics: ["Классы эквивалентности", "Граничные значения", "Обработка строк"],
    params: [
      { name: "str", type: "string", description: "Проверяемая строка" }
    ],
    returnType: "boolean",
    code: getCode(isPalindrome),
    equivalenceClasses: [
      { id: "ec1", name: "EC1: Палиндром (латиница)", description: "Строка-палиндром из латинских букв", exampleValues: ["aba", "racecar"] },
      { id: "ec2", name: "EC2: Палиндром (кириллица)", description: "Строка-палиндром из русских букв", exampleValues: ["Анна", "казак"] },
      { id: "ec3", name: "EC3: Не палиндром", description: "Строка, не являющаяся палиндромом", exampleValues: ["hello", "тест"] },
      { id: "ec4", name: "EC4: Палиндром с пробелами/знаками", description: "Палиндром с пробелами, знаками препинания или цифрами", exampleValues: ["A man a plan a canal Panama", "12321", "Madam, I'm Adam"] },
      { id: "ec5", name: "EC5: Пустая строка", description: "Пустая строка (считается палиндромом)", exampleValues: [""] },
      { id: "ec6", name: "EC6: Один символ", description: "Строка из одного символа (всегда палиндром)", exampleValues: ["a", "Я"] },
      { id: "ec7", name: "EC7: Недопустимый тип", description: "Аргумент не является строкой", exampleValues: [123, null] },
    ],
    boundaryValues: [
      { value: "", description: "Пустая строка (нижняя граница длины)" },
      { value: "a", description: "Один символ (минимальная длина)" },
      { value: "aa", description: "Два одинаковых символа" },
      { value: "ab", description: "Два разных символа (минимальный не-палиндром)" },
      { value: "A", description: "Один символ, верхний регистр" },
      { value: "a b a", description: "Палиндром с пробелом" },
      { value: "12321", description: "Числовой палиндром" },
    ],
    commonMistakes: [
      "Забывают, что пустая строка считается палиндромом",
      "Не проверяют палиндромы с пробелами и знаками препинания («A man, a plan, a canal: Panama»)",
      "Не тестируют кириллические палиндромы («Анна», «казак»)",
    ],
  },
  {
    id: 8,
    name: "Валидация email",
    difficulty: "Сложно",
    description: "Функция проверяет корректность email-адреса по следующим правилам: содержит ровно один символ @, локальная часть (до @) не пустая и содержит только буквы, цифры, точки и дефисы, доменная часть (после @) содержит хотя бы одну точку, домен верхнего уровня — от 2 до 6 букв.",
    signature: "validateEmail(email: string): { valid: boolean; errors: string[] }",
    topics: ["Классы эквивалентности", "Граничные значения", "Комбинаторное тестирование", "Формат проверок"],
    params: [
      { name: "email", type: "string", description: "Проверяемый email-адрес" }
    ],
    returnType: "{ valid: boolean; errors: string[] }",
    code: `function validateEmail(email: string): { valid: boolean; errors: string[] } {
  if (typeof email !== "string") {
    throw new Error("Аргумент должен быть строкой");
  }
  const errors: string[] = [];

  if (!email.includes("@")) {
    errors.push("Отсутствует символ @");
  } else if (email.indexOf("@") !== email.lastIndexOf("@")) {
    errors.push("Более одного символа @");
  } else {
    const [local, domain] = email.split("@");
    if (!local || local.length === 0) {
      errors.push("Пустая локальная часть (до @)");
    } else if (!/^[a-zA-Z0-9.\-]+$/.test(local)) {
      errors.push("Недопустимые символы в локальной части");
    }
    if (!domain || domain.length === 0) {
      errors.push("Пустая доменная часть (после @)");
    } else if (!domain.includes(".")) {
      errors.push("Домен не содержит точку");
    } else {
      const parts = domain.split(".");
      const tld = parts[parts.length - 1];
      if (tld.length < 2) {
        errors.push("Домен верхнего уровня слишком короткий (минимум 2 символа)");
      } else if (tld.length > 6) {
        errors.push("Домен верхнего уровня слишком длинный (максимум 6 символов)");
      }
      if (!/^[a-zA-Z0-9.\-]+$/.test(domain)) {
        errors.push("Недопустимые символы в домене");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}`,
    equivalenceClasses: [
      { id: "ec1", name: "EC1: Валидный email", description: "Корректный email-адрес", exampleValues: ["user@example.com", "test.name@domain.org"] },
      { id: "ec2", name: "EC2: Нет символа @", description: "Строка без символа @", exampleValues: ["userexample.com", "plaintext"] },
      { id: "ec3", name: "EC3: Несколько символов @", description: "Более одного @ в строке", exampleValues: ["user@@example.com", "a@b@c.com"] },
      { id: "ec4", name: "EC4: Пустая локальная часть", description: "Локальная часть до @ пустая", exampleValues: ["@example.com"] },
      { id: "ec5", name: "EC5: Недопустимые символы в локальной части", description: "Локальная часть содержит недопустимые символы", exampleValues: ["user name@test.com", "user+tag@test.com"] },
      { id: "ec6", name: "EC6: Пустая доменная часть", description: "Доменная часть после @ пустая", exampleValues: ["user@"] },
      { id: "ec7", name: "EC7: Домен без точки", description: "Домен не содержит точки", exampleValues: ["user@localhost", "user@example"] },
      { id: "ec8", name: "EC8: Слишком короткий TLD", description: "Домен верхнего уровня менее 2 символов", exampleValues: ["user@example.c", "user@example.a"] },
      { id: "ec9", name: "EC9: Слишком длинный TLD", description: "Домен верхнего уровня более 6 символов", exampleValues: ["user@example.abcdefg"] },
      { id: "ec10", name: "EC10: Пустая строка", description: "Пустая строка вместо email", exampleValues: [""] },
      { id: "ec11", name: "EC11: Недопустимый тип", description: "Аргумент не является строкой", exampleValues: [123, null, undefined] },
    ],
    boundaryValues: [
      { value: "a@b.cd", description: "Минимально возможный валидный email" },
      { value: "a@b.c", description: "TLD из 1 символа (слишком короткий)" },
      { value: "a@b.cdefgh", description: "TLD из 6 символов (максимальный)" },
      { value: "a@b.cdefghi", description: "TLD из 7 символов (слишком длинный)" },
      { value: "@example.com", description: "Пустая локальная часть" },
      { value: "user@", description: "Пустая доменная часть" },
      { value: "a b@example.com", description: "Пробел в локальной части" },
      { value: "", description: "Пустая строка" },
    ],
    commonMistakes: [
      "Не проверяют минимальный валидный email (a@b.cd) — важно для понимания границ формата",
      "Забывают про TLD длиной 1 символ и 7+ символов — типичные пограничные случаи",
      "Не тестируют комбинации: несколько @, пробелы, спецсимволы в локальной части",
    ],
  },
  {
    id: 9,
    name: "Римские цифры",
    difficulty: "Средне",
    description:
      "Преобразует целое число в строку римских цифр. Поддерживает числа от 1 до 3999. Для некорректных входных данных выбрасывает исключение.",
    signature: "toRoman(n: number): string",
    topics: ["Классы эквивалентности", "Граничные значения", "Обработка строк"],
    params: [
      { name: "n", type: "number", description: "Целое число от 1 до 3999" },
    ],
    returnType: "string",
    code: `function toRoman(n: number): string {
  if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
  if (n < 1) throw new Error("Число должно быть больше 0");
  if (n > 3999) throw new Error("Число не должно превышать 3999");
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      result += syms[i];
      n -= vals[i];
    }
  }
  return result;
}`,
    equivalenceClasses: [
      {
        id: "ec1",
        name: "EC1: n = 1",
        description: "Минимальное значение",
        exampleValues: [1],
      },
      {
        id: "ec2",
        name: "EC2: 2 ≤ n ≤ 3998",
        description: "Нормальные значения",
        exampleValues: [2, 5, 42, 3998],
      },
      {
        id: "ec3",
        name: "EC3: n = 3999",
        description: "Максимальное значение",
        exampleValues: [3999],
      },
      {
        id: "ec4",
        name: "EC4: n < 1",
        description: "Недопустимые — слишком маленькое",
        exampleValues: [0, -5],
      },
      {
        id: "ec5",
        name: "EC5: n > 3999",
        description: "Недопустимые — слишком большое",
        exampleValues: [4000, 5000],
      },
      {
        id: "ec6",
        name: "EC6: n — не целое число",
        description: "Недопустимый тип",
        exampleValues: [1.5, "abc", null],
      },
    ],
    boundaryValues: [
      { value: 1, description: "Минимальное число (I)" },
      { value: 4, description: "IV — специальный символ вычитания" },
      { value: 5, description: "V — базовый символ" },
      { value: 9, description: "IX — вычитание" },
      { value: 10, description: "X — базовый символ" },
      { value: 3999, description: "Максимальное число (MMMCMXCIX)" },
      { value: 4000, description: "Превышение максимума" },
      { value: 0, description: "Ниже минимума" },
    ],
    commonMistakes: [
      "Забывают проверить специальные вычитающие комбинации: 4 (IV), 9 (IX), 40 (XL), 90 (XC), 400 (CD), 900 (CM)",
      "Не тестируют граничные значения 1 и 3999 — минимум и максимум диапазона",
      "Пропускают дробные числа — функция должна выбросить ошибку",
    ],
  },
  {
    id: 10,
    name: "Валидация даты",
    difficulty: "Сложно",
    description:
      "Проверяет, является ли заданная дата корректной с учётом високосных годов, количества дней в месяцах и т.д. Принимает день, месяц и год.",
    signature: "isValidDate(day: number, month: number, year: number): boolean",
    topics: [
      "Классы эквивалентности",
      "Граничные значения",
      "Комбинаторное тестирование",
      "Логические условия",
    ],
    params: [
      { name: "day", type: "number", description: "День (1-31)" },
      { name: "month", type: "number", description: "Месяц (1-12)" },
      { name: "year", type: "number", description: "Год" },
    ],
    returnType: "boolean",
    code: `function isValidDate(day: number, month: number, year: number): boolean {
  if ([day, month, year].some(v => typeof v !== "number" || isNaN(v)))
    throw new Error("Аргументы должны быть числами");
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year))
    throw new Error("Аргументы должны быть целыми числами");
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return false;
  return true;
}`,
    equivalenceClasses: [
      {
        id: "ec1",
        name: "EC1: Валидная дата (обычный год)",
        description: "Корректная дата в обычном году",
        exampleValues: [[15, 6, 2023], [1, 1, 2000]],
      },
      {
        id: "ec2",
        name: "EC2: Валидная дата (високосный год, 29 февраля)",
        description: "29 февраля в високосный год",
        exampleValues: [[29, 2, 2024], [29, 2, 2000]],
      },
      {
        id: "ec3",
        name: "EC3: Невалидный день (слишком большой)",
        description: "День превышает количество дней в месяце",
        exampleValues: [[31, 4, 2023], [32, 1, 2023]],
      },
      {
        id: "ec4",
        name: "EC4: Невалидный день (29 февраля не в високосный)",
        description: "29 февраля в обычный год",
        exampleValues: [[29, 2, 2023], [29, 2, 1900]],
      },
      {
        id: "ec5",
        name: "EC5: Невалидный месяц (< 1 или > 12)",
        description: "Месяц вне допустимого диапазона",
        exampleValues: [[1, 0, 2023], [1, 13, 2023]],
      },
      {
        id: "ec6",
        name: "EC6: Невалидный день (day < 1)",
        description: "День меньше 1",
        exampleValues: [[0, 1, 2023], [-5, 6, 2023]],
      },
      {
        id: "ec7",
        name: "EC7: Граничные дни месяца (30, 31)",
        description: "Дни на границе количества дней в месяце",
        exampleValues: [[30, 6, 2023], [31, 12, 2023]],
      },
      {
        id: "ec8",
        name: "EC8: Нечисловые аргументы",
        description: "Неверный тип аргументов",
        exampleValues: [["a", 1, 2023], [1, null, 2023]],
      },
    ],
    boundaryValues: [
      { value: [1, 1, 2023], description: "Минимальные day и month" },
      { value: [31, 12, 2023], description: "Максимальные day и month" },
      { value: [29, 2, 2024], description: "29 февраля в високосный год" },
      { value: [29, 2, 2023], description: "29 февраля в невисокосный год" },
      { value: [28, 2, 2023], description: "28 февраля (максимум в невисокосный)" },
      { value: [30, 2, 2023], description: "30 февраля (невалидно)" },
      { value: [31, 4, 2023], description: "31 апреля (невалидно)" },
      { value: [0, 1, 2023], description: "День = 0" },
      { value: [1, 13, 2023], description: "Месяц > 12" },
      { value: [1, 0, 2023], description: "Месяц < 1" },
    ],
    commonMistakes: [
      "Забывают проверить 29 февраля в високосный и невисокосный год — критичная разница",
      "Не тестируют месяцы с разным количеством дней: 30 дней (апрель, июнь) vs 31",
      "Пропускают комбинации параметров — например, валидный день для одного месяца, но не для другого",
    ],
  },
  {
    id: 11,
    name: "Валидация телефона",
    difficulty: "Средне",
    description:
      "Проверяет корректность номера телефона. Поддерживает форматы: +7XXXXXXXXXX, 8XXXXXXXXXX, +X-XXX-XXX-XX-XX. Номер должен содержать 10-15 цифр, может начинаться с + или 8.",
    signature: "validatePhone(phone: string): { valid: boolean; errors: string[] }",
    topics: ["Классы эквивалентности", "Граничные значения", "Проверка форматов"],
    params: [
      { name: "phone", type: "string", description: "Номер телефона для проверки" },
    ],
    returnType: "{ valid: boolean; errors: string[] }",
    code: `function validatePhone(phone: string): { valid: boolean; errors: string[] } {
  if (typeof phone !== "string") throw new Error("Аргумент должен быть строкой");
  const errors: string[] = [];
  const digits = phone.replace(/\\D/g, "");
  if (digits.length === 0) errors.push("Номер не содержит цифр");
  else if (digits.length < 10) errors.push("Слишком короткий номер (минимум 10 цифр)");
  else if (digits.length > 15) errors.push("Слишком длинный номер (максимум 15 цифр)");
  if (phone.length > 0 && !phone[0].match(/[+\\d8]/)) errors.push("Номер должен начинаться с +, цифры или 8");
  if (/[a-zA-Zа-яА-ЯёЁ]/.test(phone)) errors.push("Номер не должен содержать букв");
  return { valid: errors.length === 0, errors };
}`,
    equivalenceClasses: [
      { id: "ec1", name: "EC1: Валидный формат +7", description: "Корректный номер с +7", exampleValues: ["+79991234567", "+7-999-123-45-67"] },
      { id: "ec2", name: "EC2: Валидный формат 8", description: "Корректный номер с 8", exampleValues: ["89991234567", "8-999-123-45-67"] },
      { id: "ec3", name: "EC3: Валидный международный", description: "Международный формат с другим кодом", exampleValues: ["+1-555-123-4567", "+44-20-7946-0958"] },
      { id: "ec4", name: "EC4: Слишком короткий", description: "Менее 10 цифр", exampleValues: ["123456789", "+7123"] },
      { id: "ec5", name: "EC5: Слишком длинный", description: "Более 15 цифр", exampleValues: ["+71234567890123456"] },
      { id: "ec6", name: "EC6: Содержит буквы", description: "Номер с буквами", exampleValues: ["+7abc1234567", "phone"] },
      { id: "ec7", name: "EC7: Пустая строка", description: "Пустой номер", exampleValues: [""] },
      { id: "ec8", name: "EC8: Не строковый тип", description: "Неверный тип", exampleValues: [123, null] },
    ],
    boundaryValues: [
      { value: "+79991234567", description: "Минимальный валидный (10 цифр, +7)" },
      { value: "+7123456789012345", description: "Максимальный валидный (15 цифр)" },
      { value: "123456789", description: "9 цифр (слишком короткий)" },
      { value: "+71234567890123456", description: "16 цифр (слишком длинный)" },
      { value: "", description: "Пустая строка" },
      { value: "+7abc", description: "Содержит буквы" },
    ],
    commonMistakes: [
      "Забывают проверить ровно 10 цифр (нижняя граница) и ровно 15 (верхняя)",
      "Не тестируют разные форматы: с дефисами (+7-999-123-45-67) и без (+79991234567)",
      "Пропускают проверку, что номер не должен содержать буквы",
    ],
  },
  {
    id: 12,
    name: "Калькулятор ИМТ",
    difficulty: "Средне",
    description:
      "Вычисляет индекс массы тела (ИМТ) по весу и росту. Возвращает числовое значение и категорию: недостаточный вес (< 18.5), норма (18.5–24.9), избыточный (25–29.9), ожирение (≥ 30).",
    signature: "calculateBMI(weight: number, height: number): { bmi: number; category: string }",
    topics: ["Классы эквивалентности", "Граничные значения", "Многофакторное тестирование"],
    params: [
      { name: "weight", type: "number", description: "Вес в кг (20–300)" },
      { name: "height", type: "number", description: "Рост в см (50–250)" },
    ],
    returnType: "{ bmi: number; category: string }",
    code: `function calculateBMI(weight: number, height: number): { bmi: number; category: string } {
  if (typeof weight !== "number" || typeof height !== "number" || isNaN(weight) || isNaN(height))
    throw new Error("Аргументы должны быть числами");
  if (weight < 20) throw new Error("Вес должен быть не менее 20 кг");
  if (weight > 300) throw new Error("Вес должен быть не более 300 кг");
  if (height < 50) throw new Error("Рост должен быть не менее 50 см");
  if (height > 250) throw new Error("Рост должен быть не более 250 см");
  const heightM = height / 100;
  const bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
  let category: string;
  if (bmi < 18.5) category = "Недостаточный вес";
  else if (bmi < 25) category = "Норма";
  else if (bmi < 30) category = "Избыточный вес";
  else category = "Ожирение";
  return { bmi, category };
}`,
    equivalenceClasses: [
      { id: "ec1", name: "EC1: Недостаточный вес", description: "ИМТ < 18.5", exampleValues: [[45, 170], [50, 180]] },
      { id: "ec2", name: "EC2: Норма", description: "18.5 ≤ ИМТ < 25", exampleValues: [[65, 170], [70, 175]] },
      { id: "ec3", name: "EC3: Избыточный вес", description: "25 ≤ ИМТ < 30", exampleValues: [[85, 170], [90, 175]] },
      { id: "ec4", name: "EC4: Ожирение", description: "ИМТ ≥ 30", exampleValues: [[110, 170], [120, 165]] },
      { id: "ec5", name: "EC5: Вес < 20", description: "Недопустимый вес", exampleValues: [[15, 170], [0, 170]] },
      { id: "ec6", name: "EC6: Вес > 300", description: "Слишком большой вес", exampleValues: [[350, 170]] },
      { id: "ec7", name: "EC7: Рост < 50", description: "Недопустимый рост", exampleValues: [[70, 30], [70, 0]] },
      { id: "ec8", name: "EC8: Рост > 250", description: "Слишком большой рост", exampleValues: [[70, 300]] },
      { id: "ec9", name: "EC9: Нечисловые аргументы", description: "Неверный тип", exampleValues: [["70", "170"], [null, null]] },
    ],
    boundaryValues: [
      { value: [53.5, 170], description: "ИМТ ≈ 18.5 (граница недостаточного веса и нормы)" },
      { value: [72.3, 170], description: "ИМТ ≈ 25 (граница нормы и избыточного веса)" },
      { value: [86.7, 170], description: "ИМТ ≈ 30 (граница избыточного веса и ожирения)" },
      { value: [20, 170], description: "Минимальный вес" },
      { value: [300, 170], description: "Максимальный вес" },
      { value: [70, 50], description: "Минимальный рост" },
      { value: [70, 250], description: "Максимальный рост" },
    ],
    commonMistakes: [
      "Не проверяют граничные значения ИМТ: 18.5, 25, 30 — переходы между категориями",
      "Забывают проверить минимальный/максимальный вес и рост — функция выбрасывает ошибку за пределами диапазона",
      "Тестируют только один параметр, не варьируя второй (weight и height нужно комбинировать)",
    ],
  },
  {
    id: 13,
    name: "Строка в число",
    difficulty: "Легко",
    description:
      "Преобразует строку в целое число. Поддерживает десятичные, шестнадцатеричные (0x...) и двоичные (0b...) форматы. Для некорректных входных данных возвращает NaN.",
    signature: "parseNumber(str: string): number",
    topics: ["Классы эквивалентности", "Граничные значения", "Обработка строк"],
    params: [
      { name: "str", type: "string", description: "Строка для преобразования" },
    ],
    returnType: "number",
    code: `function parseNumber(str: string): number {
  if (typeof str !== "string") throw new Error("Аргумент должен быть строкой");
  if (str.trim() === "") return NaN;
  const trimmed = str.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    const n = parseInt(trimmed, 16);
    return isNaN(n) ? NaN : n;
  }
  if (trimmed.startsWith("0b") || trimmed.startsWith("0B")) {
    const n = parseInt(trimmed.slice(2), 2);
    return isNaN(n) ? NaN : n;
  }
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? NaN : n;
}`,
    equivalenceClasses: [
      { id: "ec1", name: "EC1: Десятичное число", description: "Обычное десятичное число", exampleValues: ["42", "-17", "0"] },
      { id: "ec2", name: "EC2: Шестнадцатеричное", description: "Формат 0x...", exampleValues: ["0xFF", "0x1A", "0XAB"] },
      { id: "ec3", name: "EC3: Двоичное", description: "Формат 0b...", exampleValues: ["0b1010", "0B1111"] },
      { id: "ec4", name: "EC4: С пробелами", description: "Число с ведущими/завершающими пробелами", exampleValues: ["  42  ", "  0xFF "] },
      { id: "ec5", name: "EC5: Пустая строка", description: "Пустая или только пробелы", exampleValues: ["", "   "] },
      { id: "ec6", name: "EC6: Не число", description: "Строка, не являющаяся числом ни в одном формате", exampleValues: ["abc", "xyz", "!@#"] },
      { id: "ec7", name: "EC7: Не строковый тип", description: "Неверный тип", exampleValues: [42, null, undefined] },
    ],
    boundaryValues: [
      { value: "0", description: "Ноль" },
      { value: "-1", description: "Отрицательная единица" },
      { value: "0xFF", description: "Максимальное однобайтное (255)" },
      { value: "0b0", description: "Двоичный ноль" },
      { value: "", description: "Пустая строка (NaN)" },
      { value: "   ", description: "Только пробелы (NaN)" },
      { value: "abc", description: "Не число (NaN)" },
    ],
    commonMistakes: [
      "Забывают, что строка из пробелов должна вернуть NaN, а не 0",
      "Не проверяют строки с ведущими/завершающими пробелами вокруг валидного числа",
      "Не тестируют нестроковые типы — функция должна выбросить ошибку",
    ],
  },
  {
    id: 14,
    name: "Распаковка массива",
    difficulty: "Средне",
    description:
      "Рекурсивно распаковывает вложенный массив в плоский. Каждый элемент, который является массивом, раскрывается на всех уровнях вложенности.",
    signature: "flattenArray(arr: unknown[]): unknown[]",
    topics: ["Классы эквивалентности", "Граничные значения", "Рекурсия"],
    params: [
      { name: "arr", type: "array", description: "Вложенный массив" },
    ],
    returnType: "unknown[]",
    code: `function flattenArray(arr: unknown[]): unknown[] {
  const flatten = (a: unknown[]): unknown[] =>
    a.reduce(
      (acc, v) => acc.concat(Array.isArray(v) ? flatten(v) : [v]),
      []
    );
  return flatten(arr);
}`,
    equivalenceClasses: [
      { id: "ec1", name: "EC1: Пустой массив", description: "Пустой массив", exampleValues: [[]] },
      { id: "ec2", name: "EC2: Плоский массив", description: "Массив без вложенности", exampleValues: [[1, 2, 3], ["a", "b"]] },
      { id: "ec3", name: "EC3: Один уровень вложенности", description: "Массив с элементами-массивами", exampleValues: [[[1, 2], [3, 4]], ["a", ["b"]]] },
      { id: "ec4", name: "EC4: Глубокая вложенность", description: "Массив с 3+ уровнями вложенности", exampleValues: [[[1, [2]], 3]] },
      { id: "ec5", name: "EC5: Массив с null/undefined", description: "Содержит null и undefined", exampleValues: [[1, null, undefined, 2]] },
      { id: "ec6", name: "EC6: Массив с разными типами", description: "Числа, строки, булевы, объекты", exampleValues: [[1, "a", true, { x: 1 }]] },
      { id: "ec7", name: "EC7: Недопустимый тип", description: "Аргумент не является массивом", exampleValues: ["not array", 42, null] },
    ],
    boundaryValues: [
      { value: [], description: "Пустой массив (нижняя граница)" },
      { value: [1], description: "Один элемент" },
      { value: [[]], description: "Массив с пустым массивом" },
      { value: [1, [2, [3, [4]]]], description: "4 уровня вложенности" },
      { value: [null], description: "Массив с null" },
      { value: [undefined], description: "Массив с undefined" },
    ],
    commonMistakes: [
      "Забывают проверить пустой вложенный массив [[]] — должен вернуть []",
      "Не тестируют глубокую вложенность (3+ уровня) — важно для проверки рекурсии",
      "Пропускают массивы с null/undefined — они не должны распадаться",
    ],
  },
  {
    id: 15,
    name: "Число Фибоначчи",
    difficulty: "Легко",
    description:
      "Вычисляет n-е число Фибоначчи. F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2). Для отрицательных чисел и n>75 выбрасывается ошибка.",
    signature: "fibonacci(n: number): number",
    topics: ["Классы эквивалентности", "Граничные значения", "Рекурсия"],
    params: [
      { name: "n", type: "number", description: "Индекс числа Фибоначчи (0–75)" },
    ],
    returnType: "number",
    code: `function fibonacci(n: number): number {
  if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
  if (n < 0) throw new Error("Фибоначчи не определён для отрицательных чисел");
  if (n > 75) throw new Error("Переполнение: n > 75");
  if (n === 0) return 0;
  if (n === 1) return 1;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const t = a + b;
    a = b;
    b = t;
  }
  return b;
}`,
    equivalenceClasses: [
      { id: "ec1", name: "EC1: F(0)", description: "Нулевое число Фибоначчи", exampleValues: [0] },
      { id: "ec2", name: "EC2: F(1)", description: "Первое число Фибоначчи", exampleValues: [1] },
      { id: "ec3", name: "EC3: Обычное значение", description: "Число в диапазоне 2–74", exampleValues: [5, 10, 50] },
      { id: "ec4", name: "EC4: Максимальное значение", description: "Максимальный допустимый индекс (75)", exampleValues: [75] },
      { id: "ec5", name: "EC5: Отрицательное число", description: "Отрицательный индекс", exampleValues: [-1, -10] },
      { id: "ec6", name: "EC6: Больше максимума", description: "Индекс больше 75", exampleValues: [76, 100] },
      { id: "ec7", name: "EC7: Не целое число", description: "Дробное число", exampleValues: [3.5, 2.1] },
    ],
    boundaryValues: [
      { value: 0, description: "Нижняя граница: n=0" },
      { value: 1, description: "n=1 (базовый случай)" },
      { value: 2, description: "Первое вычисляемое значение" },
      { value: 75, description: "Верхняя граница: n=75" },
      { value: 76, description: "За верхней границей" },
      { value: -1, description: "Ниже нижней границы" },
      { value: 0.5, description: "Нецелое число" },
    ],
    commonMistakes: [
      "Забывают проверить n = 0 — базовый случай, где F(0) = 0",
      "Не тестируют n = 75 — максимальное допустимое значение",
      "Пропускают дробные числа и отрицательные индексы — функция должна выбросить ошибку",
    ],
  },
  {
    id: 16,
    name: "Стоимость доставки",
    difficulty: "Сложно",
    description:
      "Рассчитывает стоимость доставки на основе трёх условий: статус клиента (премиум/обычный), сумма заказа и регион доставки. Используйте таблицу решений для покрытия всех комбинаций условий.",
    signature: "calculateShipping(isPremium: boolean, orderAmount: number, region: string): { shipping: number; currency: string }",
    topics: ["Таблица решений", "Комбинаторное тестирование", "Многофакторное тестирование"],
    params: [
      { name: "isPremium", type: "boolean", description: "Премиум-статус клиента" },
      { name: "orderAmount", type: "number", description: "Сумма заказа (>= 0)" },
      { name: "region", type: "string", description: "Регион: local, national, international" },
    ],
    returnType: "{ shipping: number; currency: string }",
    code: `function calculateShipping(isPremium: boolean, orderAmount: number, region: string): { shipping: number; currency: string } {
  if (typeof isPremium !== "boolean") throw new Error("isPremium должен быть булевым");
  if (typeof orderAmount !== "number" || isNaN(orderAmount)) throw new Error("orderAmount должен быть числом");
  if (typeof region !== "string") throw new Error("region должен быть строкой");
  if (orderAmount < 0) throw new Error("Сумма заказа не может быть отрицательной");
  const validRegions = ["local", "national", "international"];
  if (!validRegions.includes(region)) throw new Error("Недопустимый регион");

  let shipping: number;
  if (isPremium && orderAmount >= 1000) {
    shipping = 0; // Бесплатно для премиум от 1000
  } else if (isPremium) {
    shipping = region === "international" ? 200 : 100;
  } else if (orderAmount >= 2000) {
    shipping = region === "international" ? 300 : 0; // Бесплатно от 2000
  } else if (orderAmount >= 500) {
    shipping = region === "local" ? 100 : region === "national" ? 200 : 400;
  } else {
    shipping = region === "local" ? 200 : region === "national" ? 350 : 500;
  }
  return { shipping, currency: "RUB" };
}`,
    equivalenceClasses: [
      { id: "ec1", name: "EC1: Премиум, >= 1000", description: "Бесплатная доставка для премиум", exampleValues: [[true, 1000, "local"], [true, 5000, "international"]] },
      { id: "ec2", name: "EC2: Премиум, < 1000, local/national", description: "Скидка премиум на местные/национальные", exampleValues: [[true, 500, "local"], [true, 999, "national"]] },
      { id: "ec3", name: "EC3: Премиум, < 1000, international", description: "Международная для премиум", exampleValues: [[true, 500, "international"]] },
      { id: "ec4", name: "EC4: Обычный, >= 2000", description: "Бесплатно для обычных от 2000", exampleValues: [[false, 2000, "local"], [false, 3000, "national"]] },
      { id: "ec5", name: "EC5: Обычный, 500–1999, local", description: "Средняя сумма, локальная", exampleValues: [[false, 500, "local"], [false, 1500, "local"]] },
      { id: "ec6", name: "EC6: Обычный, 500–1999, national", description: "Средняя сумма, национальная", exampleValues: [[false, 500, "national"]] },
      { id: "ec7", name: "EC7: Обычный, 500–1999, international", description: "Средняя сумма, международная", exampleValues: [[false, 500, "international"]] },
      { id: "ec8", name: "EC8: Обычный, < 500, local", description: "Малая сумма, локальная", exampleValues: [[false, 100, "local"], [false, 499, "local"]] },
      { id: "ec9", name: "EC9: Обычный, < 500, national", description: "Малая сумма, национальная", exampleValues: [[false, 100, "national"]] },
      { id: "ec10", name: "EC10: Обычный, < 500, international", description: "Малая сумма, международная", exampleValues: [[false, 100, "international"]] },
      { id: "ec11", name: "EC11: orderAmount < 0", description: "Недопустимая сумма", exampleValues: [[false, -1, "local"]] },
      { id: "ec12", name: "EC12: Недопустимый регион", description: "Недопустимый регион", exampleValues: [[false, 500, "moon"]] },
      { id: "ec13", name: "EC13: Неверные типы", description: "Неверный тип аргументов", exampleValues: [["yes", 500, "local"], [false, "abc", "local"]] },
    ],
    boundaryValues: [
      { value: [true, 1000, "local"], description: "Премиум, граница бесплатной доставки" },
      { value: [true, 999, "local"], description: "Премиум, чуть ниже границы" },
      { value: [false, 2000, "local"], description: "Обычный, граница бесплатной доставки" },
      { value: [false, 1999, "local"], description: "Обычный, чуть ниже границы" },
      { value: [false, 500, "local"], description: "Обычный, граница среднего тарифа" },
      { value: [false, 499, "local"], description: "Обычный, чуть ниже среднего тарифа" },
      { value: [false, 0, "local"], description: "Нулевая сумма заказа" },
    ],
    commonMistakes: [
      "Не строят полную таблицу решений: 3 условия × 3 региона = 18+ комбинаций",
      "Забывают проверить граничные суммы: 1000, 2000, 500 — точки смены тарифа",
      "Не тестируют комбинацию «премиум + international + малая сумма» — отдельный тариф",
    ],
  },
  {
    id: 17,
    name: "Блокировка при входе",
    difficulty: "Сложно",
    description:
      "Моделирует систему блокировки аккаунта после 3 неудачных попыток входа. Состояния: разблокирован → неудачная попытка → заблокирован → разблокирован (после ожидания). Тестируйте переходы между состояниями.",
    signature: "handleLoginAction(action: string, currentAttempts: number, lockoutTime: number | null): { status: string; remainingAttempts: number; message: string }",
    topics: ["Переходы состояний", "0-switch coverage", "1-switch coverage", "Пограничные случаи"],
    params: [
      { name: "action", type: "string", description: "Действие: login, success, wait" },
      { name: "currentAttempts", type: "number", description: "Текущее число неудачных попыток (0–3)" },
      { name: "lockoutTime", type: "number | null", description: "Время блокировки (null = не заблокирован)" },
    ],
    returnType: "{ status: string; remainingAttempts: number; message: string }",
    code: `function handleLoginAction(action: string, currentAttempts: number, lockoutTime: number | null): { status: string; remainingAttempts: number; message: string } {
  const maxAttempts = 3;
  const lockoutDuration = 300; // 5 минут
  if (typeof action !== "string") throw new Error("action должен быть строкой");
  if (!Number.isInteger(currentAttempts) || currentAttempts < 0) throw new Error("currentAttempts должен быть неотрицательным целым");
  if (lockoutTime !== null && (typeof lockoutTime !== "number" || lockoutTime < 0)) throw new Error("lockoutTime должен быть неотрицательным числом или null");
  const now = 0;
  const isLockedOut = lockoutTime !== null && (now - lockoutTime) < lockoutDuration;

  if (action === "login") {
    if (isLockedOut) {
      return { status: "locked", remainingAttempts: 0, message: "Аккаунт заблокирован. Попробуйте позже." };
    }
    const newAttempts = currentAttempts + 1;
    if (newAttempts >= maxAttempts) {
      return { status: "locked", remainingAttempts: 0, message: "Аккаунт заблокирован после 3 неудачных попыток." };
    }
    return { status: "failed", remainingAttempts: maxAttempts - newAttempts, message: \`Неверный пароль. Осталось попыток: \${maxAttempts - newAttempts}\` };
  }
  if (action === "success") {
    if (isLockedOut) {
      return { status: "locked", remainingAttempts: 0, message: "Аккаунт заблокирован." };
    }
    return { status: "success", remainingAttempts: maxAttempts, message: "Вход выполнен успешно." };
  }
  if (action === "wait") {
    return { status: "unlocked", remainingAttempts: maxAttempts, message: "Блокировка снята. Попытки сброшены." };
  }
  throw new Error("Недопустимое действие");
}`,
    equivalenceClasses: [
      { id: "ec1", name: "EC1: Успешный вход (0 попыток)", description: "Вход с первой попытки", exampleValues: [["success", 0, null]] },
      { id: "ec2", name: "EC2: Успешный вход (1–2 попытки)", description: "Вход после неудачных попыток", exampleValues: [["success", 1, null], ["success", 2, null]] },
      { id: "ec3", name: "EC3: Неудачный вход (1-я попытка)", description: "Первая неудачная попытка", exampleValues: [["login", 0, null]] },
      { id: "ec4", name: "EC4: Неудачный вход (2-я попытка)", description: "Вторая неудачная попытка", exampleValues: [["login", 1, null]] },
      { id: "ec5", name: "EC5: Неудачный вход (3-я попытка → блокировка)", description: "Третья попытка — блокировка", exampleValues: [["login", 2, null]] },
      { id: "ec6", name: "EC6: Попытка входа при блокировке", description: "Вход когда аккаунт заблокирован", exampleValues: [["login", 3, 0]] },
      { id: "ec7", name: "EC7: Ожидание (разблокировка)", description: "Снятие блокировки", exampleValues: [["wait", 3, 0]] },
      { id: "ec8", name: "EC8: Успешный вход при блокировке", description: "Попытка входа при блокировке", exampleValues: [["success", 2, 0]] },
      { id: "ec9", name: "EC9: Недопустимое действие", description: "Неизвестный action", exampleValues: [["reset", 0, null]] },
      { id: "ec10", name: "EC10: currentAttempts < 0", description: "Отрицательное число попыток", exampleValues: [["login", -1, null]] },
      { id: "ec11", name: "EC11: Неверные типы", description: "Неверный тип аргументов", exampleValues: [[123, 0, null], ["login", "abc", null]] },
    ],
    boundaryValues: [
      { value: ["login", 0, null], description: "Первая попытка (0 → 1)" },
      { value: ["login", 1, null], description: "Вторая попытка (1 → 2)" },
      { value: ["login", 2, null], description: "Третья попытка — блокировка (2 → 3)" },
      { value: ["login", 3, 0], description: "Вход при активной блокировке" },
      { value: ["success", 2, null], description: "Успех на последней попытке" },
      { value: ["wait", 3, 0], description: "Разблокировка после ожидания" },
      { value: ["login", 3, null], description: "Вход без блокировки, attempts=3" },
    ],
    commonMistakes: [
      "Не тестируют полный цикл: 0 → 1 → 2 → 3 (блокировка) → wait → 0",
      "Забывают проверить, что успешный вход при блокировке всё равно возвращает locked",
      "Не проверяют граничное состояние: currentAttempts = 2 + login = блокировка",
    ],
  },
];

export function getTaskById(id: number): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function runReferenceFunction(
  taskId: number,
  args: unknown[]
): { result: unknown; error: string | null } {
  const fn = referenceFunctions[taskId];
  if (!fn) return { result: undefined, error: "Функция не найдена" };
  try {
    const result = fn(args);
    return { result, error: null };
  } catch (e) {
    return { result: undefined, error: (e as Error).message };
  }
}
