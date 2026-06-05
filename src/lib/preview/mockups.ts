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

export const mockups: Record<string, Mockup> = { card };

export function getMockup(kind?: string | null): Mockup {
  return (kind && mockups[kind]) || card;
}
