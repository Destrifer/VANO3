# Directus — схема как код

`snapshot.yaml` — снимок схемы Directus (коллекции, поля, связи), выгруженный
через `GET /schema/snapshot?export=yaml`. Данные (контент) сюда НЕ входят —
только структура. Версионируется в репозитории, чтобы схема воспроизводилась
на проде и у других разработчиков.

## SEO-часть схемы (Фаза 2)

- Коллекция **`faq_items`**: `question`, `answer`, `sort`.
- Поля **`products`**: `h1`, `meta_title`, `meta_description`, `intro_text` (rich),
  `template_file` (file), `faq` (M2M → `faq_items`, junction `products_faq_items`).
- Публичное чтение выдано `faq_items` и `products_faq_items` (политика `$public`),
  иначе сайт (ходит без токена) их не прочитает.

## Применить снапшот на другом окружении

```bash
# через Directus CLI (внутри контейнера/проекта)
npx directus schema apply ./directus/snapshot.yaml

# или через API: POST /schema/diff (получить diff) → POST /schema/apply
```

## Обновить снапшот после правок схемы

```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
  "http://localhost:8055/schema/snapshot?export=yaml" > directus/snapshot.yaml
```

> Админ-токен — у пользователя с ролью Admin Access (Static Access Token в
> карточке пользователя). В репозиторий НЕ коммитится (живёт в `.env` как
> `DIRECTUS_ADMIN_TOKEN`).
