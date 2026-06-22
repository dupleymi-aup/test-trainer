# Plan — 10 пунктов улучшения качества (v5)

- [ ] 1. Добавить rate limiting к student analytics, student history, student leaderboard (GET — без rate limit)
- [x] 2. Извлечь дублирующийся sanitizeCSVValue из admin/export и teacher/export в общий модуль — src/lib/csv-utils.ts + 15 тестов
- [ ] 3. Добавить unit-тесты для shared-schemas.ts (pagination, dateRange, groupFilter, universityFilter)
- [ ] 4. Добавитьtsx-no-use-target-natively eslint rule для предотвращения утечек памяти в React
- [ ] 5. Исправить unbounded parseInt в API-маршрутах (добавить NaN guard и max safe integer)
- [ ] 6. Добавить stale-while-revalidate к student messages и student preferences endpoints
- [ ] 7. Написать unit-тесты для batchComputeStudentRisk из risk-analysis.ts
- [ ] 8. Добавить X-Request-Id header к каждому API-ответу для трассировки
- [ ] 9. Оптимизировать admin/analytics/comprehensive endpoint: batch queries вместо N+1
- [ ] 10. Добавить type-safe API response types через Zod для всех JSON-ответов
