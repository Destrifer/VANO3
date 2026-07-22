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
  sizes?: string; // только при w-дескрипторах (responsiveAssetFluid)
} | null;

const ASSET_QUALITY = 70;

// height задан → кроп под бокс (fit=cover); опущен → ресайз по ширине с
// сохранением пропорций (для lightbox, чтобы картинку не обрезало).
function assetVariant(id: string, w: number, h: number | undefined, format?: string, noEnlarge = false): string {
  // noEnlarge: ресайз через transforms c withoutEnlargement — Directus не
  // апскейлит оригинал меньше запрошенной ширины (top-level width — апскейлит).
  const p = noEnlarge
    ? new URLSearchParams({
        transforms: JSON.stringify([["resize", { width: w, withoutEnlargement: true }]]),
        quality: String(ASSET_QUALITY),
      })
    : new URLSearchParams({ width: String(w), quality: String(ASSET_QUALITY) });
  if (!noEnlarge && h !== undefined) { p.set("height", String(h)); p.set("fit", "cover"); }
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

// Лайтбокс/полноэкранные фото: srcset по ширинам (w-дескрипторы) + sizes —
// браузер сам выбирает вариант под вьюпорт и dpr (мобильный тянет меньше,
// десктоп — вплоть до 4K), но не крупнее оригинала (withoutEnlargement).
export function responsiveAssetFluid(
  id: string | null | undefined,
  widths: number[],
  sizes: string,
): ResponsiveImage {
  if (!id) return null;
  const srcset = (format?: string) =>
    widths.map((w) => `${assetVariant(id, w, undefined, format, true)} ${w}w`).join(", ");
  const mid = widths[Math.floor((widths.length - 1) / 2)];
  return {
    width: widths[widths.length - 1],
    height: widths[widths.length - 1], // формальность; реальные пропорции задаёт CSS
    sizes,
    src: assetVariant(id, mid, undefined, undefined, true),
    sources: [
      { type: "image/avif", srcset: srcset("avif") },
      { type: "image/webp", srcset: srcset("webp") },
    ],
  };
}

// Сборка делает сотни запросов подряд к прод-Directus (2 ГБ сервер), и один
// сетевой чих валит весь деплой: 2026-07-22 prerender упал на 90-й странице с
// «Connect Timeout» в getMenu. Поэтому повторяем при сетевых ошибках и 5xx —
// они, как правило, преходящие. 4xx не повторяем: 403 за отсутствующее поле
// или 404 от повтора не исправятся, а только затянут падение.
const RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function directusFetch<T>(path: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch(`${SERVER_URL}${path}`);

      if (!response.ok) {
        // 4xx — ошибка запроса, повтор не поможет.
        if (response.status < 500) {
          throw new Error(`Directus request failed: ${response.status}`);
        }
        throw new Error(`Directus request failed: ${response.status} (попытка ${attempt})`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      const status = error instanceof Error ? error.message.match(/failed: (\d+)/)?.[1] : null;
      if (status && Number(status) < 500) throw error;
      if (attempt === RETRIES) break;
      // Линейная задержка: 1.5s, 3s — сервер успевает отдышаться, а сборка
      // не растягивается, даже если проблемных запросов много.
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}
