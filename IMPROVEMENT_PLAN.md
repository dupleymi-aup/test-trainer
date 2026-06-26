# TestTrainer — План улучшений v15.0 (5 пунктов)

## 1. Хук useGeolocation
Создать `useGeolocation` хук — обёртка над Geolocation API, возвращает `{ latitude, longitude, accuracy, loading, error }` с авто-обновлением при `enableHighAccuracy`.

## 2. Хук usePermission
Создать `usePermission` хук — обёртка над Permissions API, возвращает `{ state, status }` для проверки разрешений (camera, microphone, notifications и т.д.).

## 3. Хук useQueue
Создать `useQueue` хук — очередь с методами `enqueue`, `dequeue`, `peek`, `clear`, `size`. Полезно для обработки задач FIFO.

## 4. Хук useCounter с макс/мин
Обновить существующий `useCounter` хук — добавить `min`, `max` опции для ограничения диапазона значений.

## 5. Хук useVibrate
Создать `useVibrate` хук — обёртка над Vibration API, возвращает `vibrate(pattern)` функцию с поддержкой паттернов и auto-stop при unmount.
