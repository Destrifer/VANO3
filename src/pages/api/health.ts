import type { APIRoute } from "astro";

// Серверный эндпоинт (on-demand): проверка, что гибридный рантайм работает.
export const prerender = false;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    headers: { "content-type": "application/json" },
  });
