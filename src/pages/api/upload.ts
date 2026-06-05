import type { APIRoute } from "astro";

// Приём макета: валидация типа/размера → загрузка в Directus files
// серверным токеном (least-privilege). Возвращает id файла для позиции корзины.
export const prerender = false;

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL ?? "http://localhost:8055";
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;

const MAX_SIZE = 50 * 1024 * 1024; // 50 МБ
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
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
  if (file.size > MAX_SIZE) return json({ error: "Файл больше 50 МБ" }, 400);
  if (file.type && !ALLOWED.includes(file.type)) {
    return json({ error: "Поддерживаются PDF, JPG, PNG, TIFF" }, 400);
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

  return json({ fileId: f.id, fileName: f.filename_download ?? file.name });
};
