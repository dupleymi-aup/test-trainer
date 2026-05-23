# TestTrainer — План развития (10 пунктов)

## 1. Production-ready database migration pipeline
Добавить `prisma migrate deploy` в CI/CD для автоматической миграции БД при деплое. Сейчас только `migrate dev`.

## 2. MongoDB API compatibility layer
Создать единый интерфейс `db/query()` который работает одинаково для Prisma и MongoDB, чтобы API роуты не зависели от типа БД.

## 3. Connection pooling и health checks
Добавить middleware `/api/health` который проверяет состояние всех подключений (DB, MongoDB, SMTP) и возвращает статус.

## 4. Docker Compose для локальной разработки
`docker-compose.yml` с PostgreSQL + MongoDB + SMTP сервером для тестирования всех трёх режимов без установки сервисов на хост.

## 5. CI pipeline для тестирования всех 3 БД
GitHub Actions workflow: запуск тестов с SQLite, PostgreSQL (container), MongoDB (container).

## 6. Rate limiting в MongoDB
Перенести rate limiter из in-memory в MongoDB/Redis для работы в кластере.

## 7. Оптимизация аналитических запросов
Сейчас analytics загружает все записи и агрегирует в JS. Перевести на агрегации на стороне БД.

## 8. Database backup & restore scripts
Скрипты для бэкапа SQLite/PostgreSQL/MongoDB и восстановления.

## 9. Monitoring и логирование
Интеграция с Sentry/OpenTelemetry для отслеживания ошибок БД и перфоманса запросов.

## 10. Документация
README секция про мульти-БД: как переключаться, как мигрировать, troubleshooting.
