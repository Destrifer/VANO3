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

// Адаптивная картинка для <picture>: avif/webp + fallback, под фикс-размер плитки.
// Resize и конвертацию формата делает САМ Directus (on-the-fly + кэш деривативов),
// поэтому браузер тянет уже сжатый вариант нужного размера, а не оригинал.
// URL'ы строятся на сервере/сборке и пекутся в SSG-HTML (как assetUrl).
// CWV: размеры заданы (нет CLS), формат-фолбэк безопасен для старых браузеров.
export type ResponsiveImage = {
  src: string; // fallback: resize в исходном формате (transparency сохраняется)
  sources: { type: string; srcset: string }[]; // avif, webp (по убыванию приоритета)
  width: number;
  height: number;
} | null;

const ASSET_QUALITY = 70;

// height задан → кроп под бокс (fit=cover); опущен → ресайз по ширине с
// сохранением пропорций (для lightbox, чтобы картинку не обрезало).
function assetVariant(id: string, w: number, h: number | undefined, format?: string): string {
  const p = new URLSearchParams({ width: String(w), quality: String(ASSET_QUALITY) });
  if (h !== undefined) { p.set("height", String(h)); p.set("fit", "cover"); }
  if (format) p.set("format", format);
  return `${DIRECTUS_PUBLIC_URL}/assets/${id}?${p.toString()}`;
}

export function responsiveAsset(
  id: string | null | undefined,
  width: number,
  height?: number,
  densities: number[] = [1, 2], // 1x + retina
): ResponsiveImage {
  if (!id) return null;
  const srcset = (format?: string) =>
    densities
      .map((d) => {
        const w = Math.round(width * d);
        const h = height === undefined ? undefined : Math.round(height * d);
        return `${assetVariant(id, w, h, format)} ${d}x`;
      })
      .join(", ");
  return {
    width,
    height: height ?? width, // только для атрибута/aspect; при ресайзе по ширине переопределяется CSS
    src: assetVariant(id, width, height),
    sources: [
      { type: "image/avif", srcset: srcset("avif") },
      { type: "image/webp", srcset: srcset("webp") },
    ],
  };
}

export async function directusFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Directus request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
