(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Documents/GitHub/test-trainer/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$test$2d$trainer$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/test-trainer/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$test$2d$trainer$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/test-trainer/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$test$2d$trainer$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$test$2d$trainer$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/GitHub/test-trainer/src/lib/tasks.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getTaskById",
    ()=>getTaskById,
    "referenceFunctions",
    ()=>referenceFunctions,
    "runReferenceFunction",
    ()=>runReferenceFunction,
    "tasks",
    ()=>tasks
]);
// Reference functions
function factorial(n) {
    if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
    if (n < 0) throw new Error("Факториал не определён для отрицательных чисел");
    if (n > 20) throw new Error("Переполнение: n > 20");
    if (n === 0) return 1;
    let result = 1;
    for(let i = 2; i <= n; i++)result *= i;
    return result;
}
function isPrime(n) {
    if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for(let i = 5; i * i <= n; i += 6){
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}
function applyDiscount(price, discountPercent) {
    if (typeof price !== "number" || typeof discountPercent !== "number" || isNaN(price) || isNaN(discountPercent)) throw new Error("Аргументы должны быть числами");
    if (price < 0) throw new Error("Цена не может быть отрицательной");
    if (discountPercent < 0) throw new Error("Скидка не может быть отрицательной");
    if (discountPercent > 100) throw new Error("Скидка не может превышать 100%");
    return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}
function isLeapYear(year) {
    if (!Number.isInteger(year)) throw new Error("Год должен быть целым числом");
    if (year <= 0) throw new Error("Год должен быть положительным");
    return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
}
function triangleType(a, b, c) {
    if ([
        a,
        b,
        c
    ].some((v)=>typeof v !== "number" || isNaN(v))) throw new Error("Стороны должны быть числами");
    if (a <= 0 || b <= 0 || c <= 0) throw new Error("Стороны должны быть положительными");
    if (a + b <= c || a + c <= b || b + c <= a) return "не треугольник";
    if (a === b && b === c) return "равносторонний";
    if (a === b || b === c || a === c) return "равнобедренный";
    return "разносторонний";
}
function toRoman(n) {
    if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
    if (n < 1) throw new Error("Число должно быть больше 0");
    if (n > 3999) throw new Error("Число не должно превышать 3999");
    const vals = [
        1000,
        900,
        500,
        400,
        100,
        90,
        50,
        40,
        10,
        9,
        5,
        4,
        1
    ];
    const syms = [
        "M",
        "CM",
        "D",
        "CD",
        "C",
        "XC",
        "L",
        "XL",
        "X",
        "IX",
        "V",
        "IV",
        "I"
    ];
    let result = "";
    for(let i = 0; i < vals.length; i++){
        while(n >= vals[i]){
            result += syms[i];
            n -= vals[i];
        }
    }
    return result;
}
function isValidDate(day, month, year) {
    if ([
        day,
        month,
        year
    ].some((v)=>typeof v !== "number" || isNaN(v))) throw new Error("Аргументы должны быть числами");
    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) throw new Error("Аргументы должны быть целыми числами");
    if (month < 1 || month > 12) return false;
    if (day < 1) return false;
    const isLeap = year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
    const daysInMonth = [
        31,
        isLeap ? 29 : 28,
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31
    ];
    if (day > daysInMonth[month - 1]) return false;
    return true;
}
function validatePassword(password) {
    if (typeof password !== "string") throw new Error("Пароль должен быть строкой");
    const errors = [];
    if (password.length < 8) errors.push("Минимум 8 символов");
    if (!/[A-ZА-ЯЁ]/.test(password)) errors.push("Хотя бы одна заглавная буква");
    if (!/[a-zа-яё]/.test(password)) errors.push("Хотя бы одна строчная буква");
    if (!/[0-9]/.test(password)) errors.push("Хотя бы одна цифра");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push("Хотя бы один спецсимвол");
    return {
        valid: errors.length === 0,
        errors
    };
}
const referenceFunctions = {
    1: (args)=>factorial(args[0]),
    2: (args)=>isPrime(args[0]),
    3: (args)=>applyDiscount(args[0], args[1]),
    4: (args)=>isLeapYear(args[0]),
    5: (args)=>triangleType(args[0], args[1], args[2]),
    6: (args)=>validatePassword(args[0]),
    7: (args)=>{
        const str = args[0];
        if (typeof str !== "string") throw new Error("Аргумент должен быть строкой");
        const cleaned = str.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
        return cleaned === cleaned.split("").reverse().join("");
    },
    8: (args)=>{
        const email = args[0];
        if (typeof email !== "string") throw new Error("Аргумент должен быть строкой");
        const errors = [];
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
        return {
            valid: errors.length === 0,
            errors
        };
    },
    9: (args)=>toRoman(args[0]),
    10: (args)=>isValidDate(args[0], args[1], args[2])
};
const tasks = [
    {
        id: 1,
        name: "Факториал",
        difficulty: "Легко",
        description: "Вычисляет факториал целого неотрицательного числа n. Факториал нуля равен 1, для чисел больше 20 происходит переполнение.",
        signature: "factorial(n: number): number",
        topics: [
            "Классы эквивалентности",
            "Граничные значения"
        ],
        params: [
            {
                name: "n",
                type: "number",
                description: "Целое неотрицательное число (0–20)"
            }
        ],
        returnType: "number",
        code: `function factorial(n: number): number {
  if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
  if (n < 0) throw new Error("Факториал не определён для отрицательных чисел");
  if (n > 20) throw new Error("Переполнение: n > 20");
  if (n === 0) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}`,
        equivalenceClasses: [
            {
                id: "ec1",
                name: "EC1: n = 0",
                description: "Граничное значение — факториал 0 равен 1",
                exampleValues: [
                    0
                ]
            },
            {
                id: "ec2",
                name: "EC2: 1 ≤ n ≤ 20",
                description: "Нормальные значения",
                exampleValues: [
                    1,
                    5,
                    10,
                    20
                ]
            },
            {
                id: "ec3",
                name: "EC3: n < 0",
                description: "Недопустимые — ошибка",
                exampleValues: [
                    -1,
                    -5
                ]
            },
            {
                id: "ec4",
                name: "EC4: n > 20",
                description: "Переполнение",
                exampleValues: [
                    21,
                    100
                ]
            },
            {
                id: "ec5",
                name: "EC5: n — не число",
                description: "Недопустимый тип",
                exampleValues: [
                    1.5,
                    "abc",
                    null
                ]
            }
        ],
        boundaryValues: [
            {
                value: 0,
                description: "Нижняя граница (факториал = 1)"
            },
            {
                value: 1,
                description: "Минимальное положительное"
            },
            {
                value: 19,
                description: "Предпоследнее допустимое"
            },
            {
                value: 20,
                description: "Верхняя граница допустимых"
            },
            {
                value: 21,
                description: "Переполнение"
            },
            {
                value: -1,
                description: "Первая недопустимая"
            }
        ]
    },
    {
        id: 2,
        name: "Простое число",
        difficulty: "Средне",
        description: "Проверяет, является ли целое число n простым. Простое число — это натуральное число больше 1, которое делится только на 1 и на себя.",
        signature: "isPrime(n: number): boolean",
        topics: [
            "Классы эквивалентности",
            "Граничные значения",
            "Нелинейные классы"
        ],
        params: [
            {
                name: "n",
                type: "number",
                description: "Целое число для проверки"
            }
        ],
        returnType: "boolean",
        code: `function isPrime(n: number): boolean {
  if (!Number.isInteger(n)) throw new Error("Аргумент должен быть целым числом");
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}`,
        equivalenceClasses: [
            {
                id: "ec1",
                name: "EC1: n ≤ 1",
                description: "Недопустимые — не являются простыми",
                exampleValues: [
                    0,
                    1,
                    -3
                ]
            },
            {
                id: "ec2",
                name: "EC2: n = 2",
                description: "Единственное чётное простое число",
                exampleValues: [
                    2
                ]
            },
            {
                id: "ec3",
                name: "EC3: Простое нечётное",
                description: "Нечётные простые числа",
                exampleValues: [
                    3,
                    5,
                    7,
                    11,
                    13
                ]
            },
            {
                id: "ec4",
                name: "EC4: Составное число",
                description: "Числа, которые не являются простыми",
                exampleValues: [
                    4,
                    6,
                    8,
                    9,
                    10
                ]
            },
            {
                id: "ec5",
                name: "EC5: Большое число",
                description: "Проверка на больших значениях",
                exampleValues: [
                    997,
                    1000,
                    7919
                ]
            },
            {
                id: "ec6",
                name: "EC6: n — не число",
                description: "Недопустимый тип",
                exampleValues: [
                    1.5,
                    "abc",
                    null
                ]
            }
        ],
        boundaryValues: [
            {
                value: 0,
                description: "Нижняя граница"
            },
            {
                value: 1,
                description: "Не простое"
            },
            {
                value: 2,
                description: "Наименьшее простое"
            },
            {
                value: 3,
                description: "Наименьшее нечётное простое"
            },
            {
                value: 4,
                description: "Наименьшее составное"
            }
        ]
    },
    {
        id: 3,
        name: "Калькулятор скидки",
        difficulty: "Средне",
        description: "Применяет скидку к цене. Принимает цену и процент скидки, возвращает итоговую сумму со скидкой. Скидка округляется до 2 знаков.",
        signature: "applyDiscount(price: number, discountPercent: number): number",
        topics: [
            "Классы эквивалентности",
            "Граничные значения",
            "Многофакторное тестирование"
        ],
        params: [
            {
                name: "price",
                type: "number",
                description: "Цена товара (> 0)"
            },
            {
                name: "discountPercent",
                type: "number",
                description: "Процент скидки (0–100)"
            }
        ],
        returnType: "number",
        code: `function applyDiscount(price: number, discountPercent: number): number {
  if (typeof price !== 'number' || typeof discountPercent !== 'number' || isNaN(price) || isNaN(discountPercent))
    throw new Error("Аргументы должны быть числами");
  if (price < 0) throw new Error("Цена не может быть отрицательной");
  if (discountPercent < 0) throw new Error("Скидка не может быть отрицательной");
  if (discountPercent > 100) throw new Error("Скидка не может превышать 100%");
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}`,
        equivalenceClasses: [
            {
                id: "ec1",
                name: "EC1: Без скидки",
                description: "price > 0, discountPercent = 0",
                exampleValues: [
                    [
                        100,
                        0
                    ]
                ]
            },
            {
                id: "ec2",
                name: "EC2: Частичная скидка",
                description: "price > 0, 0 < discountPercent < 100",
                exampleValues: [
                    [
                        100,
                        25
                    ],
                    [
                        500,
                        50
                    ]
                ]
            },
            {
                id: "ec3",
                name: "EC3: Бесплатно",
                description: "price > 0, discountPercent = 100",
                exampleValues: [
                    [
                        100,
                        100
                    ]
                ]
            },
            {
                id: "ec4",
                name: "EC4: price = 0",
                description: "Нулевая цена",
                exampleValues: [
                    [
                        0,
                        50
                    ]
                ]
            },
            {
                id: "ec5",
                name: "EC5: price < 0",
                description: "Недопустимая цена",
                exampleValues: [
                    [
                        -100,
                        10
                    ]
                ]
            },
            {
                id: "ec6",
                name: "EC6: discountPercent < 0",
                description: "Отрицательная скидка",
                exampleValues: [
                    [
                        100,
                        -10
                    ]
                ]
            },
            {
                id: "ec7",
                name: "EC7: discountPercent > 100",
                description: "Скидка больше 100%",
                exampleValues: [
                    [
                        100,
                        150
                    ]
                ]
            },
            {
                id: "ec8",
                name: "EC8: Нечисловые аргументы",
                description: "Неверный тип аргументов",
                exampleValues: [
                    [
                        "abc",
                        10
                    ],
                    [
                        100,
                        "abc"
                    ]
                ]
            }
        ],
        boundaryValues: [
            {
                value: [
                    0.01,
                    0
                ],
                description: "Минимальная цена, без скидки"
            },
            {
                value: [
                    0,
                    0
                ],
                description: "Нулевая цена"
            },
            {
                value: [
                    100,
                    0
                ],
                description: "Скидка 0%"
            },
            {
                value: [
                    100,
                    1
                ],
                description: "Минимальная скидка"
            },
            {
                value: [
                    100,
                    99
                ],
                description: "Максимальная частичная скидка"
            },
            {
                value: [
                    100,
                    100
                ],
                description: "Полная скидка"
            },
            {
                value: [
                    100,
                    101
                ],
                description: "Скидка > 100%"
            }
        ]
    },
    {
        id: 4,
        name: "Високосный год",
        difficulty: "Легко",
        description: "Проверяет, является ли год високосным. Год високосный, если он делится на 4, но не на 100, за исключением годов, делящихся на 400.",
        signature: "isLeapYear(year: number): boolean",
        topics: [
            "Классы эквивалентности",
            "Граничные значения",
            "Логические условия"
        ],
        params: [
            {
                name: "year",
                type: "number",
                description: "Год (положительное целое число)"
            }
        ],
        returnType: "boolean",
        code: `function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year)) throw new Error("Год должен быть целым числом");
  if (year <= 0) throw new Error("Год должен быть положительным");
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}`,
        equivalenceClasses: [
            {
                id: "ec1",
                name: "EC1: Делится на 400",
                description: "Високосный год (правило 400)",
                exampleValues: [
                    1600,
                    2000,
                    2400
                ]
            },
            {
                id: "ec2",
                name: "EC2: Делится на 100, но не на 400",
                description: "Не високосный год (исключение 100)",
                exampleValues: [
                    1700,
                    1800,
                    1900,
                    2100
                ]
            },
            {
                id: "ec3",
                name: "EC3: Делится на 4, но не на 100",
                description: "Високосный год (правило 4)",
                exampleValues: [
                    2004,
                    2008,
                    2024,
                    2028
                ]
            },
            {
                id: "ec4",
                name: "EC4: Не делится на 4",
                description: "Обычный год",
                exampleValues: [
                    2023,
                    2025,
                    2026
                ]
            },
            {
                id: "ec5",
                name: "EC5: year ≤ 0",
                description: "Недопустимое значение",
                exampleValues: [
                    0,
                    -1,
                    -100
                ]
            },
            {
                id: "ec6",
                name: "EC6: Нечисловой аргумент",
                description: "Недопустимый тип",
                exampleValues: [
                    1.5,
                    "2024",
                    null
                ]
            }
        ],
        boundaryValues: [
            {
                value: 1600,
                description: "Високосный (÷400)"
            },
            {
                value: 1700,
                description: "Не високосный (÷100, не ÷400)"
            },
            {
                value: 2000,
                description: "Високосный (÷400)"
            },
            {
                value: 2004,
                description: "Високосный (÷4, не ÷100)"
            },
            {
                value: 2024,
                description: "Високосный (÷4, не ÷100)"
            },
            {
                value: 2025,
                description: "Не високосный"
            },
            {
                value: 2100,
                description: "Не високосный (÷100, не ÷400)"
            }
        ]
    },
    {
        id: 5,
        name: "Треугольник",
        difficulty: "Сложно",
        description: "Определяет тип треугольника по трём сторонам. Возвращает «равносторонний», «равнобедренный», «разносторонний» или «не треугольник».",
        signature: "triangleType(a: number, b: number, c: number): string",
        topics: [
            "Классы эквивалентности",
            "Граничные значения",
            "Комбинаторное тестирование"
        ],
        params: [
            {
                name: "a",
                type: "number",
                description: "Первая сторона"
            },
            {
                name: "b",
                type: "number",
                description: "Вторая сторона"
            },
            {
                name: "c",
                type: "number",
                description: "Третья сторона"
            }
        ],
        returnType: "string",
        code: `function triangleType(a: number, b: number, c: number): string {
  if ([a, b, c].some(v => typeof v !== 'number' || isNaN(v))) throw new Error("Стороны должны быть числами");
  if (a <= 0 || b <= 0 || c <= 0) throw new Error("Стороны должны быть положительными");
  if (a + b <= c || a + c <= b || b + c <= a) return "не треугольник";
  if (a === b && b === c) return "равносторонний";
  if (a === b || b === c || a === c) return "равнобедренный";
  return "разносторонний";
}`,
        equivalenceClasses: [
            {
                id: "ec1",
                name: "EC1: Равносторонний",
                description: "Все три стороны равны",
                exampleValues: [
                    [
                        3,
                        3,
                        3
                    ],
                    [
                        5,
                        5,
                        5
                    ]
                ]
            },
            {
                id: "ec2",
                name: "EC2: Равнобедренный",
                description: "Две стороны равны",
                exampleValues: [
                    [
                        2,
                        2,
                        3
                    ],
                    [
                        5,
                        5,
                        8
                    ]
                ]
            },
            {
                id: "ec3",
                name: "EC3: Разносторонний",
                description: "Все стороны разные",
                exampleValues: [
                    [
                        3,
                        4,
                        5
                    ],
                    [
                        5,
                        7,
                        9
                    ]
                ]
            },
            {
                id: "ec4",
                name: "EC4: Не треугольник",
                description: "Не выполняется неравенство треугольника",
                exampleValues: [
                    [
                        1,
                        1,
                        3
                    ],
                    [
                        1,
                        2,
                        10
                    ]
                ]
            },
            {
                id: "ec5",
                name: "EC5: Сторона ≤ 0",
                description: "Недопустимые значения",
                exampleValues: [
                    [
                        -1,
                        2,
                        3
                    ],
                    [
                        0,
                        0,
                        0
                    ]
                ]
            },
            {
                id: "ec6",
                name: "EC6: Вырожденный",
                description: "Сумма двух сторон равна третьей",
                exampleValues: [
                    [
                        1,
                        2,
                        3
                    ],
                    [
                        2,
                        3,
                        5
                    ]
                ]
            },
            {
                id: "ec7",
                name: "EC7: Нечисловые аргументы",
                description: "Неверный тип аргументов",
                exampleValues: [
                    [
                        "a",
                        2,
                        3
                    ],
                    [
                        1,
                        null,
                        3
                    ]
                ]
            }
        ],
        boundaryValues: [
            {
                value: [
                    1,
                    1,
                    1
                ],
                description: "Равносторонний"
            },
            {
                value: [
                    2,
                    2,
                    3
                ],
                description: "Равнобедренный"
            },
            {
                value: [
                    3,
                    4,
                    5
                ],
                description: "Разносторонний"
            },
            {
                value: [
                    1,
                    2,
                    3
                ],
                description: "Вырожденный (не треугольник)"
            },
            {
                value: [
                    1,
                    1,
                    3
                ],
                description: "Не треугольник"
            }
        ]
    },
    {
        id: 6,
        name: "Валидация пароля",
        difficulty: "Сложно",
        description: "Проверяет пароль на соответствие требованиям безопасности: минимум 8 символов, хотя бы одна заглавная и одна строчная буква, хотя бы одна цифра и один спецсимвол.",
        signature: "validatePassword(password: string): { valid: boolean; errors: string[] }",
        topics: [
            "Классы эквивалентности",
            "Комбинаторное тестирование",
            "Проверка форматов"
        ],
        params: [
            {
                name: "password",
                type: "string",
                description: "Пароль для валидации"
            }
        ],
        returnType: "{ valid: boolean; errors: string[] }",
        code: `function validatePassword(password: string): { valid: boolean; errors: string[] } {
  if (typeof password !== 'string') throw new Error("Пароль должен быть строкой");
  const errors: string[] = [];
  if (password.length < 8) errors.push("Минимум 8 символов");
  if (!/[A-ZА-ЯЁ]/.test(password)) errors.push("Хотя бы одна заглавная буква");
  if (!/[a-zа-яё]/.test(password)) errors.push("Хотя бы одна строчная буква");
  if (!/[0-9]/.test(password)) errors.push("Хотя бы одна цифра");
  if (!/[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>\\/\\?]/.test(password)) errors.push("Хотя бы один спецсимвол");
  return { valid: errors.length === 0, errors };
}`,
        equivalenceClasses: [
            {
                id: "ec1",
                name: "EC1: Валидный пароль",
                description: "Соответствует всем требованиям",
                exampleValues: [
                    "Abc123!@",
                    "MyPass99#"
                ]
            },
            {
                id: "ec2",
                name: "EC2: Длина < 8",
                description: "Слишком короткий",
                exampleValues: [
                    "Ab1!",
                    "A1!a"
                ]
            },
            {
                id: "ec3",
                name: "EC3: Нет заглавных",
                description: "Отсутствуют заглавные буквы",
                exampleValues: [
                    "abcdef12!"
                ]
            },
            {
                id: "ec4",
                name: "EC4: Нет строчных",
                description: "Отсутствуют строчные буквы",
                exampleValues: [
                    "ABCDEF12!"
                ]
            },
            {
                id: "ec5",
                name: "EC5: Нет цифр",
                description: "Отсутствуют цифры",
                exampleValues: [
                    "Abcdefgh!"
                ]
            },
            {
                id: "ec6",
                name: "EC6: Нет спецсимволов",
                description: "Отсутствуют спецсимволы",
                exampleValues: [
                    "Abcdef12"
                ]
            },
            {
                id: "ec7",
                name: "EC7: Комбинации нарушений",
                description: "Несколько нарушений одновременно",
                exampleValues: [
                    "abc",
                    "ABC",
                    "12345678"
                ]
            },
            {
                id: "ec8",
                name: "EC8: Пустая строка",
                description: "Пустой пароль",
                exampleValues: [
                    ""
                ]
            },
            {
                id: "ec9",
                name: "EC9: Не строковый тип",
                description: "Неверный тип",
                exampleValues: [
                    123,
                    null,
                    undefined
                ]
            }
        ],
        boundaryValues: [
            {
                value: "Abcdefg1!",
                description: "Минимальный валидный (8 символов)"
            },
            {
                value: "Abcdef1!",
                description: "7 символов (недостаточно)"
            },
            {
                value: "",
                description: "Пустая строка"
            },
            {
                value: "ABCDEFG1!",
                description: "Нет строчных"
            },
            {
                value: "abcdefg1!",
                description: "Нет заглавных"
            },
            {
                value: "Abcdefgh!",
                description: "Нет цифр"
            },
            {
                value: "Abcdefg12",
                description: "Нет спецсимволов"
            }
        ]
    },
    {
        id: 7,
        name: "Палиндром",
        difficulty: "Средне",
        description: "Функция проверяет, является ли строка палиндромом (читается одинаково слева направо и справа налево). Учитываются только буквы и цифры, регистр игнорируется. Пустая строка считается палиндромом.",
        signature: "isPalindrome(str: string): boolean",
        topics: [
            "Классы эквивалентности",
            "Граничные значения",
            "Обработка строк"
        ],
        params: [
            {
                name: "str",
                type: "string",
                description: "Проверяемая строка"
            }
        ],
        returnType: "boolean",
        code: `function isPalindrome(str: string): boolean {
  if (typeof str !== "string") {
    throw new Error("Аргумент должен быть строкой");
  }
  const cleaned = str.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
  return cleaned === cleaned.split("").reverse().join("");
}`,
        equivalenceClasses: [
            {
                id: "ec1",
                name: "EC1: Палиндром (латиница)",
                description: "Строка-палиндром из латинских букв",
                exampleValues: [
                    "aba",
                    "racecar"
                ]
            },
            {
                id: "ec2",
                name: "EC2: Палиндром (кириллица)",
                description: "Строка-палиндром из русских букв",
                exampleValues: [
                    "Анна",
                    "казак"
                ]
            },
            {
                id: "ec3",
                name: "EC3: Не палиндром",
                description: "Строка, не являющаяся палиндромом",
                exampleValues: [
                    "hello",
                    "тест"
                ]
            },
            {
                id: "ec4",
                name: "EC4: Палиндром с пробелами/знаками",
                description: "Палиндром с пробелами, знаками препинания или цифрами",
                exampleValues: [
                    "A man a plan a canal Panama",
                    "12321",
                    "Madam, I'm Adam"
                ]
            },
            {
                id: "ec5",
                name: "EC5: Пустая строка",
                description: "Пустая строка (считается палиндромом)",
                exampleValues: [
                    ""
                ]
            },
            {
                id: "ec6",
                name: "EC6: Один символ",
                description: "Строка из одного символа (всегда палиндром)",
                exampleValues: [
                    "a",
                    "Я"
                ]
            },
            {
                id: "ec7",
                name: "EC7: Недопустимый тип",
                description: "Аргумент не является строкой",
                exampleValues: [
                    123,
                    null
                ]
            }
        ],
        boundaryValues: [
            {
                value: "",
                description: "Пустая строка (нижняя граница длины)"
            },
            {
                value: "a",
                description: "Один символ (минимальная длина)"
            },
            {
                value: "aa",
                description: "Два одинаковых символа"
            },
            {
                value: "ab",
                description: "Два разных символа (минимальный не-палиндром)"
            },
            {
                value: "A",
                description: "Один символ, верхний регистр"
            },
            {
                value: "a b a",
                description: "Палиндром с пробелом"
            },
            {
                value: "12321",
                description: "Числовой палиндром"
            }
        ]
    },
    {
        id: 8,
        name: "Валидация email",
        difficulty: "Сложно",
        description: "Функция проверяет корректность email-адреса по следующим правилам: содержит ровно один символ @, локальная часть (до @) не пустая и содержит только буквы, цифры, точки и дефисы, доменная часть (после @) содержит хотя бы одну точку, домен верхнего уровня — от 2 до 6 букв.",
        signature: "validateEmail(email: string): { valid: boolean; errors: string[] }",
        topics: [
            "Классы эквивалентности",
            "Граничные значения",
            "Комбинаторное тестирование",
            "Формат проверок"
        ],
        params: [
            {
                name: "email",
                type: "string",
                description: "Проверяемый email-адрес"
            }
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
            {
                id: "ec1",
                name: "EC1: Валидный email",
                description: "Корректный email-адрес",
                exampleValues: [
                    "user@example.com",
                    "test.name@domain.org"
                ]
            },
            {
                id: "ec2",
                name: "EC2: Нет символа @",
                description: "Строка без символа @",
                exampleValues: [
                    "userexample.com",
                    "plaintext"
                ]
            },
            {
                id: "ec3",
                name: "EC3: Несколько символов @",
                description: "Более одного @ в строке",
                exampleValues: [
                    "user@@example.com",
                    "a@b@c.com"
                ]
            },
            {
                id: "ec4",
                name: "EC4: Пустая локальная часть",
                description: "Локальная часть до @ пустая",
                exampleValues: [
                    "@example.com"
                ]
            },
            {
                id: "ec5",
                name: "EC5: Недопустимые символы в локальной части",
                description: "Локальная часть содержит недопустимые символы",
                exampleValues: [
                    "user name@test.com",
                    "user+tag@test.com"
                ]
            },
            {
                id: "ec6",
                name: "EC6: Пустая доменная часть",
                description: "Доменная часть после @ пустая",
                exampleValues: [
                    "user@"
                ]
            },
            {
                id: "ec7",
                name: "EC7: Домен без точки",
                description: "Домен не содержит точки",
                exampleValues: [
                    "user@localhost",
                    "user@example"
                ]
            },
            {
                id: "ec8",
                name: "EC8: Слишком короткий TLD",
                description: "Домен верхнего уровня менее 2 символов",
                exampleValues: [
                    "user@example.c",
                    "user@example.a"
                ]
            },
            {
                id: "ec9",
                name: "EC9: Слишком длинный TLD",
                description: "Домен верхнего уровня более 6 символов",
                exampleValues: [
                    "user@example.abcdefg"
                ]
            },
            {
                id: "ec10",
                name: "EC10: Пустая строка",
                description: "Пустая строка вместо email",
                exampleValues: [
                    ""
                ]
            },
            {
                id: "ec11",
                name: "EC11: Недопустимый тип",
                description: "Аргумент не является строкой",
                exampleValues: [
                    123,
                    null,
                    undefined
                ]
            }
        ],
        boundaryValues: [
            {
                value: "a@b.cd",
                description: "Минимально возможный валидный email"
            },
            {
                value: "a@b.c",
                description: "TLD из 1 символа (слишком короткий)"
            },
            {
                value: "a@b.cdefgh",
                description: "TLD из 6 символов (максимальный)"
            },
            {
                value: "a@b.cdefghi",
                description: "TLD из 7 символов (слишком длинный)"
            },
            {
                value: "@example.com",
                description: "Пустая локальная часть"
            },
            {
                value: "user@",
                description: "Пустая доменная часть"
            },
            {
                value: "a b@example.com",
                description: "Пробел в локальной части"
            },
            {
                value: "",
                description: "Пустая строка"
            }
        ]
    },
    {
        id: 9,
        name: "Римские цифры",
        difficulty: "Средне",
        description: "Преобразует целое число в строку римских цифр. Поддерживает числа от 1 до 3999. Для некорректных входных данных выбрасывает исключение.",
        signature: "toRoman(n: number): string",
        topics: [
            "Классы эквивалентности",
            "Граничные значения",
            "Обработка строк"
        ],
        params: [
            {
                name: "n",
                type: "number",
                description: "Целое число от 1 до 3999"
            }
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
                exampleValues: [
                    1
                ]
            },
            {
                id: "ec2",
                name: "EC2: 2 ≤ n ≤ 3998",
                description: "Нормальные значения",
                exampleValues: [
                    2,
                    5,
                    42,
                    3998
                ]
            },
            {
                id: "ec3",
                name: "EC3: n = 3999",
                description: "Максимальное значение",
                exampleValues: [
                    3999
                ]
            },
            {
                id: "ec4",
                name: "EC4: n < 1",
                description: "Недопустимые — слишком маленькое",
                exampleValues: [
                    0,
                    -5
                ]
            },
            {
                id: "ec5",
                name: "EC5: n > 3999",
                description: "Недопустимые — слишком большое",
                exampleValues: [
                    4000,
                    5000
                ]
            },
            {
                id: "ec6",
                name: "EC6: n — не целое число",
                description: "Недопустимый тип",
                exampleValues: [
                    1.5,
                    "abc",
                    null
                ]
            }
        ],
        boundaryValues: [
            {
                value: 1,
                description: "Минимальное число (I)"
            },
            {
                value: 4,
                description: "IV — специальный символ вычитания"
            },
            {
                value: 5,
                description: "V — базовый символ"
            },
            {
                value: 9,
                description: "IX — вычитание"
            },
            {
                value: 10,
                description: "X — базовый символ"
            },
            {
                value: 3999,
                description: "Максимальное число (MMMCMXCIX)"
            },
            {
                value: 4000,
                description: "Превышение максимума"
            },
            {
                value: 0,
                description: "Ниже минимума"
            }
        ]
    },
    {
        id: 10,
        name: "Валидация даты",
        difficulty: "Сложно",
        description: "Проверяет, является ли заданная дата корректной с учётом високосных годов, количества дней в месяцах и т.д. Принимает день, месяц и год.",
        signature: "isValidDate(day: number, month: number, year: number): boolean",
        topics: [
            "Классы эквивалентности",
            "Граничные значения",
            "Комбинаторное тестирование",
            "Логические условия"
        ],
        params: [
            {
                name: "day",
                type: "number",
                description: "День (1-31)"
            },
            {
                name: "month",
                type: "number",
                description: "Месяц (1-12)"
            },
            {
                name: "year",
                type: "number",
                description: "Год"
            }
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
                exampleValues: [
                    [
                        15,
                        6,
                        2023
                    ],
                    [
                        1,
                        1,
                        2000
                    ]
                ]
            },
            {
                id: "ec2",
                name: "EC2: Валидная дата (високосный год, 29 февраля)",
                description: "29 февраля в високосный год",
                exampleValues: [
                    [
                        29,
                        2,
                        2024
                    ],
                    [
                        29,
                        2,
                        2000
                    ]
                ]
            },
            {
                id: "ec3",
                name: "EC3: Невалидный день (слишком большой)",
                description: "День превышает количество дней в месяце",
                exampleValues: [
                    [
                        31,
                        4,
                        2023
                    ],
                    [
                        32,
                        1,
                        2023
                    ]
                ]
            },
            {
                id: "ec4",
                name: "EC4: Невалидный день (29 февраля не в високосный)",
                description: "29 февраля в обычный год",
                exampleValues: [
                    [
                        29,
                        2,
                        2023
                    ],
                    [
                        29,
                        2,
                        1900
                    ]
                ]
            },
            {
                id: "ec5",
                name: "EC5: Невалидный месяц (< 1 или > 12)",
                description: "Месяц вне допустимого диапазона",
                exampleValues: [
                    [
                        1,
                        0,
                        2023
                    ],
                    [
                        1,
                        13,
                        2023
                    ]
                ]
            },
            {
                id: "ec6",
                name: "EC6: Невалидный день (day < 1)",
                description: "День меньше 1",
                exampleValues: [
                    [
                        0,
                        1,
                        2023
                    ],
                    [
                        -5,
                        6,
                        2023
                    ]
                ]
            },
            {
                id: "ec7",
                name: "EC7: Граничные дни месяца (30, 31)",
                description: "Дни на границе количества дней в месяце",
                exampleValues: [
                    [
                        30,
                        6,
                        2023
                    ],
                    [
                        31,
                        12,
                        2023
                    ]
                ]
            },
            {
                id: "ec8",
                name: "EC8: Нечисловые аргументы",
                description: "Неверный тип аргументов",
                exampleValues: [
                    [
                        "a",
                        1,
                        2023
                    ],
                    [
                        1,
                        null,
                        2023
                    ]
                ]
            }
        ],
        boundaryValues: [
            {
                value: [
                    1,
                    1,
                    2023
                ],
                description: "Минимальные day и month"
            },
            {
                value: [
                    31,
                    12,
                    2023
                ],
                description: "Максимальные day и month"
            },
            {
                value: [
                    29,
                    2,
                    2024
                ],
                description: "29 февраля в високосный год"
            },
            {
                value: [
                    29,
                    2,
                    2023
                ],
                description: "29 февраля в невисокосный год"
            },
            {
                value: [
                    28,
                    2,
                    2023
                ],
                description: "28 февраля (максимум в невисокосный)"
            },
            {
                value: [
                    30,
                    2,
                    2023
                ],
                description: "30 февраля (невалидно)"
            },
            {
                value: [
                    31,
                    4,
                    2023
                ],
                description: "31 апреля (невалидно)"
            },
            {
                value: [
                    0,
                    1,
                    2023
                ],
                description: "День = 0"
            },
            {
                value: [
                    1,
                    13,
                    2023
                ],
                description: "Месяц > 12"
            },
            {
                value: [
                    1,
                    0,
                    2023
                ],
                description: "Месяц < 1"
            }
        ]
    }
];
function getTaskById(id) {
    return tasks.find((t)=>t.id === id);
}
function runReferenceFunction(taskId, args) {
    const fn = referenceFunctions[taskId];
    if (!fn) return {
        result: undefined,
        error: "Функция не найдена"
    };
    try {
        const result = fn(args);
        return {
            result,
            error: null
        };
    } catch (e) {
        return {
            result: undefined,
            error: e.message
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/GitHub/test-trainer/src/lib/evaluator.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "evaluateTestCases",
    ()=>evaluateTestCases
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$test$2d$trainer$2f$src$2f$lib$2f$tasks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/test-trainer/src/lib/tasks.ts [app-client] (ecmascript)");
;
function normalizeValue(val) {
    if (val === undefined || val === null) return String(val);
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
}
function parseInputValue(raw) {
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
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            return num;
        }
    }
    // Try parsing as JSON (for objects, arrays)
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "object" || Array.isArray(parsed)) return parsed;
    } catch  {
    // Not JSON
    }
    // Return as string
    return trimmed;
}
function matchBoundaryValue(inputs, boundaryValue) {
    const bv = boundaryValue;
    // If boundary is array, compare with inputs array
    if (Array.isArray(bv)) {
        if (inputs.length !== bv.length) return false;
        return bv.every((val, i)=>{
            const parsed = inputs[i];
            return normalizeValue(parsed) === normalizeValue(val);
        });
    }
    // Single value — compare with first input
    if (inputs.length === 1) {
        // Exact match
        if (normalizeValue(inputs[0]) === normalizeValue(bv)) return true;
        // Proximity match for numeric values (within ±1)
        const inputNum = Number(inputs[0]);
        const bvNum = Number(bv);
        if (!isNaN(inputNum) && !isNaN(bvNum) && typeof inputs[0] === 'number') {
            return Math.abs(inputNum - bvNum) <= 1;
        }
    }
    return false;
}
function findCoveredEquivalenceClasses(taskId, inputs, task) {
    const covered = [];
    // Run the function to see the result
    const { result, error } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$test$2d$trainer$2f$src$2f$lib$2f$tasks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["runReferenceFunction"])(taskId, inputs);
    for (const ec of task.equivalenceClasses){
        // Check if any example value matches
        for (const example of ec.exampleValues){
            if (Array.isArray(example)) {
                if (inputs.length === example.length) {
                    const match = example.every((val, i)=>normalizeValue(inputs[i]) === normalizeValue(val));
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
    if (error) {
        // Check if error matches EC descriptions
        for (const ec of task.equivalenceClasses){
            if (covered.includes(ec.id)) continue;
            const desc = ec.description.toLowerCase();
            if (desc.includes("недопустим") || desc.includes("ошибк") || desc.includes("переполнен") || desc.includes("неверный тип")) {
                // If we get an error and there's an error-related EC, cover it
                // But only if the input is in a reasonable range for that EC
                if (desc.includes("отрицательн") && inputs[0] !== undefined && Number(inputs[0]) < 0 || desc.includes("не число") && !Number.isInteger(inputs[0]) && typeof inputs[0] !== "number" || desc.includes("переполнен") && Number(inputs[0]) > 20 || desc.includes("превышает") && Number(inputs[1]) > 100 || desc.includes("отрицательн") && Number(inputs[1]) !== undefined && Number(inputs[1]) < 0) {
                    covered.push(ec.id);
                }
            }
        }
    }
    // Heuristic for specific tasks based on result
    for (const ec of task.equivalenceClasses){
        if (covered.includes(ec.id)) continue;
        if (taskId === 1) {
            // Factorial
            if (ec.id === "ec1" && inputs[0] === 0) covered.push(ec.id);
            if (ec.id === "ec2" && Number.isInteger(inputs[0]) && Number(inputs[0]) >= 1 && Number(inputs[0]) <= 20) covered.push(ec.id);
        }
        if (taskId === 2) {
            // isPrime
            if (ec.id === "ec1" && Number(inputs[0]) <= 1) covered.push(ec.id);
            if (ec.id === "ec2" && Number(inputs[0]) === 2) covered.push(ec.id);
            if (ec.id === "ec3" && result === true && Number(inputs[0]) > 2) covered.push(ec.id);
            if (ec.id === "ec4" && result === false && Number(inputs[0]) > 1) covered.push(ec.id);
        }
        if (taskId === 3) {
            // applyDiscount — improved heuristic based on result + input ranges
            const price = Number(inputs[0]);
            const discount = Number(inputs[1]);
            if (ec.id === "ec1" && !error && discount === 0 && price > 0) {
                covered.push(ec.id);
            }
            if (ec.id === "ec2" && !error && discount > 0 && discount < 100 && price > 0) {
                covered.push(ec.id);
            }
            if (ec.id === "ec3" && !error && discount === 100 && price > 0) {
                covered.push(ec.id);
            }
            if (ec.id === "ec4" && !error && price === 0) {
                covered.push(ec.id);
            }
            if (ec.id === "ec5" && error && typeof price === "number" && !isNaN(price) && price < 0) {
                covered.push(ec.id);
            }
            if (ec.id === "ec6" && error && typeof discount === "number" && !isNaN(discount) && discount < 0) {
                covered.push(ec.id);
            }
            if (ec.id === "ec7" && error && typeof discount === "number" && !isNaN(discount) && discount > 100) {
                covered.push(ec.id);
            }
            if (ec.id === "ec8" && error && (typeof inputs[0] !== "number" || typeof inputs[1] !== "number")) {
                covered.push(ec.id);
            }
        }
        if (taskId === 4) {
            // isLeapYear
            if (ec.id === "ec1" && Number(inputs[0]) % 400 === 0) covered.push(ec.id);
            if (ec.id === "ec2" && Number(inputs[0]) % 100 === 0 && Number(inputs[0]) % 400 !== 0) covered.push(ec.id);
            if (ec.id === "ec3" && Number(inputs[0]) % 4 === 0 && Number(inputs[0]) % 100 !== 0) covered.push(ec.id);
            if (ec.id === "ec4" && Number(inputs[0]) % 4 !== 0) covered.push(ec.id);
        }
        if (taskId === 5) {
            // triangle
            if (ec.id === "ec1" && result === "равносторонний") covered.push(ec.id);
            if (ec.id === "ec2" && result === "равнобедренный") covered.push(ec.id);
            if (ec.id === "ec3" && result === "разносторонний") covered.push(ec.id);
            if (ec.id === "ec4" && result === "не треугольник") covered.push(ec.id);
            if (ec.id === "ec6" && result === "не треугольник" && !error) {
                const [a, b, c] = inputs;
                if (a + b === c || a + c === b || b + c === a) covered.push(ec.id);
            }
        }
        if (taskId === 6) {
            // validatePassword — improved heuristic based on result.errors
            if (result && typeof result === "object" && "valid" in result && "errors" in result) {
                const res = result;
                const errors = res.errors;
                const inputStr = String(inputs[0]);
                if (ec.id === "ec1" && res.valid) {
                    covered.push(ec.id);
                }
                if (ec.id === "ec2" && errors.includes("Минимум 8 символов") && errors.length === 1) {
                    covered.push(ec.id);
                }
                if (ec.id === "ec3" && errors.some((e)=>e.includes("заглавную")) && !errors.includes("Минимум 8 символов") && errors.length <= 2) {
                    covered.push(ec.id);
                }
                if (ec.id === "ec4" && errors.some((e)=>e.includes("строчную")) && !errors.includes("Минимум 8 символов") && errors.length <= 2) {
                    covered.push(ec.id);
                }
                if (ec.id === "ec5" && errors.some((e)=>e.includes("цифр")) && !errors.includes("Минимум 8 символов") && errors.length <= 2) {
                    covered.push(ec.id);
                }
                if (ec.id === "ec6" && errors.some((e)=>e.includes("спецсимвол")) && !errors.includes("Минимум 8 символов") && errors.length <= 2) {
                    covered.push(ec.id);
                }
                if (ec.id === "ec7" && errors.length >= 2 && inputStr !== "" && errors.length < 4) {
                    covered.push(ec.id);
                }
                if (ec.id === "ec8" && inputStr === "" && errors.length >= 4) {
                    covered.push(ec.id);
                }
                if (ec.id === "ec9" && error) {
                    covered.push(ec.id);
                }
            } else if (ec.id === "ec9" && error) {
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
            if (ec.id === "ec3" && !isPalin && !error) covered.push(ec.id);
            if (ec.id === "ec4" && isPalin && /[a-zа-яё0-9]/i.test(inputStr) && (inputStr.includes(" ") || /[^a-zа-яё0-9]/i.test(inputStr))) covered.push(ec.id);
            if (ec.id === "ec5" && inputStr.trim() === "" && !error) covered.push(ec.id);
            if (ec.id === "ec6" && !error && inputStr.trim().length === 1) covered.push(ec.id);
            if (ec.id === "ec7" && error) covered.push(ec.id);
        }
        if (taskId === 8) {
            // validateEmail
            if (result && typeof result === "object" && "valid" in result && "errors" in result) {
                const res = result;
                const errors = res.errors;
                const inputStr = String(inputs[0]);
                if (ec.id === "ec1" && res.valid) covered.push(ec.id);
                if (ec.id === "ec2" && errors.some((e)=>e.includes("Отсутствует символ @"))) covered.push(ec.id);
                if (ec.id === "ec3" && errors.some((e)=>e.includes("Более одного"))) covered.push(ec.id);
                if (ec.id === "ec4" && errors.some((e)=>e.includes("Пустая локальная"))) covered.push(ec.id);
                if (ec.id === "ec5" && errors.some((e)=>e.includes("Недопустимые символы в локальной"))) covered.push(ec.id);
                if (ec.id === "ec6" && errors.some((e)=>e.includes("Пустая доменная"))) covered.push(ec.id);
                if (ec.id === "ec7" && errors.some((e)=>e.includes("не содержит точку"))) covered.push(ec.id);
                if (ec.id === "ec8" && errors.some((e)=>e.includes("слишком короткий"))) covered.push(ec.id);
                if (ec.id === "ec9" && errors.some((e)=>e.includes("слишком длинный"))) covered.push(ec.id);
                if (ec.id === "ec10" && inputStr === "" && errors.length > 0) covered.push(ec.id);
                if (ec.id === "ec11" && error) covered.push(ec.id);
            } else if (ec.id === "ec11" && error) {
                covered.push(ec.id);
            }
        }
        if (taskId === 9) {
            // toRoman
            const n = Number(inputs[0]);
            if (ec.id === "ec1" && !error && n === 1) covered.push(ec.id);
            if (ec.id === "ec2" && !error && n >= 2 && n <= 3998) covered.push(ec.id);
            if (ec.id === "ec3" && !error && n === 3999) covered.push(ec.id);
            if (ec.id === "ec4" && error && n < 1) covered.push(ec.id);
            if (ec.id === "ec5" && error && n > 3999) covered.push(ec.id);
            if (ec.id === "ec6" && error && !Number.isInteger(n)) covered.push(ec.id);
        }
        if (taskId === 10) {
            // isValidDate
            if (error) {
                if (ec.id === "ec8") covered.push(ec.id);
            } else if (result !== undefined) {
                const isValid = result === true;
                const day = Number(inputs[0]);
                const month = Number(inputs[1]);
                const year = Number(inputs[2]);
                const isLeap = year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
                if (ec.id === "ec1" && isValid && month >= 1 && month <= 12 && day >= 1) covered.push(ec.id);
                if (ec.id === "ec2" && isValid && day === 29 && month === 2 && isLeap) covered.push(ec.id);
                if (ec.id === "ec3" && !isValid && day > 28 && month >= 1 && month <= 12 && !(day === 29 && month === 2)) covered.push(ec.id);
                if (ec.id === "ec4" && !isValid && day === 29 && month === 2 && !isLeap) covered.push(ec.id);
                if (ec.id === "ec5" && !isValid && (month < 1 || month > 12)) covered.push(ec.id);
                if (ec.id === "ec6" && !isValid && day < 1 && month >= 1 && month <= 12) covered.push(ec.id);
                if (ec.id === "ec7" && isValid && (day === 30 || day === 31) && month >= 1 && month <= 12) covered.push(ec.id);
            }
        }
    }
    return [
        ...new Set(covered)
    ];
}
function compareOutputs(expected, actual) {
    const normalizedExpected = expected.trim().toLowerCase();
    const normalizedActual = normalizeValue(actual).trim().toLowerCase();
    if (normalizedExpected === normalizedActual) return true;
    // Handle "true"/"false" comparisons — including Russian variants
    const trueValues = [
        "true",
        "да",
        "верно"
    ];
    const falseValues = [
        "false",
        "нет",
        "неверно"
    ];
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
        } catch  {
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
        // Strict: require near-exact match (allow small whitespace differences)
        if (strippedExpected === strippedActual) return true;
        // Allow substring only for short generic expected values (single keyword)
        if (strippedExpected.length <= 10 && strippedActual.includes(strippedExpected)) return true;
        if (strippedActual.length <= 10 && strippedExpected.includes(strippedActual)) return true;
        return false;
    }
    // Handle { valid: true, errors: [] } — compare by parsing expected as JSON
    if (trimmedExpected.includes("valid") && trimmedExpected.includes("errors")) {
        try {
            const expectedObj = JSON.parse(trimmedExpected);
            if (typeof actual === "object" && actual !== null) {
                // Deep compare valid and errors fields
                const act = actual;
                if (expectedObj.valid !== undefined && expectedObj.errors !== undefined) {
                    if (expectedObj.valid === act.valid && JSON.stringify(expectedObj.errors) === JSON.stringify(act.errors)) {
                        return true;
                    }
                }
            }
        } catch  {
        // Not valid JSON
        }
    }
    return false;
}
function evaluateTestCases(task, testCases) {
    const results = [];
    const allCoveredEcs = new Set();
    const allCoveredBvs = new Set();
    for (const tc of testCases){
        const parsedInputs = tc.inputs.map(parseInputValue);
        const { result, error } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$test$2d$trainer$2f$src$2f$lib$2f$tasks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["runReferenceFunction"])(task.id, parsedInputs);
        let actualOutput;
        if (error) {
            actualOutput = `Ошибка: ${error}`;
        } else {
            actualOutput = normalizeValue(result);
        }
        // Compare expected with actual
        const isCorrect = compareOutputs(tc.expectedOutput, error ? `Ошибка: ${error}` : result);
        // Find covered ECs
        const coveredClasses = findCoveredEquivalenceClasses(task.id, parsedInputs, task);
        coveredClasses.forEach((id)=>allCoveredEcs.add(id));
        // Find covered boundary values
        const coveredBoundaries = [];
        for (const bv of task.boundaryValues){
            if (matchBoundaryValue(parsedInputs, bv.value)) {
                const desc = bv.description;
                coveredBoundaries.push(desc);
                allCoveredBvs.add(desc);
            }
        }
        // Generate explanation
        let explanation;
        if (isCorrect) {
            const coveredEc = task.equivalenceClasses.find((ec)=>coveredClasses.includes(ec.id));
            explanation = coveredEc ? `Верно! Покрыт класс: ${coveredEc.name}` : "Тест-кейс пройден успешно";
        } else {
            const normExpected = tc.expectedOutput.trim().toLowerCase();
            const normActual = actualOutput.trim().toLowerCase();
            const expectedIsError = normExpected.includes("ошибк") || normExpected.includes("исключен") || normExpected.startsWith("error");
            const actualIsError = normActual.includes("ошибк") || normActual.startsWith("ошибка");
            if (expectedIsError && !actualIsError) {
                explanation = `Функция не выбросила ошибку. Фактический результат: ${actualOutput}`;
            } else if (!expectedIsError && actualIsError) {
                explanation = `Функция выбросила ошибку, а ожидался результат: ${tc.expectedOutput}`;
            } else {
                explanation = `Ожидался: ${tc.expectedOutput}, получено: ${actualOutput}`;
            }
        }
        results.push({
            testCase: tc,
            actualOutput,
            isCorrect,
            explanation,
            coveredClasses,
            coveredBoundaries
        });
    }
    // Calculate scores
    const totalEcs = task.equivalenceClasses.length;
    const coveredEcsCount = allCoveredEcs.size;
    const ecCoverage = totalEcs > 0 ? coveredEcsCount / totalEcs * 100 : 0;
    const totalBvs = task.boundaryValues.length;
    const coveredBvsCount = allCoveredBvs.size;
    const boundaryCoverage = totalBvs > 0 ? coveredBvsCount / totalBvs * 100 : 0;
    const totalTests = results.length;
    const correctTests = results.filter((r)=>r.isCorrect).length;
    const correctnessScore = totalTests > 0 ? correctTests / totalTests * 100 : 0;
    // Weighted average: EC 40%, Boundary 30%, Correctness 30%
    const overallScore = ecCoverage * 0.4 + boundaryCoverage * 0.3 + correctnessScore * 0.3;
    // Determine uncovered items
    const coveredEcIds = Array.from(allCoveredEcs);
    const uncoveredEcIds = task.equivalenceClasses.filter((ec)=>!allCoveredEcs.has(ec.id)).map((ec)=>ec.id);
    const coveredBvDescriptions = Array.from(allCoveredBvs);
    const uncoveredBvDescriptions = task.boundaryValues.filter((bv)=>!allCoveredBvs.has(bv.description)).map((bv)=>bv.description);
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
        coveredBvsCount
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/GitHub/test-trainer/src/lib/undo-stack.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Generic undo/redo stack for managing snapshots of state.
 * Stores up to `maxSize` entries (default 50).
 */ __turbopack_context__.s([
    "UndoStack",
    ()=>UndoStack
]);
class UndoStack {
    stack = [];
    index = -1;
    maxSize;
    constructor(maxSize = 50){
        this.maxSize = maxSize;
    }
    /** Push a new snapshot onto the stack. Trims future states and caps at maxSize. */ push(snapshot) {
        // Discard any redo-able states
        this.stack = this.stack.slice(0, this.index + 1);
        this.stack.push(snapshot);
        // Trim oldest entries if over maxSize
        if (this.stack.length > this.maxSize) {
            this.stack = this.stack.slice(this.stack.length - this.maxSize);
        }
        this.index = this.stack.length - 1;
    }
    /** Undo: go back one step. Returns the previous snapshot, or null if at the beginning. */ undo() {
        if (this.index <= 0) return null;
        this.index--;
        return this.stack[this.index];
    }
    /** Redo: go forward one step. Returns the next snapshot, or null if at the end. */ redo() {
        if (this.index >= this.stack.length - 1) return null;
        this.index++;
        return this.stack[this.index];
    }
    /** Whether undo is possible */ get canUndo() {
        return this.index > 0;
    }
    /** Whether redo is possible */ get canRedo() {
        return this.index < this.stack.length - 1;
    }
    /** Current snapshot */ get current() {
        return this.index >= 0 ? this.stack[this.index] : null;
    }
    /** Reset the stack entirely */ clear() {
        this.stack = [];
        this.index = -1;
    }
    /** Number of stored entries */ get size() {
        return this.stack.length;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/GitHub/test-trainer/src/lib/storage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearAllProgress",
    ()=>clearAllProgress,
    "exportAllProgress",
    ()=>exportAllProgress,
    "getTaskBestCoverage",
    ()=>getTaskBestCoverage,
    "getTaskHistory",
    ()=>getTaskHistory,
    "importAllProgress",
    ()=>importAllProgress,
    "loadAttemptHistory",
    ()=>loadAttemptHistory,
    "loadCurrentSession",
    ()=>loadCurrentSession,
    "loadProgress",
    ()=>loadProgress,
    "loadStreak",
    ()=>loadStreak,
    "loadTaskNote",
    ()=>loadTaskNote,
    "saveAttempt",
    ()=>saveAttempt,
    "saveCurrentSession",
    ()=>saveCurrentSession,
    "saveProgress",
    ()=>saveProgress,
    "saveStreak",
    ()=>saveStreak,
    "saveTaskNote",
    ()=>saveTaskNote
]);
const PROGRESS_KEY = "test-trainer-progress";
const SESSION_PREFIX = "test-trainer-session-";
const HISTORY_KEY = "test-trainer-history";
const STREAK_KEY = "test-trainer-streak";
const NOTE_PREFIX = "test-trainer-note-";
function saveProgress(taskId, score, testCases) {
    try {
        const progress = loadProgress();
        const existing = progress[taskId];
        // Сохраняем только если результат лучше
        if (!existing || score >= existing.score) {
            progress[taskId] = {
                score,
                testCases
            };
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        }
    } catch  {
    // localStorage недоступен
    }
}
function loadProgress() {
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch  {
        return {};
    }
}
function saveCurrentSession(taskId, testCases) {
    try {
        localStorage.setItem(SESSION_PREFIX + taskId, JSON.stringify(testCases));
    } catch  {
    // localStorage недоступен
    }
}
function loadCurrentSession(taskId) {
    try {
        const raw = localStorage.getItem(SESSION_PREFIX + taskId);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch  {
        return null;
    }
}
function exportAllProgress() {
    try {
        const data = {};
        for(let i = 0; i < localStorage.length; i++){
            const key = localStorage.key(i);
            if (key && key.startsWith("test-trainer-")) {
                data[key] = localStorage.getItem(key) || "";
            }
        }
        return JSON.stringify(data, null, 2);
    } catch  {
        return "{}";
    }
}
function importAllProgress(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (typeof data !== "object" || data === null) return false;
        for (const [key, value] of Object.entries(data)){
            if (key.startsWith("test-trainer-")) {
                localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
            }
        }
        return true;
    } catch  {
        return false;
    }
}
function clearAllProgress() {
    try {
        const keysToRemove = [];
        for(let i = 0; i < localStorage.length; i++){
            const key = localStorage.key(i);
            if (key && key.startsWith("test-trainer-")) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key)=>localStorage.removeItem(key));
    } catch  {
    // ignore
    }
}
function saveAttempt(record) {
    try {
        const history = loadAttemptHistory();
        history.push(record);
        // Keep last 50 attempts
        if (history.length > 50) history.splice(0, history.length - 50);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch  {
    // ignore
    }
}
function loadAttemptHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch  {
        return [];
    }
}
function getTaskHistory(taskId) {
    return loadAttemptHistory().filter((r)=>r.taskId === taskId);
}
function getTaskBestCoverage(taskId) {
    const history = getTaskHistory(taskId);
    if (history.length === 0) return {
        bestEc: 0,
        bestBv: 0
    };
    const bestEc = history.reduce((max, h)=>Math.max(max, h.ecCoverage ?? 0), 0);
    const bestBv = history.reduce((max, h)=>Math.max(max, h.bvCoverage ?? 0), 0);
    return {
        bestEc,
        bestBv
    };
}
function saveTaskNote(taskId, note) {
    try {
        localStorage.setItem(NOTE_PREFIX + taskId, note);
    } catch  {
    // localStorage недоступен
    }
}
function loadTaskNote(taskId) {
    try {
        return localStorage.getItem(NOTE_PREFIX + taskId) || "";
    } catch  {
        return "";
    }
}
/**
 * Helper: get today's date as YYYY-MM-DD string (UTC)
 */ function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
/**
 * Helper: get date string for N days ago
 */ function getDateDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/**
 * Check if a given YYYY-MM-DD date was yesterday
 */ function isYesterday(dateStr) {
    return dateStr === getDateDaysAgo(1);
}
function saveStreak() {
    try {
        const streak = loadStreak();
        const today = getTodayDate();
        if (streak.lastActiveDate === today) {
            // Already active today, no change
            return streak;
        }
        if (streak.lastActiveDate === getDateDaysAgo(1)) {
            // Yesterday was active — continue streak
            streak.currentStreak += 1;
        } else if (streak.lastActiveDate !== today) {
            // Streak broken (unless today is already recorded)
            streak.currentStreak = 1;
        }
        streak.lastActiveDate = today;
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
        localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
        return streak;
    } catch  {
        return {
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: ""
        };
    }
}
function loadStreak() {
    try {
        const raw = localStorage.getItem(STREAK_KEY);
        if (!raw) return {
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: ""
        };
        return JSON.parse(raw);
    } catch  {
        return {
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: ""
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/GitHub/test-trainer/src/lib/constants.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "categories",
    ()=>categories,
    "categoryColors",
    ()=>categoryColors
]);
const categories = [
    "Нормальное значение",
    "Граничное значение",
    "Исключение",
    "Недопустимый тип"
];
const categoryColors = {
    "Нормальное значение": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Граничное значение": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    "Исключение": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
    "Недопустимый тип": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/GitHub/test-trainer/src/lib/achievements.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "achievements",
    ()=>achievements,
    "checkAndUnlockAchievements",
    ()=>checkAndUnlockAchievements,
    "loadUnlockedAchievements",
    ()=>loadUnlockedAchievements,
    "saveUnlockedAchievements",
    ()=>saveUnlockedAchievements
]);
"use client";
const ACHIEVEMENTS_KEY = "test-trainer-achievements";
const achievements = [
    {
        id: "first_blood",
        name: "Первый тест",
        description: "Отправьте первую проверку тест-кейсов",
        icon: "🎯",
        condition: (ctx)=>ctx.totalAttempts >= 1
    },
    {
        id: "first_perfect",
        name: "Безупречно",
        description: "Получите оценку 100% по любому заданию",
        icon: "💯",
        condition: (ctx)=>ctx.perfectScores >= 1
    },
    {
        id: "half_done",
        name: "Наполовину",
        description: "Выполните половину заданий",
        icon: "⭐",
        condition: (ctx)=>ctx.completedTasks >= Math.ceil(ctx.totalTasks / 2)
    },
    {
        id: "all_done",
        name: "Мастер тестирования",
        description: "Выполните все задания",
        icon: "🏆",
        condition: (ctx)=>ctx.completedTasks >= ctx.totalTasks
    },
    {
        id: "all_perfect",
        name: "Перфекционист",
        description: "Получите 100% по всем заданиям",
        icon: "👑",
        condition: (ctx)=>ctx.perfectScores >= ctx.totalTasks
    },
    {
        id: "persistent",
        name: "Настойчивый",
        description: "Выполните 10 проверок",
        icon: "🔥",
        condition: (ctx)=>ctx.totalAttempts >= 10
    },
    {
        id: "explorer",
        name: "Исследователь",
        description: "Попробуйте все задания хотя бы раз",
        icon: "🧭",
        condition: (ctx)=>Object.keys(ctx.bestScores).length >= ctx.totalTasks
    },
    {
        id: "good_student",
        name: "Отличник",
        description: "Получите оценку ≥90% по 3 заданиям",
        icon: "📚",
        condition: (ctx)=>Object.values(ctx.bestScores).filter((s)=>s >= 90).length >= 3
    },
    {
        id: "exam_passer",
        name: "Экзаменатор",
        description: "Завершите экзамен хотя бы раз",
        icon: "📝",
        condition: (ctx)=>(ctx.examsCompleted ?? 0) >= 1
    },
    {
        id: "boundary_hunter",
        name: "Охотник за границами",
        description: "Покройте все граничные значения в одном задании",
        icon: "🔍",
        condition: (ctx)=>(ctx.maxBvCoverage ?? 0) >= 100
    },
    {
        id: "speed_demon",
        name: "Скоростной",
        description: "Завершите экзамен, получив среднюю оценку ≥80%",
        icon: "⚡",
        condition: (ctx)=>(ctx.examAvgScore ?? 0) >= 80
    },
    {
        id: "completer",
        name: "Завершающий",
        description: "Покройте 100% классов эквивалентности в задании",
        icon: "✅",
        condition: (ctx)=>(ctx.maxEcCoverage ?? 0) >= 100
    }
];
function loadUnlockedAchievements() {
    try {
        const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch  {
        return [];
    }
}
function saveUnlockedAchievements(ids) {
    try {
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids));
    } catch  {
    // ignore
    }
}
function checkAndUnlockAchievements(context) {
    const previouslyUnlocked = loadUnlockedAchievements();
    const newlyUnlocked = [];
    for (const achievement of achievements){
        if (!previouslyUnlocked.includes(achievement.id) && achievement.condition(context)) {
            newlyUnlocked.push(achievement.id);
        }
    }
    if (newlyUnlocked.length > 0) {
        const allUnlocked = [
            ...previouslyUnlocked,
            ...newlyUnlocked
        ];
        saveUnlockedAchievements(allUnlocked);
    }
    return newlyUnlocked;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=Documents_GitHub_test-trainer_src_lib_fd4adae7._.js.map