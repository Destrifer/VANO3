// Два URL Directus — чтобы код работал и локально, и в проде из одной кодовой базы.
//
// SERVER_URL  — серверный/билд-URL (server-to-server). directusFetch() ходит сюда при
//               SSR/сборке. В проде это может быть ВНУТРЕННИЙ адрес Docker-сети
//               (напр. http://directus:8055), браузер сюда не обращается.
// PUBLIC_URL  — публичный URL Directus для БРАУЗЕРА. assetUrl() запекает ссылки на картинки
//               в prerender-HTML и пропсы островов, которые грузит браузер, поэтому адрес
//               должен быть публично доступен (напр. https://admin.printmos.ru).
//
// Локально обе переменные = http://localhost:8055, поэтому поведение не меняется.
const SERVER_URL: string =
  import.meta.env.DIRECTUS_URL ?? "http://localhost:8055";

export const DIRECTUS_PUBLIC_URL: string =
  import.meta.env.DIRECTUS_PUBLIC_URL ?? SERVER_URL;

// Back-compat: ранее экспортировался единый DIRECTUS_URL (= серверный).
export const DIRECTUS_URL = SERVER_URL;

// URL картинки-ассета Directus по id файла (или null). Используется ТОЛЬКО на сервере/сборке,
// результат (публичный URL) запекается в HTML для браузера.
export function assetUrl(id: string | null | undefined): string | null {
  return id ? `${DIRECTUS_PUBLIC_URL}/assets/${id}` : null;
}

export async function directusFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Directus request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
