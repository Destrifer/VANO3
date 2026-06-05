import type { APIRoute } from "astro";
import { runPreflight } from "../../lib/preflight";

// Приём макета: валидация типа/размера → preflight Tier 1 против заказа →
// загрузка в Directus files серверным токеном. Возвращает id файла + отчёт.
export const prerender = false;

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL ?? "http://localhost:8055";
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;

const MAX_SIZE = 50 * 1024 * 1024; // 50 МБ

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Определяем формат по «магическим байтам» (не доверяя MIME из браузера).
function sniff(b: Uint8Array): "pdf" | "png" | "jpeg" | "tiff" | null {
  const m = (sig: number[], off = 0) => sig.every((x, i) => b[off + i] === x);
  if (m([0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (m([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (m([0xff, 0xd8, 0xff])) return "jpeg";
  if (m([0x49, 0x49, 0x2a, 0x00]) || m([0x4d, 0x4d, 0x00, 0x2a])) return "tiff";
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  if (!DIRECTUS_TOKEN) return json({ error: "Сервер не настроен" }, 500);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Ожидается multipart/form-data" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Файл не передан" }, 400);
  if (file.size === 0) return json({ error: "Пустой файл" }, 400);
  if (file.size > MAX_SIZE) return json({ error: "Файл больше 50 МБ" }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Проверяем РЕАЛЬНЫЕ байты, а не заявленный браузером тип.
  const kind = sniff(bytes.subarray(0, 16));
  if (!kind) return json({ error: "Поддерживаются PDF, JPG, PNG, TIFF" }, 400);

  // Preflight Tier 1 против параметров заказа (из формы).
  const spec = {
    width: Number(form.get("width")) || 0,
    height: Number(form.get("height")) || 0,
    sides: String(form.get("sides") ?? ""),
  };
  const preflight = await runPreflight(bytes, kind, spec);

  // Пробрасываем файл в Directus серверным токеном.
  const fd = new FormData();
  fd.append("file", file, file.name);
  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
    body: fd,
  });
  if (!res.ok) return json({ error: "Не удалось сохранить файл" }, 502);

  const data = await res.json();
  const f = data?.data;
  if (!f?.id) return json({ error: "Directus не вернул id файла" }, 502);

  return json({ fileId: f.id, fileName: f.filename_download ?? file.name, preflight });
};
