import type { APIRoute } from "astro";
import { signToken } from "../../lib/formToken";

// Выдаёт свежий подписанный токен формы. Форма запрашивает его при загрузке
// (страница статична/SSG, поэтому токен не печём в HTML, а берём на лету).
export const prerender = false;

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ token: signToken() }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
