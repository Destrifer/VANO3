# План вывода printmos.ru на боевой сервер

Статус: черновик плана (2026-06-24). Расширяет `AGENTS.md` → *Infrastructure Direction*, *5. Production Infrastructure*, *6. CI/CD*, *12. Backup And Maintenance* конкретикой.

## 0. Что мы деплоим (важно — это НЕ чистый SSG)

Раньше проект был SSG; сейчас — **гибрид с Node-адаптером** (`@astrojs/node`, standalone):

- Страницы пререндерятся (`prerender` по умолчанию), но есть серверные маршруты `/api/*` и `/cart` (`prerender = false`).
- Рантайм-зависимости: **Directus** (заказы пишутся сервис-токеном «Order Service» в `orders`/`order_items`/`directus_files`), **DaData** (подсказки адресов), **Яндекс.Карты** (JS API), **Telegram/SMTP** (уведомления о заявках), подпись формы (`FORM_SIGNING_SECRET`).
- ⇒ В проде нужен **живой Node-сервер**, а не только статика на CDN. «Залить файлы» (как со старым SSG) уже не подходит — нужен контейнер.

## 1. Ключевая идея: не один «перенос», а ТРИ независимых синка

| Что | Механизм синка | Источник истины |
|---|---|---|
| **Код** (Astro/Vue/`/api`) | git → CI → Docker-образ → VPS (SSH) | git |
| **Схема** (коллекции/поля/права) | `directus schema snapshot` → YAML в git → `directus schema apply` на деплое | git |
| **Контент** (продукты, кластеры, тексты, цены) | идемпотентные скрипты `seo/_*_directus.py`, прогон против прод-URL | **прод-Directus** (после сидинга) |

**Главная ловушка — не перенос БД (он одноразовый), а двойной источник истины контента.** Если править контент И на локалке, И на проде — получим расхождение строк в Postgres, которое руками не смержить.

### Козырь проекта
Контент создаётся **идемпотентными скриптами** (`seo/_*_directus.py`) → он **воспроизводим из кода**. Это и есть готовый механизм синхронизации контента: меняем `DIRECTUS_URL` на прод, прогоняем скрипт — он сводит прод к нужному состоянию, **не трогая `orders`/`customers`** (скрипты пишут только в `products`/`promoted_pages`/`papers`/`product_sizes`/`faq_items`/junction-коллекции).

### Дисциплина (нерушимо)
- После сидинга **прод-Directus = единственный источник истины контента**. Ad-hoc правки владельца + заказы — только на проде.
- **Никогда `local → prod` сырой БД.** Для обновления локалки: `pg_dump prod → local` (односторонне, prod→local), с вычисткой `orders`/`customers`.
- AGENTS-правило: *Never overwrite production orders or customer data from local test data.*

## 2. Стратегия: переезжаем СЕЙЧАС, дорабатываем на проде (вариант B)

Не ждём «100% на локалке». Обоснование:

- Все рискованные неизвестные — **только прод-специфичные**, их надо вскрыть рано, **пока нет реальных заказов** (ошибки дёшевы):
  - **Захардкоженные asset-URL** — `astro.config.mjs` → `image.remotePatterns` прибит `localhost:8055`; в сериализованных пропсах островов картинки идут абсолютным `http://localhost:8055/assets/...`. В проде сломается → вынести в env.
  - Время сборки на полном датасете (32 хаба × кластеры) — мерится только на CI.
  - CWV/LCP/TTFB, кэш-заголовки Caddy, AVIF/WebP-пайплайн `astro:assets` — реальны только на хостинге.
  - CORS, права сервис-токена, прод-ключи DaData/Yandex/Telegram/SMTP.
- Сид БД — одноразовый при любом раскладе. Отложив, мы **не упрощаем** перенос, а переносим все прод-риски на день запуска (худший момент).
- Безопасность B обеспечена идемпотентностью скриптов (не лезут в заказы).

## 3. Целевой стек (из AGENTS, зафиксировано)

- VPS, Docker + Docker Compose.
- **Caddy** — публичный reverse-proxy + авто-HTTPS.
- **Astro Node** standalone — SSR/on-demand маршруты.
- **Directus** — CMS/admin/API на `admin.printmos.ru`.
- **PostgreSQL** — контейнер (или managed PG позже).
- Redis — только если появится реальная нужда (кэш/сессии/rate-limit).

## 4. Последовательность шагов

1. **Env-driven Directus URL** *(маленькая правка кода, делаем первой — укусит первым)*
   - Убрать `localhost:8055` из `astro.config.mjs` `image.remotePatterns` → из env (`DIRECTUS_PUBLIC_URL`).
   - Аудит базового URL ассетов в островах/`Gallery.astro`; абсолютные URL картинок строить из env.
2. **`docker-compose.prod.yml` + `Caddyfile`** — сервисы `caddy` / `astro` / `directus` / `database`; healthchecks; volume для Directus uploads и PG data.
3. **VPS + DNS** — `printmos.ru` → сайт, `admin.printmos.ru` → Directus. Caddy выдаёт HTTPS. Сначала «hello world», замерить TTFB.
4. **Сид прода (одноразово):**
   - `directus schema apply` из snapshot’а локалки (схема в git).
   - Прогон `seo/_*_directus.py` против прод-`DIRECTUS_URL` (контент). `orders`/`customers` не трогаем.
   - Перенести Directus uploads (галерея-«рыба» и будущие фото).
   - Прод-`.env`: новые секреты (НЕ локальные), сервис-токен «Order Service», ключи DaData/Yandex/SMTP/Telegram, `FORM_SIGNING_SECRET`.
5. **CI/CD (GitHub Actions):** typecheck + `astro build` → сборка Docker-образа → SSH-деплой → `docker compose up -d` → `compose pull/restart`. Rollback = предыдущий тег образа.
6. **Пересборка по контенту:** страницы пререндерятся → изменение контента требует rebuild. Вебхук/flow Directus on-publish → триггер CI rebuild+redeploy. На старте допустимо ручной «деплой»/по расписанию.
7. **Прод-полировка:** замер CWV (LCP/INP/CLS), кэш-заголовки Caddy, мониторинг логов/uptime, бэкапы PG + uploads, проверка восстановления.

## 5. Открытые вопросы

- Хостинг Directus: контейнер на том же VPS vs Directus Cloud / managed PG.
- Где и как генерится sitemap в проде (Node-сервер vs билд-артефакт) — проверить, что `@astrojs/sitemap` отдаёт корректный прод-домен.
- Стратегия пересборки: вебхук-триггер vs инкрементальная сборка vs SSR части каталога.
- Бэкап-расписание и тест restore (PG + Directus `uploads`).
