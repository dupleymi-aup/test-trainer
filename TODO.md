# Plan — 10 пунктов улучшения качества (v3)

- [x] 1. Добавить Prisma-индексы для полей в частых WHERE-запросах (userId, taskId, groupId, createdAt, action)
- [x] 2. Настроить CI/CD: GitHub Actions workflow с lint, typecheck, test, schema:check
- [x] 3. Добавить structured JSON logging через withErrorHandler во все API-маршруты
- [x] 4. Написать unit-тесты для parseSearchParams/parseRequestBody на каждом валидированном маршруте — 42 теста для 10 уникальных схем
- [x] 5. Написать E2E-тесты (Playwright) для критичных user flows: login, register, submit attempt — уже есть 16 тестов в e2e/
- [x] 6. Добавить error boundary для React-компонентов (React ErrorBoundary) — уже есть в src/components/error-boundary.tsx
- [x] 7. Добавить request logging middleware (method, path, status, duration) для всех API
- [x] 8. Аудит XSS: проверить user-generated контент (name, email, group) на escaping в CSV/JSON/PDF экспорте — CSV: sanitizeCSVValue, JSON: JSON.stringify, PDF: jsPDF doc.text()
- [x] 9. Добавить database migration safety: dry-run режим и schema diff перед миграцией — npm run db:check
- [x] 10. Performance: Lighthouse CI, bundle size monitoring, unused dependencies audit — удалены react-markdown, uuid, zustand (81 пакет)
