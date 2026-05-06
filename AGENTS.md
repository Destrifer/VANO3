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

## Tech Debt And Open Questions

- Choose exact package manager before project creation: pnpm is the current default.
- Decide whether online payment is needed in the first production version.
- Decide whether SEO targets one city/region or multiple city landing pages.
- Decide how complex pricing rules should be: fixed prices, option matrix, formula-based calculator, or hybrid.
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
