import type { APIRoute } from "astro";
import { verifyToken } from "../../lib/formToken";

// Приём заявки с сайта (форма обратной связи / прислать макет / заказ).
// Сохраняет в Directus `requests` сервисным токеном и уведомляет команду
// в Telegram и по email. Все уведомления опциональны: если канал не настроен
// в env — он просто пропускается, заявка всё равно сохраняется.
export const prerender = false;

// Рантайм-секреты: process.env (Node-адаптер) с фолбэком на import.meta.env (dev).
// import.meta.env инлайнится на СБОРКЕ и заморозил бы значения, отсутствующие в build.
const DIRECTUS_URL =
  process.env.DIRECTUS_URL ?? import.meta.env.DIRECTUS_URL ?? "http://localhost:8055";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN ?? import.meta.env.DIRECTUS_TOKEN;

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? import.meta.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID ?? import.meta.env.TELEGRAM_CHAT_ID;

const SMTP_HOST = process.env.SMTP_HOST ?? import.meta.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? import.meta.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER ?? import.meta.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS ?? import.meta.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? import.meta.env.SMTP_FROM ?? SMTP_USER;
const NOTIFY_EMAIL = process.env.REQUEST_NOTIFY_EMAIL ?? import.meta.env.REQUEST_NOTIFY_EMAIL;

type Body = {
  name?: string;
  contact?: string;
  message?: string;
  fileId?: string | null;
  fileName?: string | null;
  source?: string;
  hp?: string; // honeypot — должен быть пустым
  token?: string; // подписанный токен формы (time-trap + nonce)
  consent?: boolean;
};

// Rate-limit по IP (in-memory; node standalone — один процесс).
const RL_WINDOW = 10 * 60 * 1000; // 10 минут
const RL_MAX = 5; // не больше 5 заявок с IP за окно
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW);
  if (arr.length >= RL_MAX) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fileUrl(id: string) {
  return `${DIRECTUS_URL}/assets/${id}`;
}

async function notifyTelegram(text: string) {
  if (!TG_TOKEN || !TG_CHAT) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: TG_CHAT,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
}

async function notifyEmail(subject: string, text: string) {
  if (!SMTP_HOST || !NOTIFY_EMAIL) return;
  const { createTransport } = await import("nodemailer");
  const transport = createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: SMTP_FROM,
    to: NOTIFY_EMAIL,
    subject,
    text,
  });
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!DIRECTUS_TOKEN) return json({ error: "Сервер не настроен" }, 500);

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ожидается JSON" }, 400);
  }

  // Rate-limit по IP (за прокси — берём X-Forwarded-For).
  const ip =
    clientAddress ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  if (rateLimited(ip)) {
    return json({ error: "Слишком много заявок. Попробуйте позже." }, 429);
  }

  // Honeypot: бот заполнил скрытое поле — делаем вид, что приняли.
  if (body.hp && body.hp.trim() !== "") return json({ ok: true });

  // Подписанный токен: time-trap (мин. 3 c) + свежесть (макс. 2 ч) + nonce.
  const tok = verifyToken(body.token, { minAgeMs: 3000, maxAgeMs: 2 * 60 * 60 * 1000 });
  if (!tok.ok) {
    // устаревший токен у настоящего пользователя — просим обновить;
    // отсутствие/подделка/слишком быстро — молча отбрасываем как бота.
    if (tok.reason === "expired") {
      return json({ error: "Форма устарела — обновите страницу." }, 400);
    }
    return json({ ok: true });
  }

  if (!body.consent) {
    return json({ error: "Нужно согласие на обработку данных" }, 400);
  }
  const contact = body.contact?.trim();
  if (!contact) {
    return json({ error: "Укажите, как с вами связаться" }, 400);
  }
  const message = body.message?.trim() || "";
  const fileId = typeof body.fileId === "string" ? body.fileId : null;
  if (!message && !fileId) {
    return json({ error: "Опишите задачу или приложите файл" }, 400);
  }

  const name = body.name?.trim() || null;
  const source = body.source?.trim()?.slice(0, 255) || null;

  const payload = {
    status: "new",
    name,
    contact,
    message: message || null,
    file: fileId,
    source,
  };

  const res = await fetch(`${DIRECTUS_URL}/items/requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return json({ error: "Не удалось отправить заявку" }, 502);

  // Уведомления — не блокируют ответ при сбое канала.
  const lines = [
    "🖨️ <b>Новая заявка с сайта</b>",
    name ? `👤 ${esc(name)}` : null,
    `📞 ${esc(contact)}`,
    message ? `💬 ${esc(message)}` : null,
    fileId ? `📎 Файл: ${fileUrl(fileId)}` : null,
    source ? `🔗 ${esc(source)}` : null,
  ].filter(Boolean);
  const tgText = lines.join("\n");
  const mailText = lines
    .join("\n")
    .replace(/<\/?b>/g, "")
    .replace(/🖨️ |👤 |📞 |💬 |📎 |🔗 /g, "");

  await Promise.allSettled([
    notifyTelegram(tgText),
    notifyEmail("Новая заявка с сайта Printmos", mailText),
  ]);

  return json({ ok: true });
};
