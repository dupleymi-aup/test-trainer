# TestTrainer — План улучшений v2.0 (5 пунктов)

## 1. ✅ Unit-тесты для React-компонентов
Добавить тесты для критических компонентов: `LoadingSpinner`, `ErrorBoundary`, `TaskCard`.

## 2. ✅ TypeScript интерфейсы для API ответов
Создать `src/lib/api-types.ts` с типами для всех API endpoints.

## 3. ✅ Улучшение доступности (a11y)
Добавить ARIA-метки и roles к интерактивным компонентам.

## 4. ✅ Динамические импорты тяжёлых библиотек
Оптимизировать импорты recharts, jspdf, html2canvas через `next/dynamic`.

## 5. ✅ Мониторинг ошибок — интеграция Sentry
Добавить конфигурацию Sentry для отслеживания ошибок в production.
