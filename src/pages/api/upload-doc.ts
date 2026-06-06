import type { APIRoute } from "astro";

// Загрузка документа (реквизиты для счёта юрлица). Без preflight, шире форматы,
// чем у макета. В Directus files серверным токеном.
export const prerender = false;

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL ?? "http://localhost:8055";
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;

const MAX_SIZE = 20 * 1024 * 1024; // 20 МБ
const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx", "rtf", "odt"]);

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
  if (file.size === 0) return json({ error: "Пустой файл" }, 400);
  if (file.size > MAX_SIZE) return json({ error: "Файл больше 20 МБ" }, 400);

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return json({ error: "Поддерживаются PDF, JPG, PNG, DOC(X), XLS(X)" }, 400);
  }

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
