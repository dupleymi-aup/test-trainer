# Plan — 10 пунктов улучшения качества (v4)

- [x] 1. Добавить Zod-валидацию к оставшимся API-маршрутам без неё — все POST-маршруты уже имеют Zod safeParse
- [x] 2. Добавить loading.tsx для всех student subroutes (analytics, history, achievements, exams, favorites, leaderboard, messages, preferences, learning-path, reminders)
- [ ] 3. Оптимизировать React-рендеринг: мемоизация тяжёлых вычислений в analytics дашбордах
- [ ] 4. Добавить health check для PostgreSQL и MongoDB в health endpoint (параллельно с Prisma)
- [ ] 5. Написать unit-тесты для withErrorHandler на всех 5 маршрутах где он используется
- [ ] 6. Добавить Content-Security-Policy nonce для inline scripts в production
- [ ] 7. Оптимизировать bundle: dynamic import для Recharts и jsPDF
- [ ] 8. Добавить request body size limit (max 1MB) для всех POST-маршрутов
- [ ] 9. Добавить graceful shutdown для Next.js сервера (SIGTERM/SIGINT обработка)
- [ ] 10. Написать integration-тесты для admin/users/import endpoint (CSV parsing, batch creation)
