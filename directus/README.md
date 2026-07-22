# Directus — схема как код

`snapshot.yaml` — снимок схемы Directus (коллекции, поля, связи), выгруженный
через `GET /schema/snapshot?export=yaml`. Данные (контент) сюда НЕ входят —
только структура. Версионируется в репозитории, чтобы схема воспроизводилась
на проде и у других разработчиков.

## Рабочий цикл схемы (с 2026-07-22 — apply на деплое УБРАН)

**Источник истины схемы — ПРОД** (`admin.printmos.ru`); снапшот в гите — его
слепок-документация и способ поднять окружение с нуля. Деплой схему НЕ трогает.

1. Правишь схему на проде (админка или `ops/directus-api.sh`).
2. Сразу запускаешь **`ops/schema-snapshot.sh`** → обновляет
   `directus/snapshot.yaml` с прода → коммит.

> История: `schema apply` на деплое трижды сносил `bindings.image`. Главный
> подвох — `repository_dispatch` (пересборка при правке контента) запускает
> воркфлоу из ДЕФОЛТНОЙ ветки (master), так что устаревший снапшот master
> применялся даже когда рабочая ветка была починена. Apply убран из deploy.yml
> в обеих ветках (design/rework 477e21d, master — отдельным коммитом).

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
