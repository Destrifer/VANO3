import type { APIRoute } from "astro";
import { runPreflight } from "../../lib/preflight";

// Приём макета: валидация типа/размера → preflight Tier 1 против заказа →
// загрузка в Directus files серверным токеном. Возвращает id файла + отчёт.
export const prerender = false;

// Рантайм-секреты: process.env (Node-адаптер) с фолбэком на import.meta.env (dev).
const DIRECTUS_URL =
  process.env.DIRECTUS_URL ?? import.meta.env.DIRECTUS_URL ?? "http://localhost:8055";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN ?? import.meta.env.DIRECTUS_TOKEN;

const MAX_SIZE = 50 * 1024 * 1024; // 50 МБ

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type Checkable = "pdf" | "png" | "jpeg" | "tiff";
type Detected = { kind: Checkable; checkable: true } | { kind: string; checkable: false };

// Принимаемые исходники без авто-проверки (вектор/проприетарные).
const SOURCE_EXT = new Set(["ai", "eps", "psd", "cdr", "svg", "fig"]);

// Определяем формат: сначала по «магическим байтам» (не доверяя MIME),
// затем — запасной вариант по расширению для форматов без надёжной сигнатуры.
function detect(b: Uint8Array, name: string): Detected | null {
  const m = (sig: number[], off = 0) => sig.every((x, i) => b[off + i] === x);
  if (m([0x25, 0x50, 0x44, 0x46])) return { kind: "pdf", checkable: true }; // %PDF (вкл. совр. AI)
  if (m([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: "png", checkable: true };
  if (m([0xff, 0xd8, 0xff])) return { kind: "jpeg", checkable: true };
  if (m([0x49, 0x49, 0x2a, 0x00]) || m([0x4d, 0x4d, 0x00, 0x2a])) return { kind: "tiff", checkable: true };
  if (m([0x38, 0x42, 0x50, 0x53])) return { kind: "psd", checkable: false }; // 8BPS
  if (m([0x25, 0x21, 0x50, 0x53]) || m([0xc5, 0xd0, 0xd3, 0xc6])) return { kind: "eps", checkable: false };

  const ext = (name.split(".").pop() || "").toLowerCase();
  const head = new TextDecoder().decode(b.subarray(0, 256)).toLowerCase();
  if (head.includes("<svg") || (head.includes("<?xml") && ext === "svg")) {
    return { kind: "svg", checkable: false };
  }
  if (SOURCE_EXT.has(ext)) return { kind: ext, checkable: false }; // cdr, fig, ai/eps старые и т.п.
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
  // Определяем формат (байты + расширение), а не доверяем браузерному MIME.
  const det = detect(bytes, file.name);
  if (!det) {
    return json({ error: "Поддерживаются PDF, AI, EPS, PSD, CDR, SVG, FIG, JPG, PNG, TIFF" }, 400);
  }

  // Preflight Tier 1 — только для проверяемых форматов (PDF/растр).
  // Исходники (AI/EPS/PSD/CDR/SVG/FIG) принимаем, авто-проверки нет.
  let preflight = null;
  if (det.checkable) {
    const spec = {
      width: Number(form.get("width")) || 0,
      height: Number(form.get("height")) || 0,
      sides: String(form.get("sides") ?? ""),
    };
    preflight = await runPreflight(bytes, det.kind, spec);
  }

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
