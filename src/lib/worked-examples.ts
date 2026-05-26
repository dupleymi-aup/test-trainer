export interface WorkedStep {
  stepNumber: number;
  title: string;
  action: string;
  reasoning: string;
  example?: {
    input: string;
    expectedOutput: string;
    category: string;
  };
}

export interface WorkedExample {
  taskId: number;
  taskName: string;
  introduction: string;
  steps: WorkedStep[];
  keyTakeaways: string[];
}

export const workedExamples: WorkedExample[] = [
  {
    taskId: 1,
    taskName: "Факториал",
    introduction:
      "Давайте пошагово разберём, как эксперт подходит к тестированию функции factorial(n). " +
      "Мы последуем алгоритму: анализ → EC → BV → тесты → проверка.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ функции",
        action: "Читаем код и выписываем все проверки",
        reasoning:
          "Каждый if/throw — это минимум 2 класса эквивалентности: один для случая когда условие срабатывает, другой когда нет.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "Выписываем классы эквивалентности",
        action: "Для каждой проверки определяем валидный и невалидный класс",
        reasoning:
          "Функция проверяет: (1) целое ли число, (2) n < 0, (3) n > 20. + базовый случай n = 0 и рабочий диапазон 1–20.",
        example: undefined,
      },
      {
        stepNumber: 3,
        title: "EC1: n = 0 — граничный случай",
        action: "Тестируем n = 0, ожидаем результат 1",
        reasoning:
          "По математическому определению 0! = 1. Это самый частый off-by-one баг — студенты начинают цикл с 1 и забывают про 0.",
        example: {
          input: "0",
          expectedOutput: "1",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC2: 1 ≤ n ≤ 20 — нормальные значения",
        action: "Тестируем одно значение из диапазона, например n = 5",
        reasoning:
          "Все значения от 1 до 20 ведут себя одинаково — вычисляют факториал. Достаточно одного теста. 5! = 120 — легко проверить вручную.",
        example: {
          input: "5",
          expectedOutput: "120",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC3: n < 0 — недопустимые значения",
        action: "Тестируем n = -1, ожидаем ошибку",
        reasoning:
          "Факториал не определён для отрицательных чисел. Функция должна явно выбросить ошибку, а не вернуть некорректный результат.",
        example: {
          input: "-1",
          expectedOutput: "Ошибка: Факториал не определён для отрицательных чисел",
          category: "Исключение",
        },
      },
      {
        stepNumber: 6,
        title: "EC4: n > 20 — переполнение",
        action: "Тестируем n = 21, ожидаем ошибку переполнения",
        reasoning:
          "21! ≈ 5.1 × 10¹⁹ — превышает Number.MAX_SAFE_INTEGER (≈ 9 × 10¹⁵). Без проверки результат будет некорректным из-за переполнения.",
        example: {
          input: "21",
          expectedOutput: "Ошибка: Переполнение: n > 20",
          category: "Исключение",
        },
      },
      {
        stepNumber: 7,
        title: "EC5: n — не целое число",
        action: "Тестируем n = 3.5, ожидаем ошибку типа",
        reasoning:
          "JavaScript автоматически конвертирует типы. Без явной проверки isInteger функция может вернуть NaN или некорректное число вместо ошибки.",
        example: {
          input: "3.5",
          expectedOutput: "Ошибка: Аргумент должен быть целым числом",
          category: "Недопустимый тип",
        },
      },
      {
        stepNumber: 8,
        title: "Граничные значения",
        action: "Проверяем: n = 0, 1, 19, 20, 21, -1",
        reasoning:
          "Границы: 0 (нижняя, результат = 1), 1 (минимальное положительное), 20 (верхняя допустимая), 21 (переполнение), -1 (первая недопустимая).",
        example: undefined,
      },
    ],
    keyTakeaways: [
      "Каждый if/throw = минимум 2 класса эквивалентности",
      "n = 0 — классический edge case, который часто забывают",
      "Переполнение — реальная проблема в JS уже при n > 20",
      "Достаточно одного теста из каждого класса эквивалентности",
    ],
  },
  {
    taskId: 2,
    taskName: "Простое число",
    introduction:
      "Разберём тестирование функции isPrime(n). Ключевая сложность — определение простого числа имеет несколько special cases.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ функции",
        action: "Изучаем код: проверка n <= 1, special case n = 2, 3, цикл до √n",
        reasoning:
          "Функция имеет несколько ветвлений: (1) n <= 1 → false, (2) n <= 3 → true, (3) чётность, (4) цикл. Каждое — источник классов.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: n ≤ 1 — не простые числа",
        action: "Тестируем n = 0, 1, -3 — все должны вернуть false",
        reasoning:
          "1 — самый частый edge case. По определению простое число > 1, но многие забывают это проверить. n = 1 → false — это ВАЖНО.",
        example: {
          input: "1",
          expectedOutput: "false",
          category: "Исключение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: n = 2 — единственное чётное простое",
        action: "Тестируем n = 2, ожидаем true",
        reasoning:
          "Если алгоритм пропускает проверку чётных (оптимизация), он может неверно определить 2 как составное. 2 — special case.",
        example: {
          input: "2",
          expectedOutput: "true",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC4: Составное число — negative case",
        action: "Тестируем n = 9 (3×3), ожидаем false",
        reasoning:
          "9 = 3×3 — частый баг когда проверяют только делимость на 2. Если цикл начинается с 5, то 9 не будет проверено!",
        example: {
          input: "9",
          expectedOutput: "false",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC5: Большое простое число",
        action: "Тестируем n = 7919 (наибольшее простое < 8000)",
        reasoning:
          "Проверяет эффективность алгоритма. O(√n) справится мгновенно, O(n) будет медленно. 7919 — known prime, легко верифицировать.",
        example: {
          input: "7919",
          expectedOutput: "true",
          category: "Нормальное значение",
        },
      },
    ],
    keyTakeaways: [
      "1 — НЕ простое число, это определение, а не баг",
      "2 — единственное чётное простое, special case",
      "Составные числа вроде 9 = 3×3 проверяют полноту алгоритма",
      "Большие числа проверяют эффективность, а не только корректность",
    ],
  },
  {
    taskId: 4,
    taskName: "Високосный год",
    introduction:
      "isLeapYear(year) — классическая задача с комбинаторной логикой. Идеальна для демонстрации таблицы решений.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ логики високосного года",
        action: "Выписываем 3 условия: ÷4, ÷100, ÷400",
        reasoning:
          "Високосный год если: (делится на 400) ИЛИ (делится на 4 И НЕ делится на 100). Три условия дают до 8 комбинаций, но многие не влияют на результат.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Год делится на 400 — високосный",
        action: "Тестируем year = 2000, ожидаем true",
        reasoning:
          "2000 ÷ 400 = 5 — високосный. Это исключение из исключения: год делится на 100, но также на 400, поэтому високосный.",
        example: {
          input: "2000",
          expectedOutput: "true",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Год делится на 100, но не на 400 — НЕ високосный",
        action: "Тестируем year = 1900, ожидаем false",
        reasoning:
          "1900 ÷ 100 = 19, но 1900 ÷ 400 = 4.75 — НЕ високосный. Частый баг: проверка только делимости на 4 без учёта правила 100/400.",
        example: {
          input: "1900",
          expectedOutput: "false",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Год делится на 4 (обычный случай) — високосный",
        action: "Тестируем year = 2024, ожидаем true",
        reasoning:
          "2024 ÷ 4 = 506, 2024 ÷ 100 = 20.24 — не делится на 100. Обычный високосный год, самый частый случай.",
        example: {
          input: "2024",
          expectedOutput: "true",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Год не делится на 4 — НЕ високосный",
        action: "Тестируем year = 2023, ожидаем false",
        reasoning:
          "2023 ÷ 4 = 505.75 — не делится. Обычный не-високосный год. Самый простой случай, но важен для полноты покрытия.",
        example: {
          input: "2023",
          expectedOutput: "false",
          category: "Нормальное значение",
        },
      },
    ],
    keyTakeaways: [
      "Правило високосного года — 3 условия, не одно",
      "1900 — ключевой тест: делится на 4, но НЕ високосный",
      "Таблица решений сокращает 8 комбинаций до 4 тестов",
      "Знак «—» в таблице = значение не влияет на результат",
    ],
  },
];

export function getWorkedExample(taskId: number): WorkedExample | undefined {
  return workedExamples.find((ex) => ex.taskId === taskId);
}

export function getAvailableWorkedExamples(): { taskId: number; taskName: string }[] {
  return workedExamples.map((ex) => ({ taskId: ex.taskId, taskName: ex.taskName }));
}
