# TestTrainer — План улучшений (10 пунктов)

## 1. ~~i18n для student dashboard~~ ✅
Заменить hardcoded русские строки ("Продолжить", "Сообщения", "Достижения", "Учебный план", "История экзаменов", "Настройки уведомлений", "Таблица лидеров") на ключи из `useTranslations`.

## 2. Health endpoint: добавить проверку MongoDB
Сейчас `healthCheck()` проверяет только Prisma. Добавить параллельную проверку MongoDB через `mongodb.ts` и возвращать статус каждого бэкенда.

## 3. Loading skeleton для student subroutes
Добавить `loading.tsx` для `/student/analytics`, `/student/history`, `/student/achievements` — сейчас загрузка этих страниц показывает пустой экран.

## 4. CSP headers в next.config.ts
Добавить Content-Security-Policy заголовки для защиты от XSS. Минимальный набор: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`.

## 5. TypeScript strict mode
Включить `strict: true` в `tsconfig.json` и исправить resulting errors. Сейчас strict отключён — это скрывает потенциальные баги.

## 6. API response types
Создать `src/lib/api-types.ts` с Zod-схемами для всех API responses и валидировать ответы через middleware.

## 7. E2E тесты для teacher workflow
Добавить Playwright spec для teacher: создание группы → назначение студентов → просмотр аналитики → экспорт отчёта.

## 8. Bundle analysis
Добавить `@next/bundle-analyzer` и оптимизировать тяжёлые импорты (recharts, jspdf, html2canvas) через dynamic import.

## 9. Error monitoring (Sentry)
Интегрировать `@sentry/nextjs` для отслеживания ошибок в production. Настроить source maps для фронтенда.

## 10. Database migration CI
Добавить GitHub Actions workflow для автоматического запуска `prisma migrate deploy` при деплое на Vercel.
