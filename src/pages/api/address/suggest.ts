import type { APIRoute } from "astro";

// Прокси подсказок адреса DaData. Токен — на сервере (в браузер не уходит).
// Отдаём value + структурные поля (ФИАС/гео) для будущих API доставки.
export const prerender = false;

const TOKEN = import.meta.env.DADATA_TOKEN;
const DADATA = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const GET: APIRoute = async ({ url }) => {
  if (!TOKEN) return json({ error: "DaData не настроена" }, 500);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return json({ suggestions: [] });

  const res = await fetch(DADATA, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Token ${TOKEN}`,
    },
    body: JSON.stringify({ query: q, count: 7 }),
  });
  if (!res.ok) return json({ error: "Сервис адресов недоступен" }, 502);

  const data = await res.json();
  const suggestions = (data.suggestions ?? []).map((s: any) => ({
    value: s.value,
    data: {
      city: s.data.city ?? s.data.settlement ?? s.data.region,
      street: s.data.street_with_type,
      house: s.data.house,
      postal_code: s.data.postal_code,
      fias_id: s.data.fias_id,
      geo_lat: s.data.geo_lat,
      geo_lon: s.data.geo_lon,
    },
  }));
  return json({ suggestions });
};
