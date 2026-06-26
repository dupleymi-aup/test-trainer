# TestTrainer — План улучшений v9.0 (5 пунктов)

## 1. Хук usePagination
Создать `usePagination` хук для управления пагинацией с auto-sync с URL (page, pageSize, total), кнопки prev/next/goto.

## 2. Хук useDebouncedCallback
Создать `useDebouncedCallback` хук для debounce callback-функций (отличается от useDebounce тем что debounce'ит вызов, а не значение).

## 3. Хук useMediaQuery SSR-safe
Обновить `useMediaQuery` хук с SSR-safe начальным значением через `fallback` параметр и `serverValue` опцией.

## 4. Хук usePrevious с init
Обновить `usePrevious` хук с поддержкой начального значения `initialValue` параметром.

## 5. Хук useMounted
Создать `useMounted` хук — возвращает `true` только после mount, полезен для guard-паттернов в SSR-окружении.
