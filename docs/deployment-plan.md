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
2. **`docker-compose.prod.yml` + `Caddyfile` + `Dockerfile`** ✅ *(созданы)* — сервисы `caddy` / `astro` / `directus` / `database`; healthcheck БД; volumes для uploads/PG/caddy; наружу торчит только Caddy (80/443). Шаблон прод-секретов — `.env.production.example`. **Порядок первого запуска** (сборка Astro читает контент из Directus, а `compose build` изолирован от рантайм-сети, поэтому билд ходит в Directus по ПУБЛИЧНОМУ URL): (1) поднять `database`+`directus` → (2) засидить → (3) `build astro` → (4) `up -d` весь стек.
3. **VPS + DNS** — `printmos.ru` → сайт, `admin.printmos.ru` → Directus. Caddy выдаёт HTTPS. Сначала «hello world», замерить TTFB.
4. **Сид прода (одноразово):**
   - `directus schema apply` из snapshot’а локалки (схема в git).
   - Прогон `seo/_*_directus.py` против прод-`DIRECTUS_URL` (контент). `orders`/`customers` не трогаем.
   - Перенести Directus uploads (галерея-«рыба» и будущие фото).
   - Прод-`.env`: новые секреты (НЕ локальные), сервис-токен «Order Service», ключи DaData/Yandex/SMTP/Telegram, `FORM_SIGNING_SECRET`.
5. **CI/CD (GitHub Actions):** typecheck + `astro build` → сборка Docker-образа → SSH-деплой → `docker compose up -d` → `compose pull/restart`. Rollback = предыдущий тег образа.
6. **Пересборка по контенту:** страницы пререндерятся → изменение контента требует rebuild. Вебхук/flow Directus on-publish → триггер CI rebuild+redeploy. На старте допустимо ручной «деплой»/по расписанию.
7. **Прод-полировка:** замер CWV (LCP/INP/CLS), кэш-заголовки Caddy, мониторинг логов/uptime, бэкапы PG + uploads, проверка восстановления.

## 4a. Когда понадобятся доступы (сервер / домен / секреты)

| Этап | Что нужно | Зачем |
|---|---|---|
| Шаги 1–2 (код, compose, Caddyfile) | **ничего** | пишется локально, сервер пустой — ок |
| Шаг 3: поднять сервер | **IP + SSH-доступ** к VPS; Docker установлен | поставить стек, «hello world», замер TTFB |
| Шаг 3: HTTPS | **доступ к DNS-панели домена** + IP сервера | A-записи `printmos.ru`, `www`, `admin.printmos.ru` → IP; иначе Caddy не выдаст сертификат Let's Encrypt (нужны открытые 80/443) |
| Шаг 4: сид | **прод-секреты** (KEY/SECRET/пароли БД и admin, токены DaData/Yandex/SMTP/Telegram, `FORM_SIGNING_SECRET`, сервис-токен Order Service) | заполнить `.env.production` на сервере |
| Шаг 5: CI/CD | **SSH-ключ деплоя** в секретах GitHub + IP/пользователь сервера | GitHub Actions заходит по SSH и деплоит |

**Порядок-ловушка:** Directus должен быть поднят, доступен по `https://admin.printmos.ru` (DNS+HTTPS) **и засижен ДО сборки Astro-образа** — билд тянет из него контент. То есть домен/DNS нужны уже на шаге 3, до первой полноценной сборки сайта.

## 4b. Прогресс

- ✅ **Шаг 1** — env-driven Directus URL (commit `df7f6c0`).
- ✅ **Шаг 2** — прод-стек: Dockerfile / docker-compose.prod.yml / Caddyfile / .dockerignore / .env.production.example (commit `5421c67`).
- ✅ **Шаг 3** — сервер поднят: Ubuntu 24.04 (2 vCPU / 1.9 GB RAM + 2 GB swap), Docker 29.6 + compose v5.2, ufw 22/80/443; DNS `printmos.ru`/`www`/`admin` → IP; **Caddy hello-world: HTTPS-сертификаты Let's Encrypt выпущены для apex и admin, apex отдаёт 200.**
  - Доступ к серверу — по ssh-ключу `~/.ssh/printmos_deploy` (deploy-key добавлен в `authorized_keys` root). Креды/IP — вне гита.
  - ⚠️ Хостер блокирует SMTP-порты (25/465/587) → почтовые уведомления через SMTP недоступны (написан запрос на открытие); пока канал уведомлений — Telegram.
  - ⚠️ 1.9 GB RAM — сборку Astro-образа делать в CI и пушить в registry, а не на сервере (риск OOM при build + Directus + PG).
- ✅ **Шаг 4** — прод-Directus засижен и работает (`https://admin.printmos.ru`):
  - Метод сида — **полная реплика БД** (`pg_dump` локалки → restore в прод-Postgres), т.к. миграц-скрипты только ПАТЧАТ существующий каталог, а базовые данные (69 продуктов-скелетов, papers 1-35, finishing, categories, navigation, works) ими не создаются. Восстановлено без ошибок: products 70, promoted_pages 137, papers 35. Аплоады (галерея) перенесены (24 файла). Прод-`KEY/SECRET`/пароль БД — свежие; шифрованных KEY-полей у нас нет.
  - Образ Directus запинен `directus/directus:11.17.4` (= локальная версия, для совместимости дампа). Баг: postgres:18 требует монт `/var/lib/postgresql` (не `/data`) — поправлено в compose.
  - Проверено: health ok, публичный API отдаёт продукты, ассеты 200, apex — заглушка.
  - ⏳ **Хардненинг админа — вручную в UI** (мой тулинг не вправе минтить/держать прод-секреты): зайти на `https://admin.printmos.ru` как `admin@printmos.local` (пароль = локальный `.env` DIRECTUS_ADMIN_PASSWORD) → сменить email на `admin@printmos.ru`, поставить новый пароль, перевыпустить/удалить статичный токен. Создать роль «Order Service» + токен для Astro `/api` (значение в `.env.production` DIRECTUS_TOKEN).
- Миграц-скрипты `seo/_*_directus.py` теперь применимы к проду (DIRECTUS_URL=https://admin.printmos.ru + прод-токен) как механизм БУДУЩИХ правок контента.
- ✅ **Шаг 5** — CI/CD работает (`.github/workflows/deploy.yml`): push в `infra/deployment` → GitHub Actions собирает Astro-образ (build-args → `https://admin.printmos.ru`) → push в `ghcr.io/destrifer/printmos-astro` → scp compose+Caddyfile → SSH `pull astro` + `up -d astro` + reload Caddy. **Сайт живой: `https://printmos.ru` отдаёт реальную главную и страницы продуктов (200).** Секреты репо: SSH_HOST/SSH_USER/SSH_PRIVATE_KEY (deploy-key), GITHUB_TOKEN — авто. Урок: на изменение bind-mount Caddyfile `compose up` не реагирует — нужен `caddy reload`/restart (зашито в workflow).
- ⏳ **Шаг 6** — триггер пересборки on-publish. **Шаг 7** — CWV/полировка/бэкапы.

## 5. Открытые вопросы

- Хостинг Directus: контейнер на том же VPS vs Directus Cloud / managed PG.
- Где и как генерится sitemap в проде (Node-сервер vs билд-артефакт) — проверить, что `@astrojs/sitemap` отдаёт корректный прод-домен.
- Стратегия пересборки: вебхук-триггер vs инкрементальная сборка vs SSR части каталога.
- Бэкап-расписание и тест restore (PG + Directus `uploads`).
