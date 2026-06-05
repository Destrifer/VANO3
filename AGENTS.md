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

## Tech Debt And Open Questions

- Choose exact package manager before project creation: pnpm is the current default.
- Decide whether online payment is needed in the first production version.
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

## Working Rules For Future Sessions

- Read this file before making project-level decisions.
- Keep this file updated when the stack, roadmap, or major product decisions change.
- Add new decisions to the decisions log instead of relying on memory.
- Add unresolved issues to the tech debt/open questions section.
- Keep code changes small and explain the TypeScript/Astro/Vue concept being practiced.
