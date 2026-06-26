// Реестр макетов превью по продуктам. Каждый макет рисует ТОЛЬКО содержимое
// («рыбу»), а универсальные слои (контур, материя, глянец) даёт Preview.vue.
// Новый продукт со своей сценой = +1 запись здесь, движок не трогаем.
import type { Rect } from "./primitives";
import { drawFoilText } from "./primitives";

export type MockupEnv = {
  round: boolean;
  ink: string; // цвет краски печати (контраст к бумаге)
  foilOn: boolean;
  foilHex: string;
  foldCount: number; // число сгибов (буклеты) → панелей = foldCount + 1
};

export type Mockup = {
  // ink-слой (до глянца ламинации)
  content: (ctx: CanvasRenderingContext2D, r: Rect, env: MockupEnv) => void;
  // foil-слой (после глянца, металл поверх) — опционально
  foil?: (ctx: CanvasRenderingContext2D, r: Rect, env: MockupEnv) => void;
};

const pad = (r: Rect, round: boolean) => Math.min(r.w, r.h) * (round ? 0.2 : 0.1);

// Макет «визитка»: лого-монограмма, имя, должность, разделитель, контакты.
const card: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const round = env.round;
    const p = pad(r, round);
    const cx = x + w / 2;
    const anchorX = round ? cx : x + p;
    const fs = round ? 0.85 : 1; // мельче для круга
    const ink = env.ink;
    const lineH = h * 0.085 * fs;
    ctx.textAlign = round ? "center" : "left";

    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.textBaseline = "top";
      ctx.font = `700 ${Math.round(h * 0.18 * fs)}px Georgia, serif`;
      ctx.fillText("PM", anchorX, y + p);
    }

    ctx.textBaseline = "alphabetic";
    const contacts = ["+7 495 000-00-00", "mail@printmos.ru", "Москва, ул. Примерная, 1"];
    ctx.font = `400 ${Math.round(h * 0.07 * fs)}px system-ui, sans-serif`;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.8;
    const lastBaseline = y + h - p;
    contacts.forEach((t, i) => {
      ctx.fillText(t, anchorX, lastBaseline - (contacts.length - 1 - i) * lineH);
    });
    ctx.globalAlpha = 1;

    const dividerY = lastBaseline - (contacts.length - 1) * lineH - lineH * 1.25;
    const dw = round ? (w - 2 * p) * 0.7 : w - 2 * p;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, h * 0.005);
    ctx.beginPath();
    ctx.moveTo(cx - dw / 2, dividerY);
    ctx.lineTo(cx + dw / 2, dividerY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const titleBaseline = dividerY - h * 0.07 * fs;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.65;
    ctx.font = `400 ${Math.round(h * 0.075 * fs)}px system-ui, sans-serif`;
    ctx.fillText("Менеджер по печати", anchorX, titleBaseline);
    ctx.globalAlpha = 1;
    ctx.font = `700 ${Math.round(h * 0.12 * fs)}px system-ui, sans-serif`;
    ctx.fillText("Иван Петров", anchorX, titleBaseline - h * 0.105 * fs);
  },
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const round = env.round;
    const p = pad(r, round);
    const fs = round ? 0.85 : 1;
    const size = Math.round(h * 0.18 * fs);
    const lx = round ? x + w / 2 : x + p;
    drawFoilText(ctx, "PM", lx, y + p, size, round ? "center" : "left", env.foilHex);
  },
};

// Макет «наклейка»: крупный центрированный знак + подпись (под любую форму).
const sticker: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const m = Math.min(w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (!env.foilOn) {
      ctx.fillStyle = env.ink;
      ctx.font = `800 ${Math.round(m * 0.34)}px Georgia, serif`;
      ctx.fillText("PM", cx, cy - h * 0.04);
    }
    ctx.fillStyle = env.ink;
    ctx.globalAlpha = 0.7;
    ctx.font = `600 ${Math.round(m * 0.09)}px system-ui, sans-serif`;
    ctx.fillText("PRINTMOS", cx, cy + h * 0.22);
    ctx.globalAlpha = 1;
  },
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const m = Math.min(w, h);
    const size = Math.round(m * 0.34);
    drawFoilText(ctx, "PM", x + w / 2, y + h / 2 - h * 0.04 - size / 2, size, "center", env.foilHex);
  },
};

// Макет «буклет/листовка»: контент колонками по числу панелей (foldCount+1).
// Каждая панель — плашка изображения сверху, заголовок, строки текста (нечитаемо,
// но обозначает структуру). Линии сгиба рисует Preview.vue поверх.
const leaflet: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const panels = Math.max(1, (env.foldCount || 0) + 1);
    const pw = w / panels;
    const pad = Math.min(pw, h) * 0.08;
    for (let i = 0; i < panels; i++) {
      const px = x + i * pw + pad;
      const innerW = pw - 2 * pad;
      ctx.fillStyle = env.ink;
      // плашка изображения
      ctx.globalAlpha = 0.14;
      ctx.fillRect(px, y + pad, innerW, h * 0.3);
      // заголовок
      ctx.globalAlpha = 0.6;
      ctx.fillRect(px, y + h * 0.42, innerW * 0.7, Math.max(2, h * 0.03));
      // абзац
      ctx.globalAlpha = 0.32;
      const lh = h * 0.06;
      for (let l = 0; l < 4; l++) {
        ctx.fillRect(px, y + h * 0.52 + l * lh, innerW * (l === 3 ? 0.5 : 0.95), Math.max(1, h * 0.02));
      }
      ctx.globalAlpha = 1;
    }
  },
};

// Макет «фирменный бланк/документ»: лого + реквизиты в шапке, разделитель,
// строки текста письма. Шрифты масштабируются от ШИРИНЫ (не высоты) — иначе на
// портретном A4 буквы вылезают за край (баг макета `card` на бланках).
const letterhead: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const p = w * 0.1;
    const ink = env.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // лого PM (если не фольга — её рисует foil-слой)
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(w * 0.11)}px Georgia, serif`;
      ctx.fillText("PM", x + p, y + p);
    }

    // название + реквизиты справа в шапке
    ctx.textAlign = "right";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.78;
    ctx.font = `700 ${Math.round(w * 0.045)}px system-ui, sans-serif`;
    ctx.fillText("PRINTMOS", x + w - p, y + p);
    ctx.globalAlpha = 0.5;
    ctx.font = `400 ${Math.round(w * 0.032)}px system-ui, sans-serif`;
    ["ООО «Принтмос»", "ИНН 7700000000", "+7 495 000-00-00"].forEach((t, i) =>
      ctx.fillText(t, x + w - p, y + p + w * 0.08 + i * w * 0.045),
    );
    ctx.globalAlpha = 1;

    // разделитель под шапкой
    const hy = y + p + w * 0.24;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, w * 0.006);
    ctx.beginPath();
    ctx.moveTo(x + p, hy);
    ctx.lineTo(x + w - p, hy);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // строки текста письма (нечитаемо, обозначают документ)
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.22;
    const lh = h * 0.04;
    const startY = hy + h * 0.05;
    const rows = Math.max(0, Math.min(14, Math.floor((y + h - p - startY) / lh)));
    for (let i = 0; i < rows; i++) {
      const ww = i % 4 === 3 ? 0.45 : 0.92;
      ctx.fillRect(x + p, startY + i * lh, (w - 2 * p) * ww, Math.max(1, h * 0.011));
    }
    ctx.globalAlpha = 1;
  },
  foil(ctx, r, env) {
    const { x, y, w } = r;
    drawFoilText(ctx, "PM", x + w * 0.1, y + w * 0.1, Math.round(w * 0.11), "left", env.foilHex);
  },
};

export const mockups: Record<string, Mockup> = { card, sticker, leaflet, letterhead };

export function getMockup(kind?: string | null): Mockup {
  return (kind && mockups[kind]) || card;
}
