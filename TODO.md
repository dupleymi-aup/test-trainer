# Plan — 10 пунктов улучшения качества (v6)

- [x] 1. Добавить error.tsx к 10 student sub-routes (achievements, exams, favorites, learning-path, messages, preferences, leaderboard, history, analytics, reminders)
- [x] 2. Добавить error.tsx к teacher sub-routes (top 5: task-constructor, templates, students, settings, groups)
- [x] 3. Исправить silent catch {} блоки — добавить логирование ошибок в top-level catch в student API routes
- [x] 4. Заменить raw logger.error() на logApiError() в student и teacher API routes для единообразия
- [x] 5. Добавить loading.tsx к teacher sub-routes (top 5: task-constructor, templates, students, settings, groups)
- [x] 6. Исправить 41 русскоязычное сообщение об ошибке в auth API routes на английский
- [x] 7. Обернуть 4 silent .catch(() => {}) в teacher/admin export routes в логирование
- [x] 8. Добавить withErrorHandler к student/messages и student/preferences endpoints
- [x] 9. Добавить unit-тесты для validateApiResponse хелпера
- [x] 10. Добавить error边界 компонент с retry кнопкой для teacher sub-pages

# Plan — v7: Исправление TypeScript и улучшение DX

- [x] 1. Исправить 4 TypeScript ошибки в тестовых файлах (use-event-listener, use-fork-ref, use-local-storage, use-previous)
- [x] 2. Исправить silent catch в student/page.tsx — добавить логирование
- [x] 3. Исправить variable scope для AbortController в student/page.tsx
- [x] 4. Все 828 тестов проходят, TypeScript компиляция без ошибок
- [x] 5. Добавить dynamic import для recharts в ключевых страницах (bundle optimization)
- [x] 6. Добавить E2E тесты для teacher workflow (создание группы → назначение студентов → аналитика → экспорт)
- [x] 7. Добавить bundle analyzer для оптимизации размера бандла
- [x] 8. Добавить GitHub Actions workflow для CI/CD (уже существовал)

# Plan — v8: Дедупликация и единообразие (текущий)

- [x] 1. Извлечь дублированную функцию parseInputForRef (4 копии) в единый утилитный parseInputValue в src/lib/utils.ts
- [x] 2. Заменить локальные parseInputForRef в use-trainer-state.tsx, exam-mode.tsx, test-form.tsx на импорт из utils
- [x] 3. Удалить приватную parseInputValue из evaluator.ts, заменить импортом из utils
- [x] 4. Объединить лучшие特性: поддержка undefined, scientific notation, RU-булевы слова
- [x] 5. Добавить 15 unit-тестов для parseInputValue в utils.test.ts
- [x] 6. Все 658 тестов проходят (26 test files)
- [x] 7. TypeScript компиляция без ошибок в изменённых файлах
- [x] 8. Исправить UUID split bug в admin/groups/[id]/tasks/route.ts (key.split('-') ломается с UUID groupIds)
- [x] 9. Добавить NaN- guard к parseInt в admin/groups/[id]/tasks/route.ts и attempts/route.ts
- [x] 10. Исправить marathon-mode.tsx: обернуть sessionStorage.setItem в try/catch (Safari private mode)

# Plan — v9: Loading/error boundaries, lint cleanup, i18n fixes

- [x] 1. Добавить loading.tsx + error.tsx для всех teacher sub-routes (analytics, analytics-enhanced, announcements, calendar, gradebook, gradebook/matrix, messages, reports + 5 sub-reports, students/[id])
- [x] 2. Исправить 6 pre-existing lint warnings (удалить неиспользуемый logger, убрать parseInputValue из dependency arrays)
- [x] 3. Заменить русские сообщения в Zod-схемах на английский (attempts/route.ts, teacher/templates/route.ts)
- [x] 4. Установить jsdom (отсутствовал, вызывал ошибки vitest)
- [x] 5. Все 80 тестовых файлов (859 тестов) проходят, TypeScript 0 ошибок, ESLint 0 предупреждений

# Plan — v13: Dead code cleanup

- [x] 1. Удалить 50 неиспользуемых хуков из src/hooks/ (оставить только use-mobile и use-trainer-state)
- [x] 2. Удалить src/lib/http-utils.ts + test (весь модуль мёртвый)
- [x] 3. Добавить unwrapGuard утилиту в api-error-handler.ts для чистой обработки auth/CSRF guard
- [x] 4. Рефакторинг 3 routes (change-password, profile, attempts) на unwrapGuard
- [x] 5. TypeScript 0 ошибок, ESLint 0, 1239 тестов (69 файлов) проходят

# Plan — v10: Admin error boundaries, дедупликация error-компонентов

- [x] 1. Добавить поддержку роли admin в SubpageError + создать AdminSubpageError
- [x] 2. Добавить error.tsx для 11 admin top-level sub-routes (activity, alerts, cache, database, deadlines, executive, groups, notifications, settings, templates, users)
- [x] 3. Добавить loading.tsx + error.tsx для 3 admin reports sub-routes (deadline-compliance, export, students)
- [x] 4. Заменить 41 дублированный inline error.tsx в admin/analytics на shared AdminSubpageError
- [x] 5. ESLint 0 предупреждений, TypeScript 0 ошибок

# Plan — v11: Оптимизация кода и CI

- [x] 1. Удалить 3 неиспользуемые переменные (`_year`, `_sevenDaysAgo`, `_scoreThreshold`) в API routes
- [x] 2. Объединить split-imports в 8 файлах (withErrorHandler + parseSearchParams/formatZodError)
- [x] 3. Добавить prisma migrate deploy + seed в CI workflow (unit-tests, e2e-tests)
- [x] 4. TypeScript 0 ошибок, ESLint 0 предупреждений

# Plan — v12: Seed, trainer refactor, auth boundaries, env docs

- [x] 1. Добавить студента (student@testtrainer.local) в prisma/seed.ts с привязкой к группе преподавателя
- [x] 2. Извлечь дублированный footer в trainer/page.tsx в компонент Footer
- [x] 3. Добавить loading.tsx + error.tsx для 5 auth sub-routes (login, register, forgot-password, reset-password, verify-email)
- [x] 4. Добавить NODE_ENV и LOG_LEVEL в .env.example
- [x] 5. ESLint 0 предупреждений, TypeScript 0 ошибок

# Plan — v17: Security, dedup, performance improvements (текущий)

- [x] 1. Дедупликация secureCompare в csrf.ts (импорт из crypto.ts вместо дублированного алгоритма)
- [x] 2. Кэширование log level в logger.ts с TTL 5 сек (убрать повторный парсинг env var на каждый лог)
- [x] 3. Русские строки в Zod-схемах admin/groups/route.ts → английский
- [x] 4. Защита от обхода Content-Length: post-parse body size check в parseRequestBody
- [x] 5. Разделение rate limit bucket для GET/POST в admin/groups (adminGroupRead: 60/15мин vs adminGroupCrud: 20/15мин)
- [x] 6. CSRF unwrapGuard с 403 + "CSRF token missing or invalid" в student/preferences
- [x] 7. Rate limit cleanup interval: interval.unref() для graceful shutdown
- [x] 8. 1246 тестов, TypeScript 0 ошибок, ESLint 0 ошибок

# Plan — v18: Code quality, security, deduplication (текущий)

- [x] 1. Убрать утечку внутренних ошибок в admin/users/import (err.message → "Failed to create user")
- [x] 2. Заменить хрупкое определение P2002 (String.includes) на Prisma.PrismaClientKnownRequestError
- [x] 3. Дедупликация linear regression: predictNextScore использует computeLinearRegression из analytics-queries
- [x] 4. Удалить мёртвый код _handleEvaluate в marathon-mode.tsx
- [x] 5. CoverageMatrix: TooltipProvider вынесен на уровень обёртки вместо каждого элемента
- [x] 6. Заменить magic 86400000 на MS_PER_DAY из time-constants.ts (4 файла)
- [x] 7. 1246 тестов, TypeScript 0 ошибок
