# TestTrainer — План улучшений v13.0 (5 пунктов)

## 1. Хук useRafLoop
Создать `useRafLoop` хук — выполняет callback через requestAnimationFrame с автоматической очисткой при unmount и паузой.

## 2. Хук useUpdate
Создать `useUpdate` хук — возвращает функцию, которая вызывает force update (rerender) компонента без изменения state.

## 3. Хук useMergeState
Создать `useMergeState` хук — `useState` с shallow merge при обновлении (аналог `Object.assign` для state).

## 4. Хук useMap
Создать `useMap` хук — управление Map-коллекцией с методами `set`, `remove`, `clear`, `get`.

## 5. Хук useSet
Создать `useSet` хук — управление Set-коллекцией с методами `add`, `remove`, `clear`, `has`.
