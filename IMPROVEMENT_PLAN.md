# TestTrainer — План улучшений v12.0 (5 пунктов)

## 1. Хук useAsync
Создать `useAsync` хук — обёртка над async функциями с自动 стейтом `{ data, loading, error, execute }`, поддержка abort и retry.

## 2. Хук useControllableValue
Создать `useControllableValue` хук — управляемый/uncontrolled паттерн для компонентов (аналог antd useControllableValue), поддержка controlled + uncontrolled modes.

## 3. Хук useUnmount
Создать `useUnmount` хук — вызывает callback при unmount компонента (cleanup helper).

## 4. Хук useRenderCount
Создать `useRenderCount` хук — возвращает количество рендеров компонента (debugging/performance tool).

## 5. Хук useSafeState
Создать `useSafeState` хук — `useState` который не обновляет state после unmount (prevents memory leak warnings).
