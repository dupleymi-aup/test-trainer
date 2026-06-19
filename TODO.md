# Plan — 10 пунктов улучшения качества

- [x] 1. Добавить Zod-валидацию к API-маршрутам без проверки входных данных (34 файла без валидации)
- [x] 2. Добавить Zod-валидацию к остальным 33 API-маршрутам (admin/reports, compare-periods, messages, grades, deadlines, students, groups)
- [ ] 3. Написать unit-тесты для нового parseSearchParams/parseRequestBody на каждом маршруте
- [ ] 4. Добавить индексы в Prisma-схему для полей, участвующих в частых WHERE-запросах (userId, groupId, action, createdAt)
- [ ] 5. Оптимизировать N+1 запросы в teacher/analytics и admin/analytics (preload relations, batch queries)
- [ ] 6. Настроить CI/CD: GitHub Actions workflow с lint, typecheck, test, schema:check
- [ ] 7. Добавить structured logging (JSON) во все API-маршруты через withErrorHandler
- [ ] 8. Извлечь общие Zod-схемы (pageParams, dateRange, groupId) в shared/schemas.ts для переиспользования
- [ ] 9. Добавить Rate Limiting к endpoints без него (student/history, teacher/gradebook, attempts)
- [ ] 10. Написать E2E-тесты (Playwright) для критичных user flows: login, register, submit attempt, view analytics
