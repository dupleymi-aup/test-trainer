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
- [ ] 5. Добавить dynamic import для recharts в ключевых страницах (bundle optimization)
- [ ] 6. Добавить E2E тесты для teacher workflow (создание группы → назначение студентов → аналитика → экспорт)
- [ ] 7. Добавить bundle analyzer для оптимизации размера бандла
- [ ] 8. Добавить GitHub Actions workflow для CI/CD
