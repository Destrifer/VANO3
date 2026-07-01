# Directus — схема как код

`snapshot.yaml` — снимок схемы Directus (коллекции, поля, связи), выгруженный
через `GET /schema/snapshot?export=yaml`. Данные (контент) сюда НЕ входят —
только структура. Версионируется в репозитории, чтобы схема воспроизводилась
на проде и у других разработчиков.

## Рабочий цикл схемы (с 2026-07-02 — автоматизирован)

**Источник истины схемы — ПРОД** (`admin.printmos.ru`); снапшот в гите — его
слепок, который деплой раскатывает обратно.

1. Правишь схему на проде (админка).
2. Сразу запускаешь **`ops/schema-snapshot.sh`** → обновляет
   `directus/snapshot.yaml` с прода → коммит.
3. Деплой (`.github/workflows/deploy.yml`, шаг «Apply Directus schema»)
   применяет снапшот из гита на прод **до сборки Astro** — идемпотентно
   (нет диффа — no-op).

> ⚠️ **Дисциплина обязательна:** устаревший снапшот в гите ОТКАТИТ прод-схему —
> `schema apply` удаляет то, чего в снапшоте нет. Поправил схему на проде →
> тут же шаг 2. (Контент и права apply не трогает — только структуру.)
> Снапшот пере-снят с прода 2026-07-02 (+`products_gallery`); локаль ещё
> догнать (`schema apply` на localhost:8055).

## SEO-часть схемы (Фаза 2)

- Коллекция **`faq_items`**: `question`, `answer`, `sort`.
- Поля **`products`**: `h1`, `meta_title`, `meta_description`, `intro_text` (rich),
  `template_file` (file), `faq` (M2M → `faq_items`, junction `products_faq_items`).
- Публичное чтение выдано `faq_items` и `products_faq_items` (политика `$public`),
  иначе сайт (ходит без токена) их не прочитает.

## Применить снапшот вручную (локаль/стейдж)

```bash
# через Directus CLI (внутри контейнера/проекта)
npx directus schema apply ./directus/snapshot.yaml

# или через API: POST /schema/diff (получить diff) → POST /schema/apply
```

## Обновить снапшот после правок схемы

```bash
ops/schema-snapshot.sh   # снимает с ПРОДА (admin.printmos.ru) и кладёт в репо
```

> Админ-токен — у пользователя с ролью Admin Access (Static Access Token в
> карточке пользователя). В репозиторий НЕ коммитится (живёт в `.env` как
> `DIRECTUS_ADMIN_TOKEN`).
