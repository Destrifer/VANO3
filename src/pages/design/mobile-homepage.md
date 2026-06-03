---
layout: ../../layouts/BaseLayout.astro
title: "Mobile Homepage Concept"
description: "Mobile-first homepage concept for Printmos."
---

# Mobile Homepage Concept

This page records the current mobile-first direction for the Printmos homepage so the design logic does not need to be reconstructed from conversation.

## Core Idea

The homepage should work as a fast mobile order entry point for a print shop, not as a decorative marketing landing page.

The first screen should quickly answer:

- What can I print here?
- Can I calculate or start an order now?
- Is the shop open today?
- Where is the office?
- Can I collect the order or get delivery?
- Is it OK if I do not have a ready print file?

## First Screen

Suggested mobile structure:

```text
Header:
Printmos [phone icon] [menu icon]

Hero:
Печать без лишних шагов
Рассчитаем стоимость, проверим файл или поможем подготовить макет.

Status:
Сегодня 10:00-19:00
Москва, м. Бауманская · самовывоз · доставка

Actions:
[Начать заказ]
[Рассчитать заказ]

Note:
Макет можно загрузить сейчас, прислать позже или заказать у нас.
```

The file/mockup should not feel like a requirement. It is useful if the customer has one, but the interface must clearly say that the customer can start without it.

## Product Selection

Do not duplicate "quick services" and "popular services" as separate blocks. They are both product selection.

Use one visual product section:

```text
Что печатаем?

[Документы] [Визитки]
[Листовки] [Наклейки]
[Баннеры]  [Каталоги]

[Все услуги]
```

Product items should be visual buttons with simple line icons or small product illustrations, not plain text links.

Each item may include a small practical hint:

- Документы: сегодня
- Визитки: от 100 шт
- Листовки: A6-A3
- Наклейки: контур
- Баннеры: от 1 дня
- Каталоги: скрепление

Avoid a carousel for the main product selector. Product navigation should be stable and visible, because the user may be looking for one specific service.

## All Services

The `Все услуги` or `Другое` action means "show more product options", not "open a custom request form".

Expected behavior:

```text
Выберите продукцию

[Поиск]

Популярное
Документы
Визитки
Листовки
Наклейки
Баннеры
Каталоги

Еще услуги
Буклеты
Меню
Плакаты
Открытки
Сертификаты
Бланки
Папки
Календари
Бирки
Таблички
Широкоформатная печать
Постпечатная обработка
```

Only after the catalog should there be a quiet fallback:

```text
Не нашли услугу? Напишите нам
```

Use one primary hero action instead of two similar buttons. `Рассчитать заказ` should cover both price estimation and order start.

## Start Order

`Рассчитать заказ` is the primary action. It should not require a file at the beginning.

Expected first order screen:

```text
Оформление заказа

1. Продукция
2. Тираж
3. Размер
4. Параметры
5. Макет
6. Стоимость и отправка
```

This should behave like one working order sheet, not like several separate question cards.

Important behavior:

- The user should see all major sections on one screen or in one continuous sheet.
- Sections can expand as needed.
- Completed sections collapse into editable summaries.
- The user can always return to an earlier choice.
- The price area should update as enough data appears.
- If exact pricing needs manual file checking, show an approximate price and say that the final price comes after checking.

The mockup/file section should support:

```text
Макет
[Загрузить сейчас]
[Пришлю позже]
[Нужна помощь с макетом]
```

## Calculate

The hero `Рассчитать заказ` and the bottom-bar `Расчет` action should lead to the same calculation/order flow.

Behavior by context:

- No product selected: open product selection for calculation.
- Product selected: open calculation for that product.
- File already uploaded: open calculation for that file.
- Order already in progress: replace the bottom action with a price/submit panel instead of duplicating navigation.

## Upload File

Uploading a file is not the end goal. It is one possible part of creating an order.

After a file is uploaded, the interface should show one order sheet where the user can select:

- product type;
- quantity;
- size;
- production parameters;
- deadline;
- contact/order submission.

The user should see what has already been selected and should be able to edit previous choices.

## How To Order

Do not make the file/mockup an obligatory second step.

Use a short horizontal mobile version after the product section:

```text
Как заказать

1 Выберите
2 Укажите
3 Рассчитаем
4 Получите

Макет можно прислать позже или заказать у нас.
```

This block should stay compact. It explains the flow, but should not dominate the page.

## Finished Works

Place a `Готовые работы` section after `Как заказать`.

The section should add visual proof and pull the user further down the page:

```text
Готовые работы

[photo/card] [photo/card] [photo/card]
```

It is acceptable if the lower part of this section is partially cut off by the viewport at first. That can create a natural reason to scroll.

## Urgent Orders

Urgent orders should live in the fixed bottom area, not as a normal block in the page flow.

```text
Нужно сегодня
[Позвонить] [Расчет] [Чат]
```

The `Нужно сегодня` label can behave as the urgent contact action itself. This keeps the fixed block shorter than a separate `Спросить про сегодня` button.

Suggested message:

```text
Здравствуйте! Нужно срочно напечатать сегодня. Подскажите, можно ли успеть?
```

## Bottom Action Bar

Use a sticky mobile bottom bar with a compact urgent row above the main actions:

```text
[Нужно сегодня]
[Позвонить] [Расчет] [Чат]
```

Behavior:

- `Нужно сегодня`: opens the contact channel picker with urgent context.
- `Позвонить`: starts a phone call.
- `Расчет`: opens the calculation/order flow, context-aware when possible.
- `Чат`: opens the contact channel picker.

`Чат` is a permanent support action. The urgent row should use a more specific prepared message.

## Contact Channel Picker

For chat/write actions, show a small sheet:

```text
Связаться

[WhatsApp]
[Telegram]
[Позвонить]

Обычно отвечаем за 10-15 минут в рабочее время.
```

Prepared message depends on where the user clicked:

- General chat: "Здравствуйте! Хочу задать вопрос по печати."
- Urgent block: "Здравствуйте! Нужно срочно напечатать сегодня. Подскажите, можно ли успеть?"
- Existing order later: "Здравствуйте! Хочу уточнить заказ №..."

## Visual Direction

- Mobile-first.
- Minimal black-and-white design.
- Thin borders and line icons.
- Clear typography and whitespace.
- No heavy gradients or colorful decoration.
- No carousel for primary product navigation.
- No duplicated product sections.
- Product choice should use visual buttons, not only text links.
- The interface should make customers without a ready file feel welcome.
