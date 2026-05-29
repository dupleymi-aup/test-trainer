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
  {
    taskId: 5,
    taskName: "Треугольник",
    introduction:
      "triangleType(a, b, c) — классическая задача комбинаторного тестирования. Три входных параметра создают множество комбинаций, " +
      "и важно систематически покрыть все классы эквивалентности, не тестируя все возможные тройки.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ функции",
        action: "Изучаем код: проверка сторон > 0, неравенство треугольника, сравнение сторон",
        reasoning:
          "Функция проверяет: (1) все стороны > 0, (2) неравенство треугольника a+b>c, a+c>b, b+c>a, (3) тип по равенству сторон. Каждый блок — источник классов.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Равносторонний треугольник",
        action: "Тестируем a=3, b=3, c=3 — ожидаем «равносторонний»",
        reasoning:
          "Все три стороны равны — это самый простой случай. Важно проверить что функция отличает от равнобедренного (некоторые реализации путают).",
        example: {
          input: "a=3, b=3, c=3",
          expectedOutput: "равносторонний",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Равнобедренный (две равные стороны)",
        action: "Тестируем a=5, b=5, c=8 — ожидаем «равнобедренный»",
        reasoning:
          "Две стороны равны, третья отличается. Важно: равнобедренный НЕ равен равностороннему. Также проверяем a=2, b=3, c=2 — равные стороны могут быть в любой позиции.",
        example: {
          input: "a=5, b=5, c=8",
          expectedOutput: "равнобедренный",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Разносторонний треугольник",
        action: "Тестируем a=3, b=4, c=5 — ожидаем «разносторонний»",
        reasoning:
          "Все стороны разные И выполняется неравенство треугольника (3+4>5, 3+5>4, 4+5>3). Это основной positive case для нормальной логики.",
        example: {
          input: "a=3, b=4, c=5",
          expectedOutput: "разносторонний",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Не треугольник (нарушено неравенство)",
        action: "Тестируем a=1, b=2, c=10 — ожидаем «не треугольник»",
        reasoning:
          "1 + 2 = 3 < 10 — неравенство треугольника нарушено. Это key negative case. Студенты часто забывают тестировать комбинации где одна сторона слишком длинная.",
        example: {
          input: "a=1, b=2, c=10",
          expectedOutput: "не треугольник",
          category: "Исключение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5: Сторона ≤ 0 — недопустимые значения",
        action: "Тестируем a=-1, b=2, c=3 и a=0, b=0, c=0",
        reasoning:
          "Стороны треугольника должны быть положительными. Отрицательные и нулевые значения — невалидный ввод. Важно проверить и -1 и 0 отдельно.",
        example: {
          input: "a=-1, b=2, c=3",
          expectedOutput: "Ошибка: Все стороны должны быть положительными",
          category: "Исключение",
        },
      },
      {
        stepNumber: 7,
        title: "EC6: Вырожденный треугольник (a + b = c)",
        action: "Тестируем a=1, b=2, c=3 — ожидаем «не треугольник»",
        reasoning:
          "1 + 2 = 3 — сумма двух сторон РАВНА третьей. Это пограничный случай: неравенство строгое (a+b>c), значит вырожденный — НЕ треугольник. Очень частый баг!",
        example: {
          input: "a=1, b=2, c=3",
          expectedOutput: "не треугольник",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 8,
        title: "Комбинаторное покрытие",
        action: "Составляем таблицу: тип × позиция равных сторон × неравенство",
        reasoning:
          "Для равнобедренного нужно 3 теста: равны (a,b), (a,c), (b,c). Для «не треугольник» — 3 теста: каждая сторона может быть «слишком длинной». Это покрывает все комбинации.",
        example: undefined,
      },
    ],
    keyTakeaways: [
      "Вырожденный треугольник (a+b=c) — это НЕ треугольник, частый баг",
      "Равнобедренный нужно тестировать с равными сторонами в разных позициях",
      "Неравенство треугольника — 3 условия, все должны выполняться",
      "Комбинаторное тестирование: 3 параметра × несколько значений = много комбинаций, но EC сокращает до минимума",
    ],
  },
  {
    taskId: 6,
    taskName: "Валидация пароля",
    introduction:
      "validatePassword(password) — задача на комбинаторное тестирование с множеством независимых правил валидации. " +
      "Каждое правило создаёт свои классы эквивалентности, а их комбинация даёт экспоненциальный рост тестов.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ требований",
        action: "Выписываем все правила: длина ≥ 8, заглавная, строчная, цифра, спецсимвол",
        reasoning:
          "5 независимых правил = 2^5 = 32 возможных комбинации. Но нам не нужно тестировать все — используем попарное тестирование и классы эквивалентности.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Валидный пароль — все правила выполнены",
        action: "Тестируем «Pass123!» — ожидаем valid: true, errors: []",
        reasoning:
          "8 символов, есть заглавная (P), строчная (ass), цифра (123), спецсимвол (!). Это happy path — один тест покрывает все positive условия одновременно.",
        example: {
          input: "Pass123!",
          expectedOutput: "{ valid: true, errors: [] }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Слишком короткий пароль",
        action: "Тестируем «Pas1!» (5 символов) — ожидаем ошибку длины",
        reasoning:
          "Менее 8 символов — первое правило нарушено. Важно: даже если все остальные правила выполнены, пароль всё равно невалидный. Тестируем изолированно: только длина нарушена.",
        example: {
          input: "Pas1!",
          expectedOutput: "Ошибка: Пароль должен содержать минимум 8 символов",
          category: "Исключение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Нет заглавной буквы",
        action: "Тестируем «password1!» — ожидаем ошибку отсутствия заглавной",
        reasoning:
          "Длина OK (10 символов), есть строчная, цифра, спецсимвол — но НЕТ заглавной. Важно тестировать каждое правило изолированно, чтобы найти какой именно чек не проходит.",
        example: {
          input: "password1!",
          expectedOutput: "Ошибка: Пароль должен содержать хотя бы одну заглавную букву",
          category: "Исключение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Нет строчной буквы",
        action: "Тестируем «PASSWORD1!» — ожидаем ошибку отсутствия строчной",
        reasoning:
          "Аналогично EC3: все правила кроме одного выполнены. PASSWORD — все заглавные, нет строчной. Классический баг: система принимает пароль без строчных.",
        example: {
          input: "PASSWORD1!",
          expectedOutput: "Ошибка: Пароль должен содержать хотя бы одну строчную букву",
          category: "Исключение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5: Нет цифры",
        action: "Тестируем «Password!» — ожидаем ошибку отсутствия цифры",
        reasoning:
          "8 символов, есть заглавная (P), строчная (assword), спецсимвол (!) — но нет цифры. Распространённое требование, которое часто забывают.",
        example: {
          input: "Password!",
          expectedOutput: "Ошибка: Пароль должен содержать хотя бы одну цифру",
          category: "Исключение",
        },
      },
      {
        stepNumber: 7,
        title: "EC6: Нет спецсимвола",
        action: "Тестируем «Password1» — ожидаем ошибку отсутствия спецсимвола",
        reasoning:
          "Все правила кроме спецсимвола выполнены. Это boundary: 9 символов, все типы букв и цифр есть, но спецсимвола нет.",
        example: {
          input: "Password1",
          expectedOutput: "Ошибка: Пароль должен содержать хотя бы один спецсимвол",
          category: "Исключение",
        },
      },
      {
        stepNumber: 8,
        title: "EC7: Граничное значение длины — ровно 8 символов",
        action: "Тестируем «Pass1!ab» (ровно 8) и «Pass1!a» (7)",
        reasoning:
          "8 — минимальная допустимая длина. Off-by-one баг: функция может использовать > вместо >=. Тестируем 7 (меньше), 8 (ровно), 9 (больше).",
        example: {
          input: "Pass1!ab",
          expectedOutput: "{ valid: true, errors: [] }",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 9,
        title: "Комбинаторный тест: несколько нарушенных правил",
        action: "Тестируем «abc» — коротко, нет заглавной, нет цифры, нет спецсимвола",
        reasoning:
          "Реальный пользовательский ввод может нарушать сразу несколько правил. Функция должна вернуть ВСЕ ошибки, а не только первую. Это проверяет полноту валидации.",
        example: {
          input: "abc",
          expectedOutput: "{ valid: false, errors: [«минимум 8 символов», «заглавная», «цифра», «спецсимвол»] }",
          category: "Комбинаторное",
        },
      },
    ],
    keyTakeaways: [
      "Каждое правило валидации = минимум 2 класса: выполнено и нарушено",
      "Тестируем каждое правило изолированно — так находим какой именно чек не проходит",
      "Функция должна возвращать ВСЕ ошибки, а не только первую",
      "Граница длины (8 символов) — классический off-by-one баг",
      "Комбинаторное тестирование: 5 правил = 32 комбинации, но EC сокращает до ~9 тестов",
    ],
  },
  {
    taskId: 16,
    taskName: "Стоимость доставки",
    introduction:
      "calculateShipping(isPremium, orderAmount, region) — идеальная задача для таблицы решений. " +
      "Три условия (премиум, сумма, регион) создают 2 × 4 × 3 = 24 комбинации, но таблица решений " +
      "помогает систематически покрыть все сценарии минимальным числом тестов.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ бизнес-логики",
        action: "Выписываем 3 условия и их пороговые значения",
        reasoning:
          "Условия: (1) isPremium: true/false, (2) orderAmount: >=1000, >=2000, >=500, <500, (3) region: local/national/international. Каждое условие влияет на итоговую стоимость.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Премиум + сумма >= 1000 — бесплатно",
        action: "Тестируем isPremium=true, orderAmount=1000, region=local — ожидаем shipping=0",
        reasoning:
          "Премиум-клиенты с заказом от 1000 получают бесплатную доставку независимо от региона. Это самое выгодное условие.",
        example: {
          input: "isPremium=true, orderAmount=5000, region=international",
          expectedOutput: "{ shipping: 0, currency: 'RUB' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Премиум + сумма < 1000 + local/national",
        action: "Тестируем isPremium=true, orderAmount=500, region=local — ожидаем shipping=100",
        reasoning:
          "Премиум без порога 1000: local=100, national=100. Важно: national тоже 100 для премиум, это отличается от обычных клиентов.",
        example: {
          input: "isPremium=true, orderAmount=999, region=national",
          expectedOutput: "{ shipping: 100, currency: 'RUB' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Премиум + сумма < 1000 + international",
        action: "Тестируем isPremium=true, orderAmount=500, region=international — ожидаем shipping=200",
        reasoning:
          "International для премиум — отдельный случай: 200 вместо 100. Это исключение внутри исключения.",
        example: {
          input: "isPremium=true, orderAmount=500, region=international",
          expectedOutput: "{ shipping: 200, currency: 'RUB' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Обычный + сумма >= 2000 — бесплатно",
        action: "Тестируем isPremium=false, orderAmount=2000, region=international — ожидаем shipping=0",
        reasoning:
          "Обычные клиенты с заказом от 2000 получают бесплатную доставку. Порог 2000 — вдвое выше чем для премиум.",
        example: {
          input: "isPremium=false, orderAmount=3000, region=international",
          expectedOutput: "{ shipping: 0, currency: 'RUB' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5-7: Обычный + сумма 500–1999 (три региона)",
        action: "Тестируем local=100, national=200, international=400",
        reasoning:
          "Средний тариф: зависит от региона. local=100, national=200, international=400. region=international самый дорогой — в 4 раза дороже local.",
        example: {
          input: "isPremium=false, orderAmount=1500, region=international",
          expectedOutput: "{ shipping: 400, currency: 'RUB' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 7,
        title: "EC8-10: Обычный + сумма < 500 (три региона)",
        action: "Тестируем local=200, national=350, international=500",
        reasoning:
          "Базовый тариф: самый дорогой для малых сумм. local=200, national=350, international=500. Сравниваем с EC5-7: при сумме >= 500 тариф ниже.",
        example: {
          input: "isPremium=false, orderAmount=100, region=national",
          expectedOutput: "{ shipping: 350, currency: 'RUB' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 8,
        title: "Граничные значения сумм: 0, 499, 500, 999, 1000, 1999, 2000",
        action: "Тестируем каждую границу для обычного клиента",
        reasoning:
          "Ключевые пороги: 500 (базовый→средний), 1000 (премиум бесплатный), 2000 (обычный бесплатный). Off-by-one на каждом пороге: 499/500, 999/1000, 1999/2000.",
        example: {
          input: "isPremium=false, orderAmount=500, region=local",
          expectedOutput: "{ shipping: 100, currency: 'RUB' }",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 9,
        title: "Таблица решений — полный обзор",
        action: "Строим таблицу: 2 статуса × 4 диапазона сумм × 3 региона = 24 строки",
        reasoning:
          "Но многие ячейки объединяются: премиум >= 1000 → 0 для всех регионов (3 строки → 1). Таблица решений сокращает 24 комбинации до ~13 тестов.",
        example: undefined,
      },
    ],
    keyTakeaways: [
      "Таблица решений — лучший инструмент для многоусловной бизнес-логики",
      "Пороговые значения (500, 1000, 2000) — критические граничные точки",
      "Премиум влияет на тариф только при сумме < 1000",
      "International — самый дорогой регион для всех категорий",
      "Граничные значения: тестируем X-1, X, X+1 для каждого порога",
    ],
  },
  {
    taskId: 17,
    taskName: "Блокировка при входе",
    introduction:
      "handleLoginAction — задача на тестирование переходов состояний (state transitions). " +
      "Аккаунт проходит через состояния: разблокирован → неудачные попытки → заблокирован → разблокирован. " +
      "Нужно проверить все допустимые и недопустимые переходы.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ диаграммы состояний",
        action: "Выписываем состояния и допустимые переходы",
        reasoning:
          "Состояния: [attempts=0, unlocked] → [attempts=1] → [attempts=2] → [attempts=3, locked] → [wait → unlocked, attempts=0]. Действия: login, success, wait. Каждое действие может привести к разному состоянию.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Успешный вход с первой попытки",
        action: "Тестируем action=success, attempts=0, lockoutTime=null — ожидаем status=success",
        reasoning:
          "Happy path: пользователь входит с первого раза. remainingAttempts=3 (сброс после успеха).",
        example: {
          input: "action='success', attempts=0, lockoutTime=null",
          expectedOutput: "{ status: 'success', remainingAttempts: 3, message: 'Вход выполнен успешно.' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC3: Первая неудачная попытка",
        action: "Тестируем action=login, attempts=0, lockoutTime=null — ожидаем status=failed, remaining=2",
        reasoning:
          "Первая неудача: attempts 0→1, remainingAttempts = 3-1 = 2. Аккаунт ещё не заблокирован — это ключевое отличие от EC5.",
        example: {
          input: "action='login', attempts=0, lockoutTime=null",
          expectedOutput: "{ status: 'failed', remainingAttempts: 2, message: 'Неверный пароль. Осталось попыток: 2' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC4: Вторая неудачная попытка",
        action: "Тестируем action=login, attempts=1, lockoutTime=null — ожидаем status=failed, remaining=1",
        reasoning:
          "Вторая неудача: attempts 1→2, remainingAttempts = 3-2 = 1. Последняя попытка перед блокировкой — предупреждение пользователю.",
        example: {
          input: "action='login', attempts=1, lockoutTime=null",
          expectedOutput: "{ status: 'failed', remainingAttempts: 1, message: 'Неверный пароль. Осталось попыток: 1' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC5: Третья попытка — БЛОКИРОВКА",
        action: "Тестируем action=login, attempts=2, lockoutTime=null — ожидаем status=locked",
        reasoning:
          "Ключевой переход! attempts 2→3, и 3 >= maxAttempts(3) → блокировка. remainingAttempts=0. Это граничное состояние: attempts=2 — последний шанс.",
        example: {
          input: "action='login', attempts=2, lockoutTime=null",
          expectedOutput: "{ status: 'locked', remainingAttempts: 0, message: 'Аккаунт заблокирован после 3 неудачных попыток.' }",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC6: Попытка входа при блокировке",
        action: "Тестируем action=login, attempts=3, lockoutTime=0 — ожидаем status=locked",
        reasoning:
          "Аккаунт уже заблокирован (lockoutTime=0, now=0, прошло 0 < 300 секунд). Любая попытка входа возвращает locked. Важный negative test.",
        example: {
          input: "action='login', attempts=3, lockoutTime=0",
          expectedOutput: "{ status: 'locked', remainingAttempts: 0, message: 'Аккаунт заблокирован. Попробуйте позже.' }",
          category: "Исключение",
        },
      },
      {
        stepNumber: 7,
        title: "EC8: Успешный вход при блокировке — тоже locked",
        action: "Тестируем action=success, attempts=2, lockoutTime=0 — ожидаем status=locked",
        reasoning:
          "Даже правильный пароль не поможет при блокировке! Это counter-intuitive behaviour — частый баг в реальных системах. Проверка isLockedOut идёт ПЕРЕД проверкой пароля.",
        example: {
          input: "action='success', attempts=2, lockoutTime=0",
          expectedOutput: "{ status: 'locked', remainingAttempts: 0, message: 'Аккаунт заблокирован.' }",
          category: "Исключение",
        },
      },
      {
        stepNumber: 8,
        title: "EC7: Разблокировка через ожидание",
        action: "Тестируем action=wait, attempts=3, lockoutTime=0 — ожидаем status=unlocked",
        reasoning:
          "После ожидания (wait) блокировка снимается: attempts сбрасываются на 3 (maxAttempts), status=unlocked. Полный цикл: 0→1→2→3(locked)→wait→0.",
        example: {
          input: "action='wait', attempts=3, lockoutTime=0",
          expectedOutput: "{ status: 'unlocked', remainingAttempts: 3, message: 'Блокировка снята. Попытки сброшены.' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 9,
        title: "Полный цикл состояний (0-switch coverage)",
        action: "Проверяем цепочку: login(0→1) → login(1→2) → login(2→3 locked) → wait → login(0→1)",
        reasoning:
          "Это 0-switch coverage — проверка каждого перехода по отдельности. Для 1-switch нужно проверивать пары переходов: login→login, login→wait, и т.д.",
        example: undefined,
      },
    ],
    keyTakeaways: [
      "3 неудачные попытки → автоматическая блокировка",
      "Даже правильный пароль не работает при блокировке",
      "wait — единственный способ разблокировки (сбрасывает attempts)",
      "Граничное состояние: attempts=2 + login = блокировка (переход 2→3)",
      "State transitions: рисуем диаграмму состояний для систематического покрытия",
      "0-switch = каждый переход отдельно, 1-switch = пары переходов",
    ],
  },
];

export function getWorkedExample(taskId: number): WorkedExample | undefined {
  return workedExamples.find((ex) => ex.taskId === taskId);
}

export function getAvailableWorkedExamples(): { taskId: number; taskName: string }[] {
  return workedExamples.map((ex) => ({ taskId: ex.taskId, taskName: ex.taskName }));
}
