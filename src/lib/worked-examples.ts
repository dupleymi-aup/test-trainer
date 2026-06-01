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
  {
    taskId: 3,
    taskName: "Калькулятор скидки",
    introduction:
      "applyDiscount(price, discountPercent) — задача на многофакторное тестирование. " +
      "Два числовых параметра с независимыми ограничениями создают множество комбинаций на границах.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ функции",
        action: "Выписываем ограничения: price >= 0, 0 <= discountPercent <= 100, результат округляется",
        reasoning:
          "Каждый параметр имеет нижнюю и верхнюю границу. Вместе они создают 4 угловые комбинации. Плюс округление до 2 знаков — источник пограничных багов.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Нормальная цена и скидка",
        action: "Тестируем price=1000, discountPercent=20 — ожидаем 800",
        reasoning:
          "Happy path: 1000 - (1000 * 20/100) = 800. Простая математика, легко проверить вручную.",
        example: {
          input: "price=1000, discountPercent=20",
          expectedOutput: "800",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Скидка 0% — нет скидки",
        action: "Тестируем price=500, discountPercent=0 — ожидаем 500",
        reasoning:
          "Нулевая скидка = цена без изменений. Граничный случай: discountPercent=0 — нижняя граница.",
        example: {
          input: "price=500, discountPercent=0",
          expectedOutput: "500",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Скидка 100% — бесплатно",
        action: "Тестируем price=500, discountPercent=100 — ожидаем 0",
        reasoning:
          "100% скидка = товар бесплатно. Верхняя граница discountPercent. Результат должен быть 0, не отрицательный!",
        example: {
          input: "price=500, discountPercent=100",
          expectedOutput: "0",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Цена = 0",
        action: "Тестируем price=0, discountPercent=50 — ожидаем 0",
        reasoning:
          "Нулевая цена с любой скидкой = 0. Нижняя граница price.",
        example: {
          input: "price=0, discountPercent=50",
          expectedOutput: "0",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5: Округление — дробный результат",
        action: "Тестируем price=999, discountPercent=33 — ожидаем 669.33",
        reasoning:
          "999 * (1 - 33/100) = 999 * 0.67 = 669.33. Важно проверить округление до 2 знаков: 669.333... → 669.33.",
        example: {
          input: "price=999, discountPercent=33",
          expectedOutput: "669.33",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 7,
        title: "EC6: Отрицательная цена — ошибка",
        action: "Тестируем price=-100, discountPercent=10 — ожидаем ошибку",
        reasoning:
          "Цена не может быть отрицательной. Функция должна выбросить ошибку, а не вернуть отрицательный результат.",
        example: {
          input: "price=-100, discountPercent=10",
          expectedOutput: "Ошибка: price должен быть неотрицательным",
          category: "Исключение",
        },
      },
      {
        stepNumber: 8,
        title: "EC7: Скидка > 100 или < 0 — ошибка",
        action: "Тестируем price=100, discountPercent=150 и price=100, discountPercent=-10",
        reasoning:
          "Скидка не может быть больше 100% или отрицательной. Два граничных случая: >100 и <0.",
        example: {
          input: "price=100, discountPercent=150",
          expectedOutput: "Ошибка: discountPercent должен быть в диапазоне 0-100",
          category: "Исключение",
        },
      },
      {
        stepNumber: 9,
        title: "Комбинации границ: угловые случаи",
        action: "Проверяем 4 комбинации: (0,0), (0,100), (большая,0), (большая,100)",
        reasoning:
          "Многофакторное тестирование:(price=0, disc=0) → 0, (price=0, disc=100) → 0, (price=10000, disc=0) → 10000, (price=10000, disc=100) → 0.",
        example: undefined,
      },
    ],
    keyTakeaways: [
      "Два независимых параметра × 2 границы каждый = 4 угловые комбинации",
      "Округление до 2 знаков — частый источник багов (floating point)",
      "100% скидка = 0, не отрицательное число",
      "discountPercent=0 и discountPercent=100 — критические границы",
    ],
  },
  {
    taskId: 7,
    taskName: "Палиндром",
    introduction:
      "isPalindrome(str) — задача на обработку строк с учётом регистра, пробелов и пунктуации. " +
      "Основная сложность — правильно нормализовать строку перед проверкой.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ функции",
        action: "Изучаем: нормализация (lowercase, удаление не-букв/цифр) → сравнение с реверсом",
        reasoning:
          "Ключевые шаги: (1) привести к нижнему регистру, (2) удалить всё кроме букв и цифр, (3) сравнить строку с её реверсом.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Простой палиндром",
        action: "Тестируем «racecar» — ожидаем true",
        reasoning:
          "racecar ↔ racecar (реверс совпадает). Классический пример палиндрома, легко верифицировать вручную.",
        example: {
          input: "racecar",
          expectedOutput: "true",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Палиндром с разным регистром",
        action: "Тестируем «RaceCar» — ожидаем true",
        reasoning:
          "Регистр игнорируется: RaceCar → racecar → реверс racecar. Частый баг: case-sensitive сравнение без нормализации.",
        example: {
          input: "RaceCar",
          expectedOutput: "true",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC4: Палиндром с пробелами и знаками",
        action: "Тестируем «A man, a plan, a canal: Panama» — ожидаем true",
        reasoning:
          "После удаления не-букв: amanaplanacanalpanama → реверс совпадает. Это классический тест — если функция не удаляет знаки, она вернёт false.",
        example: {
          input: "A man, a plan, a canal: Panama",
          expectedOutput: "true",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC5: Пустая строка — палиндром",
        action: "Тестируем «» — ожидаем true",
        reasoning:
          "Пустая строка = палиндром по определению (читается одинаково в обе стороны). Частый баг: функция возвращает false или ошибку.",
        example: {
          input: "",
          expectedOutput: "true",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC6: Один символ",
        action: "Тестируем «a» и «Я» — ожидаем true",
        reasoning:
          "Один символ всегда палиндром — реверс совпадает с оригиналом. Минимальная длина.",
        example: {
          input: "a",
          expectedOutput: "true",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 7,
        title: "EC3: Не палиндром",
        action: "Тестируем «hello» — ожидаем false",
        reasoning:
          "hello ↔ olleh — не совпадает. Простейший negative case. Также проверяем «ab» (минимальный не-палиндром).",
        example: {
          input: "hello",
          expectedOutput: "false",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 8,
        title: "EC2: Кириллический палиндром",
        action: "Тестируем «Анна» и «казак» — ожидаем true",
        reasoning:
          "Анна → анна ↔ анна (реверс). Важно: кириллица должна обрабатываться корректно. «казак» ↔ казак — тоже палиндром.",
        example: {
          input: "Анна",
          expectedOutput: "true",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 9,
        title: "Числовой палиндром",
        action: "Тестируем «12321» — ожидаем true",
        reasoning:
          "Цифры тоже считаются. 12321 ↔ 12321. Частый edge case: «123a321» — с буквой в середине тоже палиндром.",
        example: {
          input: "12321",
          expectedOutput: "true",
          category: "Нормальное значение",
        },
      },
    ],
    keyTakeaways: [
      "Нормализация: lowercase + удалить не-буквы/цифры — обязательные шаги",
      "Пустая строка и один символ — всегда палиндромы",
      "Кириллица должна обрабатываться так же как латиница",
      "Пробелы и пунктуация игнорируются — ключевой источник багов",
    ],
  },
  {
    taskId: 8,
    taskName: "Валидация email",
    introduction:
      "validateEmail(email) — задача на проверку формата с несколькими независимыми правилами. " +
      "Каждая часть email (локальная часть, @, домен, TLD) имеет свои требования.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ структуры email",
        action: "Разбиваем: local@domain.tld — 4 компонента с правилами для каждого",
        reasoning:
          "Правила: (1) ровно один @, (2) local: буквы/цифры/точки/дефисы, не пустой, (3) domain: содержит точку, (4) TLD: 2-6 букв.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Валидный email",
        action: "Тестируем user@example.com — ожидаем valid: true",
        reasoning:
          "Happy path: local=user, domain=example, TLD=com (3 буквы). Все правила выполнены.",
        example: {
          input: "user@example.com",
          expectedOutput: "{ valid: true, errors: [] }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Нет символа @",
        action: "Тестируем userexample.com — ожидаем ошибку",
        reasoning:
          "Отсутствие @ — фундаментальная ошибка. Без @ нельзя разделить local и domain.",
        example: {
          input: "userexample.com",
          expectedOutput: "Ошибка: Отсутствует символ @",
          category: "Исключение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Два символа @",
        action: "Тестируем user@@example.com — ожидаем ошибку",
        reasoning:
          "Ровно один @ — требование. user@@example.com имеет два @, indexOf != lastIndex.",
        example: {
          input: "user@@example.com",
          expectedOutput: "Ошибка: Более одного символа @",
          category: "Исключение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Пустая локальная часть",
        action: "Тестируем @example.com — ожидаем ошибку",
        reasoning:
          "Local часть до @ пустая. @example.com — частый баг при вводе (забыли имя).",
        example: {
          input: "@example.com",
          expectedOutput: "Ошибка: Пустая локальная часть (до @)",
          category: "Исключение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5: Спецсимволы в local части",
        action: "Тестируем user+tag@test.com — ожидаем ошибку",
        reasoning:
          "Local часть допускает только буквы, цифры, точки и дефисы. + не допускается (хотя в реальном email допустим).",
        example: {
          input: "user+tag@test.com",
          expectedOutput: "Ошибка: Недопустимые символы в локальной части",
          category: "Исключение",
        },
      },
      {
        stepNumber: 7,
        title: "EC7: Домен без точки",
        action: "Тестируем user@localhost — ожидаем ошибку",
        reasoning:
          "Domain должен содержать хотя бы одну точку. user@localhost — валидный internal адрес, но не проходит валидацию.",
        example: {
          input: "user@localhost",
          expectedOutput: "Ошибка: Домен не содержит точку",
          category: "Исключение",
        },
      },
      {
        stepNumber: 8,
        title: "EC8-9: TLD границы (1 символ и 7 символов)",
        action: "Тестируем user@example.c и user@example.abcdefg",
        reasoning:
          "TLD 2-6 букв: .c (1) — слишком короткий, .abcdefg (7) — слишком длинный. Граничные: .co (2) OK, .museum (6) OK.",
        example: {
          input: "user@example.c",
          expectedOutput: "Ошибка: Домен верхнего уровня слишком короткий (минимум 2 символа)",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 9,
        title: "Комбинаторный тест: несколько ошибок",
        action: "Тестируем @ — ожидаем ошибки local и domain",
        reasoning:
          "Один символ @ — пустая local И пустая domain. Функция должна вернуть ОБЕ ошибки, не только первую.",
        example: {
          input: "@",
          expectedOutput: "{ valid: false, errors: [«Пустая локальная часть», «Пустая доменная часть»] }",
          category: "Комбинаторное",
        },
      },
    ],
    keyTakeaways: [
      "Email = 4 компонента (local, @, domain, TLD), каждый со своими правилами",
      "Ровно один @ — проверяем через indexOf vs lastIndex",
      "TLD 2-6 букв — .com (3) OK, .museum (6) OK, .с (1) нет",
      "Функция возвращает ВСЕ ошибки, а не только первую",
      "local+tag@valid.com может быть реальным email, но не проходит эту валидацию",
    ],
  },
  {
    taskId: 10,
    taskName: "Валидация даты",
    introduction:
      "isValidDate(day, month, year) — задача с комбинаторной логикой, зависящей от високосных годов " +
      "и разного количества дней в месяцах. Три параметра создают множество граничных случаев.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ функции",
        action: "Изучаем: проверка типов → месяц 1-12 → день 1+ → daysInMonth[] с учётом високосного",
        reasoning:
          "daysInMonth = [31, 28/29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]. Каждый месяц имеет свой максимум. Февраль зависит от високосного года.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Валидная дата",
        action: "Тестируем 15.06.2023 — ожидаем true",
        reasoning:
          "15 <= 30 (июнь), месяц 6 валидный, год 2023 обычный. Простой happy path.",
        example: {
          input: "day=15, month=6, year=2023",
          expectedOutput: "true",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: 29 февраля в високосный год",
        action: "Тестируем 29.02.2024 — ожидаем true",
        reasoning:
          "2024 високосный: 2024 % 4 = 0 и 2024 % 100 != 0. Февраль имеет 29 дней. 29 <= 29 → true.",
        example: {
          input: "day=29, month=2, year=2024",
          expectedOutput: "true",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC4: 29 февраля НЕ в високосный год",
        action: "Тестируем 29.02.2023 — ожидаем false",
        reasoning:
          "2023 не високосный: февраль имеет 28 дней. 29 > 28 → false. Ключевой тест!",
        example: {
          input: "day=29, month=2, year=2023",
          expectedOutput: "false",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 5,
        title: "Граничный случай: 1900 год (делится на 100, не на 400)",
        action: "Тестируем 29.02.1900 — ожидаем false",
        reasoning:
          "1900 % 4 = 0, но 1900 % 100 = 0 и 1900 % 400 = 300. НЕ високосный! Это классический баг — правило 100/400.",
        example: {
          input: "day=29, month=2, year=1900",
          expectedOutput: "false",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC7: 31 апреля — несуществующая дата",
        action: "Тестируем 31.04.2023 — ожидаем false",
        reasoning:
          "Апрель имеет 30 дней. 31 > 30 → false. Частый баг: проверка day <= 31 без учёта месяца.",
        example: {
          input: "day=31, month=4, year=2023",
          expectedOutput: "false",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 7,
        title: "EC5: Месяц вне диапазона",
        action: "Тестируем 1.13.2023 и 1.0.2023 — ожидаем false",
        reasoning:
          "Месяц должен быть 1-12. 13 и 0 — невалидные. Граничные: месяц=1 OK, месяц=12 OK.",
        example: {
          input: "day=1, month=13, year=2023",
          expectedOutput: "false",
          category: "Исключение",
        },
      },
      {
        stepNumber: 8,
        title: "EC6: День < 1",
        action: "Тестируем 0.1.2023 и -1.1.2023 — ожидаем false",
        reasoning:
          "День должен быть >= 1. 0 — невалидный (хотя в некоторых календарях допустим).",
        example: {
          input: "day=0, month=1, year=2023",
          expectedOutput: "false",
          category: "Исключение",
        },
      },
      {
        stepNumber: 9,
        title: "Все месяцы: проверка max дней",
        action: "Тестируем 31.01 (OK), 30.02 (false), 31.04 (false), 28.02 (OK)",
        reasoning:
          "Комбинаторное покрытие: для каждого месяца проверяем максимальный день. 31 день: янв, мар, май, июл, авг, окт, дек. 30 дней: апр, июн, сен, ноя. Февраль: 28/29.",
        example: undefined,
      },
    ],
    keyTakeaways: [
      "29 февраля — ключевой тест: зависит от правила високосного года",
      "1900 — классический баг: делится на 100, но не на 400 — НЕ високосный",
      "У каждого месяца свой максимум дней — нельзя проверять day <= 31",
      "Граничные значения: тестируем X-1, X, X+1 для каждого порога дня/месяца",
      "Комбинаторное покрытие: 12 месяцев × 4-5 значений дня = ~60 тестов, но EC сокращает до ~10",
    ],
  },
  {
    taskId: 9,
    taskName: "Римские цифры",
    introduction:
      "toRoman(n) преобразует число 1–3999 в римские цифры. Алгоритм использует贪心 подход с предопределёнными парами значений и символов, " +
      "включая субтрактивные комбинации (IV, IX, XL, XC, CD, CM).",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ алгоритма",
        action: "Изучаем: массивы vals=[1000,900,500,400,100,90,50,40,10,9,5,4,1] и syms=[M,CM,D,CD,C,XC,L,XL,X,IX,V,IV,I]",
        reasoning:
          "Алгоритм жадно вычитает наибольшие возможные значения. Важно: субтрактивные пары (900=CM, 4=IV) обеспечивают корректную запись.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: n = 1 — минимальное значение",
        action: "Тестируем n=1 — ожидаем «I»",
        reasoning:
          "Минимальный вход. 1 = I. Граничный случай: n < 1 выбрасывает ошибку.",
        example: {
          input: "1",
          expectedOutput: "I",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Субтрактивные комбинации",
        action: "Тестируем n=4 → IV, n=9 → IX, n=40 → XL, n=90 → XC",
        reasoning:
          "Субтрактивные пары — ключевая логика. 4 = IV (не IIII), 9 = IX (не VIIII). Это основные edge cases алгоритма.",
        example: {
          input: "4",
          expectedOutput: "IV",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC2: Типичное число",
        action: "Тестируем n=42 — ожидаем «XLII»",
        reasoning:
          "42 = 40 + 2 = XL + II = XLII. Проверяет корректность комбинации нескольких символов.",
        example: {
          input: "42",
          expectedOutput: "XLII",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC3: n = 3999 — максимальное значение",
        action: "Тестируем n=3999 — ожидаем «MMMCMXCIX»",
        reasoning:
          "3999 = 3000 + 900 + 90 + 9 = MMM + CM + XC + IX = MMMCMXCIX. Максимальное допустимое число. n > 3999 → ошибка.",
        example: {
          input: "3999",
          expectedOutput: "MMMCMXCIX",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC4: n < 1 — ошибка",
        action: "Тестируем n=0 и n=-5 — ожидаем ошибку",
        reasoning:
          "Римские цифры не определяют 0 и отрицательные. n=0 — частый баг: некоторые реализации возвращают пустую строку.",
        example: {
          input: "0",
          expectedOutput: "Ошибка: Число должно быть больше 0",
          category: "Исключение",
        },
      },
      {
        stepNumber: 7,
        title: "EC5: n > 3999 — ошибка",
        action: "Тестируем n=4000 — ожидаем ошибку",
        reasoning:
          "Римские цифры не поддерживают числа > 3999 (максимум MMMCMXCIX). Ограничение связано с отсутствием символа для 5000.",
        example: {
          input: "4000",
          expectedOutput: "Ошибка: Число не должно превышать 3999",
          category: "Исключение",
        },
      },
      {
        stepNumber: 8,
        title: "EC6: Не целое число — ошибка",
        action: "Тестируем n=3.5 — ожидаем ошибку",
        reasoning:
          "Дробные числа не имеют римского представления. Number.isInteger(3.5) = false → ошибка.",
        example: {
          input: "3.5",
          expectedOutput: "Ошибка: Аргумент должен быть целым числом",
          category: "Недопустимый тип",
        },
      },
    ],
    keyTakeaways: [
      "Субтрактивные комбинации (IV, IX, XL, XC, CD, CM) — ключевая логика",
      "Диапазон 1–3999: 0 и >3999 не поддерживаются",
      "Жадный алгоритм: всегда вычитаем наибольшее возможное значение",
      "4 = IV (не IIII), 9 = IX (не VIIII) — стандартная запись",
    ],
  },
  {
    taskId: 11,
    taskName: "Валидация телефона",
    introduction:
      "validatePhone(phone) проверяет формат номера телефона: 10–15 цифр, допустимые префиксы (+7, 8, +), запрет букв. " +
      "Основная сложность — разные форматы ввода (+79991234567, 8-999-123-45-67).",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ функции",
        action: "Изучаем: извлекаем цифры, проверяем длину 10–15, первый символ +/цифра/8, запрет букв",
        reasoning:
          "Ключевые проверки: (1) digits.length 10-15, (2) первый символ допустимый, (3) нет букв. Дефисы и пробелы допускаются.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Валидный номер +7",
        action: "Тестируем «+79991234567» — ожидаем valid: true",
        reasoning:
          "Happy path: +7, 11 цифр, нет букв. Самый распространённый формат в России.",
        example: {
          input: "+79991234567",
          expectedOutput: "{ valid: true, errors: [] }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Валидный номер с 8",
        action: "Тестируем «89991234567» — ожидаем valid: true",
        reasoning:
          "Альтернативный российский формат: начинается с 8 вместо +7. Тоже 11 цифр.",
        example: {
          input: "89991234567",
          expectedOutput: "{ valid: true, errors: [] }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Международный формат",
        action: "Тестируем «+1-555-123-4567» — ожидаем valid: true",
        reasoning:
          "Международный номер с дефисами. Дефисы игнорируются при подсчёте цифр. 1+555+123+4567 = 11 цифр.",
        example: {
          input: "+1-555-123-4567",
          expectedOutput: "{ valid: true, errors: [] }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Слишком короткий номер",
        action: "Тестируем «123456789» (9 цифр) — ожидаем ошибку",
        reasoning:
          "Минимум 10 цифр. 9 цифр — слишком короткий. Граничные: 10 цифр OK, 9 — нет.",
        example: {
          input: "123456789",
          expectedOutput: "Ошибка: Слишком короткий номер (минимум 10 цифр)",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5: Слишком длинный номер",
        action: "Тестируем «+71234567890123456» (16 цифр) — ожидаем ошибку",
        reasoning:
          "Максимум 15 цифр. 16 — слишком длинный. Граничные: 15 цифр OK, 16 — нет.",
        example: {
          input: "+71234567890123456",
          expectedOutput: "Ошибка: Слишком длинный номер (максимум 15 цифр)",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 7,
        title: "EC6: Номер содержит буквы",
        action: "Тестируем «+7abc1234567» — ожидаем ошибку",
        reasoning:
          "Буквы в номере недопустимы. regex /[a-zA-Zа-яА-ЯёЁ]/ найдёт их. Частый баг: «+7ABX1234567» — буквы похожи на цифры.",
        example: {
          input: "+7abc1234567",
          expectedOutput: "Ошибка: Номер не должен содержать букв",
          category: "Исключение",
        },
      },
      {
        stepNumber: 8,
        title: "EC7: Пустая строка",
        action: "Тестируем «» — ожидаем ошибку",
        reasoning:
          "Пустая строка: digits.length = 0 → «Не содержит цифр». Минимальный negative case.",
        example: {
          input: "",
          expectedOutput: "Ошибка: Номер не содержит цифр",
          category: "Исключение",
        },
      },
      {
        stepNumber: 9,
        title: "Границы: ровно 10 и ровно 15 цифр",
        action: "Тестируем «+79991234567» (10 цифр без +) и «+7123456789012345» (15)",
        reasoning:
          "10 цифр — нижняя граница (минимальный валидный). 15 цифр — верхняя граница (максимальный международный).",
        example: {
          input: "+79991234567",
          expectedOutput: "{ valid: true, errors: [] }",
          category: "Граничное значение",
        },
      },
    ],
    keyTakeaways: [
      "Длина: 10–15 цифр (не символов, а именно цифр после извлечения)",
      "Префикс: +, цифра или 8 — другие символы недопустимы",
      "Буквы запрещены целиком (и латиница, и кириллица)",
      "Дефисы и пробелы допустимы — они игнорируются",
      "Границы: 10 и 15 цифр — критические пороги",
    ],
  },
  {
    taskId: 12,
    taskName: "Калькулятор ИМТ",
    introduction:
      "calculateBMI(weight, height) вычисляет индекс массы тела и определяет категорию. " +
      "Два числовых параметра с диапазонами и пограничными значениями ИМТ (18.5, 25, 30).",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ формулы",
        action: "BMI = weight / (height/100)², категории: <18.5, 18.5-25, 25-30, >=30",
        reasoning:
          "Рост в см → переводим в метры. 4 категории ИМТ с чёткими границами. weight: 20-300, height: 50-250.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC2: Норма",
        action: "Тестируем weight=70, height=175 — ожидаем BMI=22.9, «Норма»",
        reasoning:
          "70 / (1.75)² = 70 / 3.0625 = 22.86 ≈ 22.9. Это попадает в категорию 18.5–25 — норма.",
        example: {
          input: "weight=70, height=175",
          expectedOutput: "{ bmi: 22.9, category: 'Норма' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC1: Недостаточный вес (граница)",
        action: "Тестируем weight=50, height=170 — ожидаем BMI=17.3, «Недостаточный вес»",
        reasoning:
          "50 / (1.7)² = 50 / 2.89 = 17.3 < 18.5. Граничный случай: weight=53.5 при height=170 даст ~18.5 (ровно граница).",
        example: {
          input: "weight=50, height=170",
          expectedOutput: "{ bmi: 17.3, category: 'Недостаточный вес' }",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Избыточный вес",
        action: "Тестируем weight=85, height=170 — ожидаем BMI=29.4, «Избыточный вес»",
        reasoning:
          "85 / 2.89 = 29.4. Попадает в 25–30. weight=86.7 → BMI ≈ 30 (граница с ожирением).",
        example: {
          input: "weight=85, height=170",
          expectedOutput: "{ bmi: 29.4, category: 'Избыточный вес' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Ожирение",
        action: "Тестируем weight=120, height=165 — ожидаем BMI=44.1, «Ожирение»",
        reasoning:
          "120 / (1.65)² = 120 / 2.7225 = 44.1 >= 30. Очевидная категория ожирения.",
        example: {
          input: "weight=120, height=165",
          expectedOutput: "{ bmi: 44.1, category: 'Ожирение' }",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5-6: Вес вне диапазона",
        action: "Тестируем weight=15 (меньше 20) и weight=350 (больше 300)",
        reasoning:
          "weight: 20-300 кг. 15 кг — невозможно (ошибка), 350 кг — за пределами диапазона.",
        example: {
          input: "weight=15, height=170",
          expectedOutput: "Ошибка: Вес должен быть не менее 20 кг",
          category: "Исключение",
        },
      },
      {
        stepNumber: 7,
        title: "EC7-8: Рост вне диапазона",
        action: "Тестируем height=30 (меньше 50) и height=300 (больше 250)",
        reasoning:
          "height: 50-250 см. 30 см — невозможно, 300 см — за пределами.",
        example: {
          input: "weight=70, height=30",
          expectedOutput: "Ошибка: Рост должен быть не менее 50 см",
          category: "Исключение",
        },
      },
      {
        stepNumber: 8,
        title: "Точные границы категорий",
        action: "Тестируем BMI ≈ 18.5, 25, 30 — переходы между категориями",
        reasoning:
          "BMI=18.5: weight=53.5, height=170 → «Норма» (>=18.5). BMI=25: weight=72.3, height=170 → «Избыточный» (>=25). BMI=30: weight=86.7, height=170 → «Ожирение» (>=30).",
        example: {
          input: "weight=53.5, height=170",
          expectedOutput: "{ bmi: 18.5, category: 'Норма' }",
          category: "Граничное значение",
        },
      },
    ],
    keyTakeaways: [
      "Формула: BMI = weight / (height_m)², округление до 0.1",
      "4 категории: <18.5, 18.5-25, 25-30, >=30 — строгие границы",
      "Диапазоны: weight 20-300, height 50-250 — вне диапазона ошибка",
      "Многофакторное: комбинируем weight и height для точного попадания в границу",
    ],
  },
  {
    taskId: 13,
    taskName: "Строка в число",
    introduction:
      "parseNumber(str) преобразует строку в число, поддерживая десятичный, шестнадцатеричный (0x) " +
      "и двоичный (0b) форматы. Пустая строка возвращает NaN.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ функции",
        action: "Изучаем: trim → проверка префиксов 0x/0b → parseInt с нужной базой",
        reasoning:
          "Три ветки: (1) 0x... → parseInt(str, 16), (2) 0b... → parseInt(str.slice(2), 2), (3) иначе → parseInt(str, 10). Пустая строка → NaN.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: Десятичное число",
        action: "Тестируем «42» и «-17» — ожидаем 42 и -17",
        reasoning:
          "Happy path: обычный десятичный ввод. parseInt(\"42\", 10) = 42, parseInt(\"-17\", 10) = -17.",
        example: {
          input: "42",
          expectedOutput: "42",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: Шестнадцатеричное число",
        action: "Тестируем «0xFF» — ожидаем 255",
        reasoning:
          "0xFF = 15*16 + 15 = 255. Префикс 0x (или 0X) определяет hex-формат. parseInt(\"0xFF\", 16) = 255.",
        example: {
          input: "0xFF",
          expectedOutput: "255",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Двоичное число",
        action: "Тестируем «0b1010» — ожидаем 10",
        reasoning:
          "0b1010 = 8+0+2+0 = 10. Префикс 0b (или 0B) определяет binary-формат. Важно: slice(2) убирает префикс перед parseInt(..., 2).",
        example: {
          input: "0b1010",
          expectedOutput: "10",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Строка с пробелами",
        action: "Тестируем «  42  » — ожидаем 42",
        reasoning:
          "trim() удаляет ведущие и завершающие пробелы. «  42  » → «42» → 42. Частый баг: parseInt без trim вернёт 42 для «  42abc» но NaN для «  abc».",
        example: {
          input: "  42  ",
          expectedOutput: "42",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5: Пустая строка",
        action: "Тестируем «» и «   » — ожидаем NaN",
        reasoning:
          "Пустая строка и строка из пробелов после trim = \"\" → NaN. Важно: не 0, а именно NaN!",
        example: {
          input: "",
          expectedOutput: "NaN",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 7,
        title: "EC6: Не число",
        action: "Тестируем «abc» — ожидаем NaN",
        reasoning:
          "parseInt(\"abc\", 10) = NaN. Строка не является числом ни в одном формате.",
        example: {
          input: "abc",
          expectedOutput: "NaN",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 8,
        title: "EC7: Не строковый тип",
        action: "Тестируем 42 и null — ожидаем ошибку",
        reasoning:
          "typeof 42 === \"number\" !== \"string\" → ошибка. Функция требует строку.",
        example: {
          input: "42 (number)",
          expectedOutput: "Ошибка: Аргумент должен быть строкой",
          category: "Недопустимый тип",
        },
      },
    ],
    keyTakeaways: [
      "Три формата: десятичный (по умолчанию), hex (0x), binary (0b)",
      "Пустая строка → NaN, не 0 — важное отличие",
      "trim() обрабатывает пробелы — «  42  » = «42»",
      "Не строковый тип → ошибка, не NaN",
    ],
  },
  {
    taskId: 14,
    taskName: "Распаковка массива",
    introduction:
      "flattenArray(arr) рекурсивно распаковывает вложенный массив. Основная сложность — " +
      "проверить корректность работы с глубокими вложенностями и пустыми массивами.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ алгоритма",
        action: "Изучаем: рекурсивный reduce + concat. Если элемент массив — вызываем flatten рекурсивно",
        reasoning:
          "Рекурсивный подход: каждый элемент проверяется через Array.isArray. Если массив — рекурсия, иначе — заворачиваем в [v].",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC2: Плоский массив",
        action: "Тестируем [1, 2, 3] — ожидаем [1, 2, 3]",
        reasoning:
          "Базовый случай: нет вложенности. Каждый элемент просто добавляется в результат.",
        example: {
          input: "[1, 2, 3]",
          expectedOutput: "[1, 2, 3]",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC1: Пустой массив",
        action: "Тестируем [] — ожидаем []",
        reasoning:
          "Пустой массив → пустой результат. reduce с начальным [] вернёт [].",
        example: {
          input: "[]",
          expectedOutput: "[]",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: Один уровень вложенности",
        action: "Тестируем [[1, 2], [3, 4]] — ожидаем [1, 2, 3, 4]",
        reasoning:
          "flatten([[1,2],[3,4]]): [1,2] → flatten([1,2]) = [1,2], [3,4] → [3,4]. concat → [1,2,3,4].",
        example: {
          input: "[[1, 2], [3, 4]]",
          expectedOutput: "[1, 2, 3, 4]",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: Глубокая вложенность",
        action: "Тестируем [1, [2, [3, [4]]]] — ожидаем [1, 2, 3, 4]",
        reasoning:
          "4 уровня: [1, [2, [3, [4]]]] → flatten рекурсивно раскрывает каждый уровень. Важно: рекурсия не зациклится.",
        example: {
          input: "[1, [2, [3, [4]]]]",
          expectedOutput: "[1, 2, 3, 4]",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5: Массив с null/undefined",
        action: "Тестируем [1, null, undefined, 2] — ожидаем [1, null, undefined, 2]",
        reasoning:
          "null и undefined НЕ являются массивами → они оборачиваются в [v] и добавляются. flatten не фильтрует их.",
        example: {
          input: "[1, null, undefined, 2]",
          expectedOutput: "[1, null, undefined, 2]",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 7,
        title: "EC6: Разные типы",
        action: "Тестируем [1, \"a\", true, { x: 1 }] — ожидаем [1, \"a\", true, { x: 1 }]",
        reasoning:
          "flatten работает только с массивами. Объекты, строки, числа, булевы — всё сохраняется как есть.",
        example: {
          input: "[1, \"a\", true, { x: 1 }]",
          expectedOutput: "[1, \"a\", true, { x: 1 }]",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 8,
        title: "EC7: Не массив — ошибка",
        action: "Тестируем «not array» — ожидаем ошибку",
        reasoning:
          "Функция ожидает массив. Передача строки/числа/null должна выбросить ошибку. Array.isArray проверяет тип.",
        example: {
          input: "\"not array\"",
          expectedOutput: "Ошибка: Аргумент должен быть массивом",
          category: "Недопустимый тип",
        },
      },
      {
        stepNumber: 9,
        title: "Пустой вложенный массив",
        action: "Тестируем [[], [1, []], 2] — ожидаем [1, 2]",
        reasoning:
          "flatten([]) = []. Пустые вложенные массивы просто исчезают при concat. [[]] → [].",
        example: {
          input: "[[], [1, []], 2]",
          expectedOutput: "[1, 2]",
          category: "Граничное значение",
        },
      },
    ],
    keyTakeaways: [
      "Рекурсивный reduce + concat — элегантное решение для произвольной глубины",
      "Пустые вложенные массивы [[]] → [] (просто исчезают)",
      "null, undefined, объекты — не распаковываются, сохраняются как есть",
      "Глубокая вложенность (3+ уровня) проверяет корректность рекурсии",
    ],
  },
  {
    taskId: 15,
    taskName: "Число Фибоначчи",
    introduction:
      "fibonacci(n) вычисляет n-е число Фибоначчи итеративно: F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2). " +
      "Диапазон 0–75 для предотвращения переполнения.",
    steps: [
      {
        stepNumber: 1,
        title: "Анализ функции",
        action: "Изучаем: проверка целого, n>=0, n<=75, итеративный цикл от 2 до n",
        reasoning:
          "Итеративный подход (не рекурсивный!) — O(n) времени, O(1) памяти. a=0, b=1, на каждой итерации: t=a+b, a=b, b=t.",
        example: undefined,
      },
      {
        stepNumber: 2,
        title: "EC1: F(0) = 0",
        action: "Тестируем n=0 — ожидаем 0",
        reasoning:
          "Базовый случай: F(0) = 0 по определению. Граничный: n < 0 → ошибка.",
        example: {
          input: "0",
          expectedOutput: "0",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 3,
        title: "EC2: F(1) = 1",
        action: "Тестируем n=1 — ожидаем 1",
        reasoning:
          "Базовый случай: F(1) = 1. Цикл for не выполняется (i=2 > n=1), сразу return b=1.",
        example: {
          input: "1",
          expectedOutput: "1",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 4,
        title: "EC3: F(5) = 5",
        action: "Тестируем n=5 — ожидаем 5",
        reasoning:
          "F(0)=0, F(1)=1, F(2)=1, F(3)=2, F(4)=3, F(5)=5. Последовательность: 0,1,1,2,3,5,8,13...",
        example: {
          input: "5",
          expectedOutput: "5",
          category: "Нормальное значение",
        },
      },
      {
        stepNumber: 5,
        title: "EC4: F(75) — максимальное значение",
        action: "Тестируем n=75 — ожидаем 2111485077978050",
        reasoning:
          "F(75) ≈ 2.1 × 10¹⁵ — помещается в Number.MAX_SAFE_INTEGER. n=76 → 2.7 × 10¹⁵ — всё ещё безопасно, но лимит 75 для запаса.",
        example: {
          input: "75",
          expectedOutput: "2111485077978050",
          category: "Граничное значение",
        },
      },
      {
        stepNumber: 6,
        title: "EC5: n < 0 — ошибка",
        action: "Тестируем n=-1 — ожидаем ошибку",
        reasoning:
          "Фибоначчи не определён для отрицательных. n=-1 → «Фибоначчи не определён для отрицательных чисел».",
        example: {
          input: "-1",
          expectedOutput: "Ошибка: Фибоначчи не определён для отрицательных чисел",
          category: "Исключение",
        },
      },
      {
        stepNumber: 7,
        title: "EC6: n > 75 — ошибка",
        action: "Тестируем n=76 — ожидаем ошибку",
        reasoning:
          "n=76 превышает лимит. «Переполнение: n > 75». Лимит предотвращает потерю точности при больших числах.",
        example: {
          input: "76",
          expectedOutput: "Ошибка: Переполнение: n > 75",
          category: "Исключение",
        },
      },
      {
        stepNumber: 8,
        title: "EC7: Не целое число — ошибка",
        action: "Тестируем n=3.5 — ожидаем ошибку",
        reasoning:
          "F(3.5) не имеет смысла. Number.isInteger(3.5) = false → ошибка.",
        example: {
          input: "3.5",
          expectedOutput: "Ошибка: Аргумент должен быть целым числом",
          category: "Недопустимый тип",
        },
      },
    ],
    keyTakeaways: [
      "Базовые случаи: F(0)=0, F(1)=1 — не вычисляются, возвращаются напрямую",
      "Итеративный подход: O(n) время, O(1) память (не экспоненциальный!)",
      "Диапазон 0–75: предотвращает переполнение Number.MAX_SAFE_INTEGER",
      "Последовательность: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89...",
    ],
  },
];

export function getWorkedExample(taskId: number): WorkedExample | undefined {
  return workedExamples.find((ex) => ex.taskId === taskId);
}

export function getAvailableWorkedExamples(): { taskId: number; taskName: string }[] {
  return workedExamples.map((ex) => ({ taskId: ex.taskId, taskName: ex.taskName }));
}
