import crypto from "node:crypto";

// Подписанный токен формы: несёт время выпуска и HMAC-подпись. Выдаётся
// сервером при загрузке формы, проверяется при отправке. Даёт сразу:
//  • time-trap (слишком быстрая отправка = бот),
//  • защиту от прямого POST в API без загрузки страницы,
//  • защиту от реплея старого токена (TTL).
// Без состояния на сервере (stateless), только секрет.

const SECRET =
  import.meta.env.FORM_SIGNING_SECRET || "dev-insecure-form-secret-change-me";

export function signToken(issuedAt: number = Date.now()): string {
  const payload = String(issuedAt);
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function verifyToken(
  token: string | undefined | null,
  opts: { minAgeMs: number; maxAgeMs: number },
): VerifyResult {
  if (!token || !token.includes(".")) return { ok: false, reason: "no-token" };
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-sig" };
  }
  const issuedAt = Number(payload);
  if (!Number.isFinite(issuedAt)) return { ok: false, reason: "bad-payload" };
  const age = Date.now() - issuedAt;
  if (age < opts.minAgeMs) return { ok: false, reason: "too-fast" };
  if (age > opts.maxAgeMs) return { ok: false, reason: "expired" };
  return { ok: true };
}
