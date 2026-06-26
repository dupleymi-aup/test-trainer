# TestTrainer — План улучшений v11.0 (5 пунктов)

## 1. Хук useUpdateEffect
Создать `useUpdateEffect` хук — аналог `useEffect`, но пропускает первый render (вызывается только при обновлениях, не при монтировании).

## 2. Хук useThrottle
Создать `useThrottle` хук — throttle значений с настраиваемым интервалом, возвращает последнее значение за период.

## 3. Хук useIntersectionObserver
Создать `useIntersectionObserver` хук — обёртка над `IntersectionObserverAPI`, возвращает `{ ref, isIntersecting, entry }` для lazy loading и infinite scroll.

## 4. Хук useWhyDidUpdate
Создать `useWhyDidUpdate` хук — debugging хук, логирует какие props изменились между рендерами (только в dev mode).

## 5. Хук useLatest
Создать `useLatest` хук — возвращает ref, всегда содержащий последнее значение (полезен для callbacks без stale closure).
