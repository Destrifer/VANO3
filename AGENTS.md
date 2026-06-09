# Project Memory

## Purpose

This repository is a learning project and a real commercial website for printing services.

The main goal is to learn Astro, Vue, TypeScript, Directus, and related full-stack concepts step by step while building a production-oriented SEO website with a cart, order flow, admin workflow, and notifications.

## Learning Style

- Explain a small amount of theory first.
- Then implement a small practical step.
- Do not jump ahead with large finished solutions.
- Prefer calm, evening-friendly pacing.
- Keep each lesson focused on one or two new ideas.
- Use real project code instead of abstract exercises whenever possible.
- Before each practical step, name the concept being learned: Astro pages, layouts, props, TypeScript types, Vue reactivity, Directus collections, API fetching, or deployment.
- After each practical step, briefly explain what changed and why.
- Prefer small commits after coherent learning steps.

## Teaching Mode Rule

The assistant must act as a teacher first, not as an executor.

For learning and infrastructure tasks:

- Explain the concept and the reason for the step before suggesting code or commands.
- Present the options when there is more than one reasonable path.
- Give the user a small concrete task.
- Wait for the user to implement it or explicitly ask for the assistant to implement it.
- Review the user's code, command output, or configuration after the user says it is ready.
- Do not edit project files unless the user explicitly says to make the change, for example: "сделай сам", "внеси правку", "исправь в файлах", "создай файл", or similar.
- Do not run infrastructure-changing commands unless the user explicitly asks to run them.
- If a previous assistant change was made too early, offer to keep it, revise it together, or revert it.

## Chosen Stack

- Astro for public website pages, routing, SEO, static and hybrid rendering.
- TypeScript throughout the project.
- Vue for interactive islands such as calculators, cart widgets, and forms.
- Directus as headless CMS and admin panel.
- PostgreSQL as the main database behind Directus.
- Tailwind CSS for styling.
- shadcn/ui style principles/components where useful, adapted for Vue.

## Current Architecture Direction

- Public SEO pages are generated with Astro.
- Interactive page fragments are Vue islands.
- Content and business data will eventually come from Directus.
- Early learning stages may use local typed TypeScript data before replacing it with Directus API data.
- Direct database access through Prisma or Drizzle is not needed at the start because Directus owns the database/API layer.
- If a separate custom backend becomes necessary later, Prisma is the first candidate for beginner-friendly database work; Drizzle can be reconsidered when stronger SQL control is useful.
- The website should use a hybrid rendering model: SSG for public SEO pages where possible, SSR/API only where dynamic behavior is required.
- Do not assume the whole website is SSR. Prefer pre-rendered pages, cacheable HTML, minimal JavaScript, and interactive islands.

## Infrastructure Direction

The project should be developed locally and deployed automatically to a VPS through Git-based CI/CD.

Target flow:

1. Local development.
2. Commit and push to GitHub or GitLab.
3. CI runs typecheck, lint, tests when available, and production build.
4. CI builds Docker images.
5. CI deploys to the server over SSH.
6. Server pulls new images and restarts services with Docker Compose.

Preferred production stack:

- VPS server.
- Docker and Docker Compose.
- Caddy as the public reverse proxy.
- Astro Node adapter in standalone mode for SSR/on-demand routes.
- Directus container for CMS/admin/API.
- PostgreSQL container or managed PostgreSQL.
- Redis only later, if a real caching/session/rate-limit need appears.

Current local infrastructure:

- Astro runs locally with `npm run dev`.
- Directus and PostgreSQL run through Docker Compose.
- `docker-compose.yml` defines `directus` and `database` services.
- `.env.example` is committed as the environment template.
- `.env` is local-only and ignored by Git.
- Directus local URL: http://localhost:8055.
- Directus local admin email: admin@printmos.local.
- Local dev secrets are not production secrets and must be replaced before deployment.
- Docker Desktop requires Windows hypervisor/WSL2. If hypervisor is disabled for other workflows, stop containers with `docker compose stop` before switching modes.

Reverse proxy direction:

- Prefer Caddy over Nginx at the start because it has simpler configuration, automatic HTTPS, reverse proxy support, and HTTP/3 support on the public edge.
- Caddy should terminate TLS and proxy requests to Astro and Directus.
- Use cache headers and compression at the proxy layer where appropriate.
- Use HTTP/3 as an optimization, not as a substitute for good page architecture.

Performance direction:

- First optimize architecture: SSG for service/category/article/FAQ pages, minimal JS, Vue islands only where necessary.
- Then optimize delivery: cache headers, compressed assets, image optimization, sitemap, robots.txt, structured data.
- Brotli, Redis, advanced caching, and extra performance infrastructure should be added only when the simpler setup is understood and there is a clear reason.

## Product Scope

The target website sells printing services.

Primary domain:

- printmos.ru
- Canonical production URL: https://printmos.ru
- Use www only as a redirect to the root domain unless this decision changes.

Expected features:

- Homepage.
- Service catalog.
- Individual SEO landing pages for services.
- Pricing/calculation widgets.
- Cart.
- Order form.
- Order notifications.
- Admin workflow through Directus.
- Content pages: FAQ, articles, service explanations.
- SEO infrastructure: metadata, sitemap, robots.txt, structured data, clean URLs.

## Visual Direction

- Use a minimal black-and-white visual style.
- The target feeling is a simple website drawn with a black pencil on white paper.
- Prefer clarity, whitespace, typography, borders, simple line icons, and restrained contrast over decorative color.
- UI library components may be used for complex controls, but the public website should remain visually quiet and monochrome unless a specific use case needs color.
- Avoid heavy gradients, decorative backgrounds, glossy effects, and colorful marketing-style layouts.

## Fluid Sizing Policy (full-width + 4K)

- The layout is intentionally full-width (no max-width cap). Legibility across phone → 4K comes from a **fluid root font-size** in `src/assets/app.css`: `html { font-size: clamp(1rem, 0.96rem + 0.17vw, 1.375rem); }`. Root grows ~+37% by ~3840px.
- Therefore **size things in `rem`** (Tailwind `text-*`, `w-*`, `h-*`, `gap-*`, `p-*` are rem-based) so they scale with the root automatically on big screens. Avoid `px` for type/spacing that should scale.
- On **mobile do NOT just shrink** — the base size must stay readable. Adapt by **restructuring blocks** (stack columns, reflow) via responsive variants (`flex-col sm:flex-row`, grid changes), not by lowering font size.
- Pick comfortably large base sizes for key UI (cards, prices, titles); the fluid root makes them larger still on 4K.

## Styling Policy (daisyUI-first)

- Visual styling, effects, and interactive states (hover/active/focus) come from the daisyUI theme and components — not ad-hoc CSS — so the UI stays in one consistent style and avoids hand-rolled state bugs.
- The active theme is `lofi` (monochrome). Custom CSS MUST consume theme tokens (`--color-base-100/200/300`, `--color-base-content`, `--color-primary` …, `--radius-field`, `--radius-box`, `--border`) — never hardcoded colors, radii, or borders.
- Prefer daisyUI component classes for standard controls: `btn`, `select`, `input`, `textarea`, `checkbox`, `radio`, `range`, `toggle`, `dropdown`, `menu`, `modal`/`<dialog>`, `tabs`, `join`, `badge`, `card`, `footer`, `navbar`.
- Custom layout is allowed only where no daisyUI component fits (e.g., a selectable tile with extra subtext, a map facade). Such custom elements must be built on theme tokens and mirror daisyUI's state conventions.
- If a custom element uses an inverted/active state, always define its `:hover` (and focus) explicitly so contrast/readability is preserved (e.g., an active dark tile must keep its dark background on hover).
- daisyUI components stay monochrome under `lofi`; do not introduce decorative color.

## Pricing Calculator Direction

- Calculators should share one pricing architecture instead of each calculator becoming a separate hardcoded exception tree.
- Materials, base costs, markup rules, option rules, and production parameters should eventually be editable through Directus.
- Changing purchase/material prices in the admin area should automatically affect relevant calculators.
- Avoid putting business pricing logic directly inside Vue components. Vue components should collect user choices and display results; pricing logic should live in typed shared modules or server-side services.
- Start with a simple typed pricing model in local TypeScript files, then migrate the editable data to Directus once the model is understood.
- Prefer a rule-based/composable pricing engine: products define required inputs, available options, materials, formulas, constraints, and post-processing steps.
- Keep product-specific exceptions explicit and isolated as named rules instead of scattered `if/else` branches throughout calculators.
- Candidate helper libraries to research later: json-rules-engine for conditional rules, JSON Logic for compact rule expressions, and expr-eval or a similar safe expression parser for formulas.
- Do not allow arbitrary JavaScript formulas from the admin panel.

## Directus Direction

- Directus Studio may use Russian UI for convenience, but collection and field keys should stay English.
- Use built-in Directus features where reasonable instead of duplicating them with custom fields.
- `navigation_items` is the first collection.
- `navigation_items` uses Directus built-in manual `sort` field for ordering.
- Public website data can be exposed through Public read permissions only when it is safe.
- `navigation_items` should allow Public read.
- Do not expose private collections such as orders, customers, purchase prices, or admin notes through Public read.
- Astro should read public Directus data server-side/build-time so it is included in generated HTML, not loaded later by client-side JavaScript.
- Current local Directus access layer:
  - `src/lib/directus.ts` contains `directusFetch<T>()`.
  - `src/lib/navigation.ts` contains `getNavigationItems()`.

## Course Roadmap

1. Create the Astro project.
2. Learn the basic Astro file structure.
3. Add TypeScript models for services and categories.
4. Build the first static service pages.
5. Add shared layout and navigation.
6. Add Tailwind styling.
7. Add the first Vue island: a simple print price calculator.
8. Expand calculator types and options.
9. Add cart state.
10. Add order form.
11. Introduce Directus and PostgreSQL.
12. Move service/category/order data into Directus.
13. Connect Astro to Directus API.
14. Add admin order workflow.
15. Add Telegram or email notifications.
16. Add SEO polish: sitemap, robots.txt, canonical URLs, Open Graph, structured data.
17. Prepare deployment.
18. Add Docker Compose for production services.
19. Add Caddy reverse proxy configuration.
20. Add CI/CD workflow for automatic deployment from Git.

Current next learning step:

- Lesson 1: understand the minimal Astro project structure and replace the default page with a first minimal black-and-white homepage for printmos.ru.

Near-term learning stages:

1. Astro pages and layouts: split the homepage into page content and shared layout.
2. TypeScript data modeling: define service/category data in typed local modules.
3. Astro dynamic routes: generate individual service pages from typed data.
4. Shared components: create reusable service cards, section headings, and navigation pieces.
5. Vue islands: add the first simple interactive calculator.
6. Pricing architecture: move calculator math into shared TypeScript modules.
7. Directus introduction: replace local service data with CMS/API data.
8. Directus API access layer: use `directusFetch<T>()` and collection-specific functions instead of raw fetch calls in pages.

## Product Roadmap

The target end state is `printmos.ru`: a fast SEO-first website for a digital printing business in Moscow, with a public service catalog, calculators, cart/order flow, Directus admin workflow, notifications, and production deployment.

### 0. Project Base

Status: in progress / mostly done.

- Astro project with TypeScript.
- Tailwind CSS and DaisyUI.
- Minimal black-and-white visual direction.
- Base layout.
- Local Directus + PostgreSQL through Docker Compose.
- `directusFetch<T>()` API helper.
- `navigation_items` in Directus.
- Main navigation loaded from Directus.

### 1. Visual Foundation

- Restore a real homepage instead of temporary placeholders.
- Clean up `BaseLayout`.
- Define base CSS: shell, grid, typography, links, buttons.
- Configure DaisyUI theme for the black-and-white pencil-on-paper style.
- Add header, navigation, and footer.
- Check mobile-first behavior.

### 2. Directus Content Model

- `navigation_items`.
- `services`.
- `service_categories`.
- `materials`.
- `faq_items`.
- `articles` later.
- `site_settings` later.

### 3. SEO Service Showcase

- Homepage.
- Service catalog at `/uslugi`.
- Service detail pages at `/uslugi/[slug]`.
- SEO title/description from Directus.
- Clean URLs.
- OpenGraph metadata.
- Sitemap and robots.txt.
- Structured data later.

### 4. Directus Schema Workflow

- Learn and use Directus schema snapshots.
- Commit schema changes to Git.
- Separate schema from content.
- Add seed data only where useful and safe.
- Never overwrite production orders or customer data from local test data.

### 5. Production Infrastructure

- Choose VPS.
- Configure DNS for `printmos.ru`.
- Install Docker on server.
- Add Caddy.
- Serve a simple HTML page first.
- Enable HTTPS.
- Measure HTTP TTFB.
- Deploy Directus at `admin.printmos.ru`.
- Deploy Astro public site.
- Add production `.env` values.

### 6. CI/CD

- GitHub or GitLab repository.
- Build/typecheck checks.
- Deploy over SSH.
- Docker Compose production deployment.
- Rollback plan.
- Production secrets.

### 7. Calculators

- Simple pricing model.
- Materials.
- Options.
- Quantity.
- Markups.
- Vue island calculator.
- Pricing engine in TypeScript.
- Pricing data from Directus.
- Do not expose private purchase prices in public API.

### 8. Cart And Order Flow

- Cart state.
- Add calculated item to cart.
- Order form.
- Customer contacts.
- Comments and file upload.
- Create orders safely through a server-side endpoint or controlled Directus flow.

### 9. Notifications

- Telegram notifications.
- Email notifications.
- Order statuses.
- Notification error logging.

### 10. Admin Workflow

- Orders collection.
- Statuses.
- Roles and permissions.
- Files.
- Manager notes.
- Simplified Directus modules for managers.

### 11. Performance And SEO Polish

- Minimal JavaScript on public pages.
- SSG for public service pages.
- Caching.
- Image optimization.
- Lighthouse checks.
- Core Web Vitals.
- Canonical URLs.
- Metadata and structured data.

### 12. Backup And Maintenance

- PostgreSQL backups.
- Directus uploads backups.
- Restore checks.
- Directus/PostgreSQL update process.
- Logs and uptime monitoring.

## Sprint 1: Public Showcase Foundation

Goal: turn the current technical prototype into a coherent first public site skeleton.

1. Restore a real homepage.
2. Clean up `BaseLayout`.
3. Finish base CSS/DaisyUI theme direction.
4. Create the `services` collection in Directus.
5. Load services on the homepage.
6. Create `/uslugi`.
7. Create one service detail page, starting with `/uslugi/vizitki`.

## Decisions Log

- Use Astro + Vue instead of Next.js + React because the project is SEO-first and benefits from islands architecture with limited JavaScript.
- Use Vue for interactive islands because it is approachable and avoids forcing the learner into the full React ecosystem early.
- Use Directus instead of writing a custom admin panel initially.
- Start without Prisma/Drizzle; Directus API will be the first data layer.
- Prefer Node.js LTS + pnpm for stability. Bun can be reconsidered later, but should not distract from learning.
- Use Git-based workflow with local development and automatic deployment to a VPS.
- Prefer Docker Compose for production orchestration.
- Prefer Caddy as the initial reverse proxy instead of Nginx.
- Treat Redis and advanced caching as later optimizations, not first-day requirements.
- Astro project was created in the repository root using the minimal/empty template.
- Package name is printmos.
- Current Astro version is 6.2.2.
- Local dev server starts with `npm run dev` in a normal PowerShell terminal.
- Added local Docker Compose infrastructure for Directus + PostgreSQL.
- Created Directus `navigation_items` collection for the main menu.
- Added `src/lib/directus.ts` and `src/lib/navigation.ts` for Directus API access.
- Homepage design direction and visual references are documented in `src/pages/design/homepage-design.md`.
- Earlier mobile homepage notes are kept in `src/pages/design/mobile-homepage.md`.
- Implemented the pricing engine as a pure stage pipeline in `src/lib/pricing/engine.ts` (print → paper → finishing → cutting → min-order → rounding); product/pricing data mapped from Directus in `data.ts`; field dependencies kept as declarative data in `rules.ts`. Current scope is digital-only; offset auto-choice and the `fixed` strategy are designed (doc 03) but not yet built.
- Added cutting to the engine: plotter cutting as upper-bound brackets (`pricing_settings.plotter_cutting`), manual (big-sheet) cutting as a percentage of the order (`pricing_settings.manual_cutting_rate`, default 0.15). Cutting is computed automatically, not user-selectable.
- Refactored the calculator into a thin orchestrator (`Calculator.vue`) + `useCalculator()` composable + presentational field components in `src/components/calculator/`, sharing state via `provide`/`inject` (typed `calcKey`). Shared `SwatchPalette` component for paper/foil color popovers. UI is daisyUI-only (theme `lofi`) with no hand-written scoped CSS.
- Removed urgency (срочно) from the calculator UI; срочность is decided by a manager at order approval. The `urgencyMultiplier` stays in the engine for later reuse.
- Installed the daisyUI skill locally (`.claude/skills/daisyui`, `skills-lock.json`) to keep daisyUI usage consistent.
- Consolidated project docs to the repo root (`01..05`, `README`); removed the duplicate `doc/` folder so there is a single canonical location.
- Built the product page configurator `ProductConfigurator.vue` (island that provides `calc` to all zones): equal-width `grid-template-areas` columns (3 → 2 → 1: controls | preview+plate | gallery), mobile order preview → controls → plate → gallery, gallery as a container-query thumbnail grid. `OrderPlate.vue` = price + «В корзину» (cart pending). Gallery and SEO text are static placeholders for now (later from Directus).
- Implemented an interactive preview as a shared engine, not per-product hardcode: `src/lib/preview/primitives.ts` (canvas helpers: shape contour, paper texture, lamination gloss, foil metal, ink color) + `src/lib/preview/mockups.ts` (per-product content registry; one `card` mockup = business-card «рыба»). `Preview.vue` is the generic stage; product picks its mockup via `previewKind` (default `card`). Universal params (shape/size/material/lamination/foil/corners) come from `calc`; different defaults are NOT different mockups. SVG/Path2D for geometry, Canvas for material.
- `ProductPricing.previewKind` added (maps from a future Directus `products.preview_kind`; currently not requested → defaults to `card`).
- Visual design constructor (in-browser editor) — DEFERRED to a future track, not current scope. If built: use **vue-konva (MIT)** as a **template-based editor on a dedicated page** (not a popup), with **server-side export to print-ready PDF** (bleed/CMYK/embedded fonts) sharing the preflight node. The editor engine + template system are buildable in-house; the **template library, fonts and stock images are curated, properly-licensed content** stored in Directus (`templates`: preview + Konva JSON + editable-field map + product link). **Polotno rejected**: React stack mismatch (project is Vue/Astro), cloud-dependent templates/photos likely geo-blocked from RF and unpayable, commercial license. Decision recorded so it is not re-litigated.
- Implemented cart→order flow (Этап 2): client cart (nanostores + localStorage) → `/api/upload` (signature validation + Tier 1 preflight) → `/api/order` (server recompute via `priceFromSpec`, nested create of `order` + `order_items` with the least-privilege server token). Order = заявка (payment deferred). Directus collections `orders`/`order_items` live in group `sales`; admin shows readable display templates, `spec` hidden.
- Implemented preflight Tier 1 (`src/lib/preflight.ts`, pdf-lib + sharp): PDF — pages vs sides, size + bleed (MediaBox); raster — dpi vs ordered size, CMYK/RGB; traffic light green/yellow/red stored on `order_items.preflight_status` + `preflight_report`. Accepted formats: PDF/AI/EPS/PSD/CDR/SVG/FIG/JPG/PNG/TIFF — only PDF/raster are auto-checked; sources are accepted and marked «проверит специалист».
- Designed (not yet built) the delivery & payment track — spec in `06-delivery-payment.md`. Decisions: payment = online prepay (reserved «скоро»), on-receipt, B2B invoice; gateway TBD (ЮKassa/Тинькофф). Delivery = provider-agnostic adapter model + data config in Directus; start contract-free via `manual` + ПВЗ `widget` (many providers, fulfilled by manager), add per-provider `api` later. Exclude Почта России / Деловые Линии (different format). Server is authoritative for delivery cost and payment status.
- Galleries & portfolio: `works` collection (M2M → products, M2M → `work_tags`) is the single source for both per-product galleries and the `/works` portfolio page (`getWorks`). Previews are static optimized `<picture>` (astro:assets AVIF/WebP + srcset, width/height from file meta) for SEO/LCP/CLS; the lightbox is PhotoSwipe v5, lazy-loaded on idle from `BaseLayout` (zero initial JS, core via dynamic import on open). Originals stay raw in Directus; Astro optimizes at build (Directus public asset transforms return 403). `/works` filter (daisyUI `filter`) + search are client-side over static cards; filtered-out cards are excluded from the lightbox via `:not([hidden])`.
- Pricing engine = strategy dispatch: `computePrice(config, data)` routes by `config.strategy` to `computeSheet` (default/листовая) or `computeMultipage`. Each product declares `products.strategy` (sheet | multipage | area | perpiece). New patterns add a strategy + Directus data, never an if/else tree in components. `PriceResult` sheet-only fields are optional. Remaining strategies to build: `area` (м²/баннеры), `perpiece` (таблички).
- Unified calculator field layer: shared PRESENTATIONAL components (props/v-model, like `SwatchPalette`) reused by every calculator — `CoatingField` (ламинация+фольга), `PaperSelect`, `SidesSelect`, `QuantitySelect`, `FormatField` (пресет↔«свой размер» на месте + «из списка»). Visitki field components became thin wrappers over these. `SharedCalc`/`sharedKey` is the strategy-agnostic contract for shared widgets (`OrderPlate`, `ArtworkUpload`). `ProductConfigurator` dispatches to `SheetConfigurator` or `MultipageConfigurator` by `product.strategy`; the static Astro gallery is passed in as a `gallery` slot.
- Multipage (brochures) pattern: блок (полосы) + обложка + переплёт. Imposition is GEOMETRIC from the brochure press sheet (`pricing_settings.brochure_sheet_*` = 438×309): полос/лист = fit-per-side × 2; works for presets and «свой размер» (custom limited to the sheet). Полосы кратны 4, свободны 8..400; переплёт авто-подбирается по числу полос (скоба ≤64, пружина ≤200, клей ≥100; несовместимые недоступны). Цена переплёта — брекеты ₽/экз по тиражу (`bindings.price`). Блок всегда белый и 4+4; обложке — стороны + ламинация + фольга. Booklet preview reacts to cover color / foil / binding. Server recomputes imposition from the spec (browser not trusted).
- Stickers pattern = sheet strategy + data (no new engine): плёнки-материалы, формы прям/круг/фигура (плоттер), односторонняя (`products.single_sided`), контурная надсечка (`OrderConfig.contourCut`, `products.allow_contour_cut`) = +50% к резке, ламинация+фольга, `preview_kind="sticker"`. ~22 продукта категории «Наклейки» добавляются как чистые данные.
- Plotter cutting model (corrected): ступень брекета `plotter_cutting [{to,price}]` выбирается по ЧИСЛУ ИЗДЕЛИЙ НА ЛИСТЕ (`to` = изделий на листе, fit), цена — за резку одного листа, итог = ставка × число листов (× 1.5 при контуре). Применяется ко всей листовой стратегии, где `isPlotter` (производство «плоттер» ИЛИ форма не прямоугольная). Manual (big-sheet) cutting stays 15%.
- New Directus schema for the above (not in git — capture via schema snapshots): collections `works`, `work_tags`, `bindings`; `products` fields `strategy`, `preview_kind`, `single_sided`, `allow_contour_cut`, `cover_papers`/`inner_papers` (M2M→papers), `bindings` (M2M); `product_sizes.pages_per_sheet` (legacy — imposition now geometric); `pricing_settings.brochure_sheet_*`.
- SEO research & semantics: query core collected from Yandex Webmaster «Подбор запросов» (9 seeds, Moscow); reusable pipeline `seo/_pipeline.py` (xlsx → classify PRINT/INFO/BRANDED/NONTARGET → cluster → competitors). Artifacts: `seo/keyword-tree.md` (intent tree, landing/inclusion/guide/reject), `seo/site-architecture-vizitki.md` (page architecture: hub `/vizitki` + ~8 cluster tiles, ~9–13 pages; coral-print benchmark), `seo/README.md`+`PLAYBOOK.md`, `06-seo-implementation.md` (tech roadmap, 7 phases). Capability filter: **offset = non-target** (no equipment), **design not a flagship** (no in-house designer/constructor). Lives on branch `docs/seo-strategy`.
- SEO implementation Phases 1–4 (branch `docs/seo-strategy` on `feat/fixed-price`): **P1 sitewide tech** — `astro.config` `site` + `@astrojs/sitemap`, `public/robots.txt`, `src/lib/seo/jsonld.ts`+`components/seo/JsonLd.astro` (Organization/LocalBusiness/Product+Offer/BreadcrumbList/FAQPage), `BaseLayout` head (canonical/OG/Twitter/global LocalBusiness/speculation-rules/new props), `Breadcrumbs.astro`. **P4 configurator preset+URL** — `src/composables/calcUrlState.ts` + `useCalculator.priceForCell`/`buildConfig(overrides)`, threaded via ProductConfigurator→SheetConfigurator (SHEET strategy only). **P2 content layer** — `src/lib/services.ts` `getServiceContent()` reads SEO/content fields with graceful try/catch fallback. **P3 hub** — `[slug].astro` product branch = service-page anatomy (H1, configurator, tiles, characteristics, template, FAQ, internal links) + Product/Offer+FAQPage JSON-LD; `SegmentTiles.astro` (empty until P5).
- Price «от» = `minPrice()` (cheapest paper × min tirage 50 × 1-sided), not `defaultPrice(100)` (`src/lib/pricing/data.ts`).
- Dynamic price table = `PriceTable.vue` inside the configurator island (SSR → crawlable in HTML, hydrate → interactive). Rows = size|paper|sides (auto axis), cols = tirages, cell = total + ₽/шт + Δ% vs selected (gain/loss tokens `--color-gain/--color-loss` in `app.css @theme`). Click sets calc params; price via `calc.priceForCell` (П2).
- Hub block `OptionsInfo.astro` («Материалы и технологии»): product-agnostic, built from the product's options. Material cards grouped by material TYPE (офсетная/мелованная/картон/пластик/дизайнерская), postpress by finishing group; each card = list (daisyUI `menu`) + preview (square avif thumb + description). CSS-only progressive toggle (all panels in HTML, П6, no popups, no new entities). Grid `repeat(auto-fit, minmax(min(100%,26rem),1fr))`, container queries for card-internal layout, equal-height + scroll for long lists. Tooltips `?` (`InfoTip.vue`) demoed on CoatingField.

## Tech Debt And Open Questions

- Choose exact package manager before project creation: pnpm is the current default.
- Online payment: decided to include eventually (reserved «скоро» in UI); first launch uses on-receipt + B2B invoice. Pick the gateway (ЮKassa/Тинькофф) and build the create-payment + webhook flow in a later phase (see doc 06).
- Decide whether SEO targets one city/region or multiple city landing pages.
- Decide how complex pricing rules should be: fixed prices, option matrix, formula-based calculator, or hybrid.
- Research whether to build a small internal pricing rule engine or adopt an existing rules/formula library.
- Decide how pricing formulas should be edited safely in Directus without allowing arbitrary unsafe code execution.
- Decide notification channel: Telegram, email, or both.
- Decide deployment target for Astro and Directus.
- Choose Git hosting provider: GitHub is the current default unless changed.
- Choose VPS provider and operating system.
- Choose domain name and DNS provider.
- Decide whether PostgreSQL should run in Docker on the VPS or as managed PostgreSQL.
- Define backup strategy for PostgreSQL and Directus uploads before production launch.
- Client-side pricing currently exposes rates/formulas in the browser bundle. Before production, move price computation to a server endpoint / Astro action (П2: one engine, but not shipped to the client).
- Move declarative field-dependency rules (`src/lib/pricing/rules.ts`) into Directus once the model is stable, keeping the applier functions in code.
- Visual constructor track (if started): build the curated template library, OSI-licensed fonts, and licensed stock images — an ongoing content task, not code.
- Upload hardening: add rate-limiting to `/api/upload` (anti-abuse) and a cleanup job (Directus Flow/cron) for orphan files (uploaded but never attached to an order).
- Preflight Tier 2 (needs Ghostscript/poppler/mutool in the Docker image): CMYK/Pantone inside PDF, fonts outlined, real image dpi inside PDF, visual overlay (cut/bleed/safe zones), auto-fix (add bleed, RGB→CMYK).
- CDR/FIG are accepted by file extension only (no reliable magic bytes) — revisit if abuse appears.
- Checkout currently does NOT block on red preflight (human-in-the-loop: red is shown, manager reviews). Decide later whether red should hard-block.
- Capture Directus schema snapshots for `orders`/`order_items` into the repo (doc 04 schema workflow), so the orders schema is version-controlled.
- Capture schema snapshots for the calculator/gallery collections too: `works`, `work_tags`, `bindings`, the new `products`/`product_sizes`/`pricing_settings` fields (strategy, preview_kind, single_sided, allow_contour_cut, cover/inner papers, pages_per_sheet, brochure_sheet_*). Currently created via the runtime admin token only — not version-controlled.

### SEO track — tech debt (after Phases 1–4)

- **Branch base.** SEO code is on `docs/seo-strategy` based on `feat/fixed-price` (the most advanced *unmerged* branch), NOT `master`. Parallel feature branches (gallery, stickers, multipage, booklets, fixed-price, delivery-payment) are unmerged; there is no integration branch. Decide a merge/integration strategy before deploy.
- **Directus fields NOT yet created** (code reads them with graceful fallback): `products` — `meta_title`, `meta_description`, `h1`, `intro_text`, `characteristics`, `template_file`, `faq` (M2M→`faq_items`); new collection `faq_items` (`question`, `answer`); `papers.image`; paper material-type (repurpose `group` → офсетная/мелованная/картон/пластик/дизайнерская, OR add `material_type`); `finishing_options.description` + `image`. Until they exist the following are **temporary placeholders**:
  - service content empty → auto title/description fallback in `[slug].astro`;
  - material grouping derived from paper NAME (`materialType()` in `OptionsInfo.astro`) — replace with Directus field;
  - postpress explanation texts hardcoded in `src/lib/optionInfo.ts` — replace with `finishing_options.description` (П1);
  - all material/postpress thumbnails = single placeholder `src/assets/materials/placeholder.jpg` — replace with real `papers.image`/`finishing_options.image`.
- **Configurator preset/URL** implemented for SHEET strategy only; multipage (brochures) not covered.
- **Tooltips `?`** only on CoatingField (lamination/foil) as a demo — extend to fold/cutting/material fields.
- **`SegmentTiles` (hub tiles) empty** — needs Phase 5: `promoted_pages` cluster pages (build-time `getStaticPaths`, self-canonical, configurator preset). Also unbuilt: trust/hub pages `/o-nas`, `/guides`, `/garantii`, `/kak-zakazat` (footer links → 404).
- **No default OG image** — `og:image` is emitted only when a page passes `ogImage`. Add `/og-default.png` + default in `BaseLayout`.
- **OptionsInfo open UX question:** equal-height makes single-option material cards mostly empty. Candidate fix — hide the list for single-option groups (preview only) and/or lower the long-list `max-height`.
- Before production: validate JSON-LD (Rich Results), check CWV/Lighthouse on the hub; confirm the Yandex Webmaster export region (Moscow) for query numbers.

### Cart & order architecture (decided)

- **Guest checkout** (no auth) — «пришёл-купил-ушёл». Cart lives client-side in nanostores + localStorage (Этап 1, done).
- **Cart item stores a SPEC by IDs** (productSlug, form/size/sides/quantity, paperId, finishing `[{id,count}]`, foil `{id,colorId}`) + a price snapshot **for display only**. The server NEVER trusts client prices.
- **Server runtime: hybrid** — keep pages static (`prerender`), add Astro API routes (`export const prerender = false`) via the Node adapter (standalone). Business logic stays in our code, not Directus Flows.
- **Trust boundary = Astro API routes.** `/api/upload` (artwork → Directus files, validate type/size) and `/api/order` (create order). The order endpoint **re-resolves prices from Directus by ID** and runs `computePrice` server-side (authoritative); same engine as the client/home tiles (П2). Uses a least-privilege Directus **server token from `.env`** (never shipped to client).
- **Order model:** one `order` with N `order_items` at checkout. `orders` (number, status, contacts, subtotal/discount/total) + `order_items` (product name/slug snapshot, `spec` JSON, qty, unit_price, line_total, `artwork`→files). Public has NO access to orders; only the server token writes.
- **Artwork uploaded on the product page** → returns `fileId`, stored in the cart item. Orphan files (uploaded, never ordered) cleaned by a later Directus Flow/cron.
- **Deferred:** online payment (order = заявка, status «новый», manager/payment later), discounts/promo/bonuses (Этап 3/4), notifications (§9), real preflight (separate track; for now just validate file type/size).

## Working Rules For Future Sessions

- Read this file before making project-level decisions.
- Keep this file updated when the stack, roadmap, or major product decisions change.
- Add new decisions to the decisions log instead of relying on memory.
- Add unresolved issues to the tech debt/open questions section.
- Keep code changes small and explain the TypeScript/Astro/Vue concept being practiced.
