# Plan — 10 пунктов улучшения качества (v6)

- [x] 1. Добавить error.tsx к 10 student sub-routes (achievements, exams, favorites, learning-path, messages, preferences, leaderboard, history, analytics, reminders)
- [x] 2. Добавить error.tsx к teacher sub-routes (top 5: task-constructor, templates, students, settings, groups)
- [ ] 3. Исправить silent catch {} блоки — добавить логирование ошибок в top-level catch в student API routes
- [ ] 4. Заменить raw logger.error() на logApiError() в student и teacher API routes для единообразия
- [ ] 5. Добавить loading.tsx к teacher sub-routes (top 5: task-constructor, templates, students, settings, groups)
- [ ] 6. Исправить 41 русскоязычное сообщение об ошибке в auth API routes на английский
- [ ] 7. Обернуть 4 silent .catch(() => {}) в teacher/admin export routes в логирование
- [ ] 8. Добавить withErrorHandler к student/messages и student/preferences endpoints
- [ ] 9. Добавить unit-тесты для validateApiResponse хелпера
- [ ] 10. Добавить error边界 компонент с retry кнопкой для teacher sub-pages
