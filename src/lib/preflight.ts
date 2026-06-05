// Preflight Tier 1 (без внешних бинарей): базовая проверка пригодности макета
// против спецификации заказа. PDF — pdf-lib (страницы, размер, вылеты),
// растр — sharp (разрешение, цветовая модель). Светофор green/yellow/red.
// Это НЕ полный препресс (CMYK внутри PDF, шрифты, реальный dpi картинок в PDF
// требуют Ghostscript/poppler — отдельный трек).
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export type PreflightLevel = "ok" | "warn" | "error";
export type PreflightCheck = { level: PreflightLevel; message: string };
export type Preflight = { status: "green" | "yellow" | "red"; checks: PreflightCheck[] };

export type PreflightSpec = { width: number; height: number; sides: string };

const PT2MM = 25.4 / 72;
const BLEED = 2; // мм с каждой стороны
const TOL = 1.5; // допуск, мм

// Подходит ли размер (мм) под цель в любой из двух ориентаций.
function sizeMatches(w: number, h: number, tw: number, th: number, tol = TOL) {
  const fit = (a: number, b: number, ta: number, tb: number) =>
    Math.abs(a - ta) <= tol && Math.abs(b - tb) <= tol;
  return fit(w, h, tw, th) || fit(w, h, th, tw);
}

async function preflightPdf(buf: Uint8Array, spec: PreflightSpec, checks: PreflightCheck[]) {
  const doc = await PDFDocument.load(buf, { updateMetadata: false, throwOnInvalidObject: false });
  const pages = doc.getPageCount();

  if (spec.sides === "4+4" && pages < 2)
    checks.push({ level: "warn", message: `Двусторонняя печать: ожидаются лицо и оборот (2 стр.), в файле ${pages}` });
  if (spec.sides === "4+0" && pages > 1)
    checks.push({ level: "warn", message: `Односторонняя печать, а в файле ${pages} стр.` });

  if (spec.width > 0 && spec.height > 0) {
    const page = doc.getPage(0);
    const { width, height } = page.getSize(); // pt
    const mmW = width * PT2MM, mmH = height * PT2MM;
    const withBleed = sizeMatches(mmW, mmH, spec.width + 2 * BLEED, spec.height + 2 * BLEED);
    const noBleed = sizeMatches(mmW, mmH, spec.width, spec.height);
    if (withBleed) {
      checks.push({ level: "ok", message: `Размер с вылетами в норме` });
    } else if (noBleed) {
      checks.push({ level: "warn", message: `Нет вылетов: добавьте по ${BLEED} мм с каждой стороны (фон под обрез)` });
    } else {
      checks.push({ level: "warn", message: `Размер макета ${Math.round(mmW)}×${Math.round(mmH)} мм не совпадает с заказанным ${spec.width}×${spec.height} мм` });
    }
  }
}

async function preflightRaster(buf: Uint8Array, spec: PreflightSpec, checks: PreflightCheck[]) {
  const meta = await sharp(Buffer.from(buf)).metadata();
  const pw = meta.width ?? 0, ph = meta.height ?? 0;
  const space = meta.space; // 'srgb' | 'cmyk' | ...

  if (spec.width > 0 && spec.height > 0 && pw && ph) {
    // dpi для лучшей из двух ориентаций
    const o1 = Math.min((pw * 25.4) / spec.width, (ph * 25.4) / spec.height);
    const o2 = Math.min((pw * 25.4) / spec.height, (ph * 25.4) / spec.width);
    const dpi = Math.round(Math.max(o1, o2));
    if (dpi < 150) checks.push({ level: "error", message: `Очень низкое разрешение ~${dpi} dpi (нужно 300)` });
    else if (dpi < 250) checks.push({ level: "warn", message: `Низкое разрешение ~${dpi} dpi (рекомендуется 300)` });
    else checks.push({ level: "ok", message: `Разрешение ~${dpi} dpi` });
  }

  if (space && space !== "cmyk")
    checks.push({ level: "warn", message: `Цвет ${space.toUpperCase()} — будет сконвертирован в CMYK` });
}

export async function runPreflight(
  buf: Uint8Array,
  kind: "pdf" | "png" | "jpeg" | "tiff",
  spec: PreflightSpec,
): Promise<Preflight> {
  const checks: PreflightCheck[] = [];
  try {
    if (kind === "pdf") await preflightPdf(buf, spec, checks);
    else await preflightRaster(buf, spec, checks);
  } catch {
    checks.push({ level: "error", message: "Не удалось проверить файл — пусть проверит специалист" });
  }
  const status = checks.some((c) => c.level === "error")
    ? "red"
    : checks.some((c) => c.level === "warn")
      ? "yellow"
      : "green";
  return { status, checks };
}
