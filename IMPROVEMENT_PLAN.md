# TestTrainer — План улучшений v10.0 (5 пунктов)

## 1. Хук useFetch с кешированием
Создать `useFetch` хук — обёртка над `useApiFetch` с клиентским кешем (TTL-based), автоматическая инвалидация по ключу.

## 2. Хук useOnlineStatus
Создать `useOnlineStatus` хук — отслеживает `navigator.onLine` и события `online`/`offline`, возвращает `{ isOnline, isOffline }`.

## 3. Хук useScrollPosition
Создать `useScrollPosition` хук — возвращает текущую позицию скролла `{ x, y }` с throttle через `requestAnimationFrame`.

## 4. Хук useClipboard
Создать `useClipboard` хук — обёртка над `navigator.clipboard.writeText()` с `copied` state и `timeout` сброса.

## 5. Хук useLongPress
Создать `useLongPress` хук — детектирует долгое нажатие (long press) на элемент с настройкой `delay` и `onLongPress` callback.
