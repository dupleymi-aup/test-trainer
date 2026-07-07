# TestTrainer — План улучшений (10 пунктов)

## 1. ~~i18n для student dashboard~~ ✅
Заменить hardcoded русские строки ("Продолжить", "Сообщения", "Достижения", "Учебный план", "История экзаменов", "Настройки уведомлений", "Таблица лидеров") на ключи из `useTranslations`.

## 2. ~~Loading skeleton для student subroutes~~ ✅
Добавить `loading.tsx` для `/student/analytics`, `/student/history`, `/student/achievements` — теперь загрузка показывает спиннер вместо пустого экрана.

## 3. ~~CSP headers в next.config.ts~~ ✅
Content-Security-Policy заголовки добавлены для dev и prod окружений.

## 4. ~~TypeScript strict mode~~ ✅
`strict: true` уже включён в `tsconfig.json` вместе с `noImplicitAny`.

## 5. ~~Health endpoint: добавить проверку MongoDB~~ ✅
`checkMongoHealth()` добавлена в `db-factory.ts`, health endpoint проверяет MongoDB параллельно с активной БД через `Promise.all`.

## 6. ~~API response types~~ ✅
Создать `src/lib/api-types.ts` с Zod-схемами для всех API responses и валидировать ответы через middleware.

## 7. ~~E2E тесты для teacher workflow~~ ✅
Playwright spec для teacher: создание группы → назначение студентов → просмотр аналитики → экспорт отчёта.

## 8. ~~Bundle analysis~~ ✅
`@next/bundle-analyzer` настроен. Тяжёлые импорты (recharts) оптимизированы через `next/dynamic` с `ssr: false`.

## 9. Error monitoring (Sentry)
Интегрировать `@sentry/nextjs` для отслеживания ошибок в production. Настроить source maps для фронтенда.

## 10. ~~Database migration CI~~ ✅
`prisma migrate deploy` + seed добавлены в CI workflow (lint-and-typecheck job).
