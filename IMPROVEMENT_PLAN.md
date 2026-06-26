# TestTrainer — План улучшений v16.0 (5 пунктов)

## 1. Хук useDebouncedValue
Создать `useDebouncedValue` хук — debounce значения с начальным значением и отменой. Возвращает `{ debouncedValue, cancel, isPending }`.

## 2. Хук useElementSize
Создать `useElementSize` хук — возвращает `{ width, height }` элемента через ResizeObserver, с ref callback.

## 3. Хук useIdle
Создать `useIdle` хук — определяет idle состояние пользователя по активности мыши/клавиатуры с таймаутом.

## 4. Хук useEventListener на element
Обновить `useEventListener` хук — добавить подушку `element` параметра для привязки к конкретному DOM-элементу, а не только window/document.

## 5. Хук useMap с immer-подобным API
Создать `useImmerMap` хук — `useMap` с callback-обновлением `update(key, fn)` для удобного изменения значений без иммутабельного клонирования.
