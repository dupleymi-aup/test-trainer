# TestTrainer — План улучшений v8.0 (5 пунктов)

## 1. ✅ Устранение дублирования error-компонентов
Объединить `StudentSubpageError` и `TeacherSubpageError` в единый переиспользуемый компонент `SubpageError`, убрав ~50 строк дублирующегося кода.

**Результат:** Создан `src/components/subpage-error.tsx` с универсальным компонентом. Старые компоненты теперь просто рендерят его с нужным `role`.

## 2. ✅ Barrel-экспорты для hooks и lib
Создать `src/hooks/index.ts` и `src/lib/index.ts` для упрощения импортов throughout the codebase.

**Результат:** Все хуки и ключевые утилиты либы доступны через единый импорт.

## 3. ✅ Unit-тесты для api-client.ts
Добавить полное покрытие тестами для `api-client.ts` — `apiFetch`, `apiFetchJson`, `apiFetchJsonSafe`, `apiFetchSafe`.

**Результат:** 11 тестов в `src/lib/api-client.test.ts` покрывают happy paths, error handling, CSRF-логику и safe-варианты.

## 4. ✅ Рефакторинг middleware: вынос ролевых проверок
Вынести повторяющуюся логику role-based protection в хелперы `checkRoleAccess()` и `checkStudentAccess()`, сократив middleware.ts на ~40 строк.

**Результат:** Устранено дублирование для admin/teacher/student ролей. Каждая проверка — отдельная чистая функция.

## 5. ✅ Хук useSearchParams (URL query state)
Создать `useSearchParams` хук для чтения/записи query-параметров URL с типизацией и автоматической синхронизацией.

**Результат:** Удобный хук для фильтров, пагинации и сортировки — замена ручной работы с `URLSearchParams`.
