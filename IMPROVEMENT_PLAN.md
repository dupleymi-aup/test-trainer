# TestTrainer — План улучшений v14.0 (5 пунктов)

## 1. Хук useNetwork
Создать `useNetwork` хук — расширенная версия useOnlineStatus: `{ online, offline, rtt, downlink, effectiveType, saveData }` через Network Information API.

## 2. Хук useDocumentTitle
Создать `useDocumentTitle` хук — управление `document.title` с auto-restore при unmount.

## 3. Хук useForkRef
Создать `useForkRef` хук — объединение нескольких `ref` callback/objects в один (полезно для forwarding refs в компонентах).

## 4. Хук useClickAnyWhere
Создать `useClickAnyWhere` хук — вызывает callback при клике в любом месте страницы (расширенная версия useOnClickOutside, работает и с кликами внутри).

## 5. Хук useDoubleClick
Создать `useDoubleClick` хук — детектирует двойной клик с настраиваемым `delay` для различия single и double click.
