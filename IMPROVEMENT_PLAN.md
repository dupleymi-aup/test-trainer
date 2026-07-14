# TestTrainer — План улучшений v16.0 (5 пунктов) — ВЫПОЛНЕНО

## 1. Хук useDebouncedValue ✅
Создать `useDebouncedValue` хук — debounce значения с начальным значением и отменой. Возвращает `{ debouncedValue, cancel, isPending }`.

## 2. Хук useElementSize ✅
Создать `useElementSize` хук — возвращает `{ width, height }` элемента через ResizeObserver, с ref callback.

## 3. Хук useIdle ✅
Создать `useIdle` хук — определяет idle состояние пользователя по активности мыши/клавиатуры с таймаутом.

## 4. Хук useEventListener на element ✅
Обновить `useEventListener` хук — добавить подушку `element` параметра для привязки к конкретному DOM-элементу, а не только window/document.

## 5. Хук useMap с immer-подобным API ✅
Создать `useImmerMap` хук — `useMap` с callback-обновлением `update(key, fn)` для удобного изменения значений без иммутабельного клонирования.

---

# TestTrainer — План улучшений v17.0 (7 пунктов) — ВЫПОЛНЕНО

## 1. Дедупликация secureCompare ✅
`verifyCSRFToken` в csrf.ts дублировал алгоритм constant-time comparison из crypto.ts. Теперь использует `secureCompare` из crypto.ts.

## 2. Кэширование log level в logger ✅
`getLogLevel()` перепарсивал `process.env.LOG_LEVEL` при каждом лог-вызове. Теперь кэширует с TTL 5 секунд + инвалидацией при смене значения env var.

## 3. Русские строки в Zod-схемах ✅
Валидационные сообщения в `admin/groups/route.ts` ("Название обязательно", "Название слишком длинное") заменены на английский.

## 4. Защита от обхода Content-Length ✅
`parseRequestBody` теперь проверяет размер тела JSON после парсинга, а не только по заголовку Content-Length (который можно не передать).

## 5. Разделение rate limit bucket для GET/POST ✅
GET-запросы к `admin/groups` теперь используют отдельный bucket `adminGroupRead` (60/15мин) вместо общего `adminGroupCrud` (20/15мин).

## 6. CSRF unwrapGuard с error details ✅
В `student/preferences/route.ts` добавлены статус 403 и сообщение "CSRF token missing or invalid" в `unwrapGuard` для CSRF.

## 7. Rate limit cleanup interval unref ✅
Интервал очистки rate limit помечен `interval.unref()` чтобы не мешать graceful shutdown Node.js.
