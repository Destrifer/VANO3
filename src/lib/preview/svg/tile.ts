// Плитка каталога: инлайновый SVG сцены продукта, отрисованный на СБОРКЕ через
// адаптер `SvgContext`. Повторяет геометрию `Preview.vue::draw()` (вписать
// карточку нужной пропорции, контур, скругление), но БЕЗ материи, глянца и
// фольги — плитке нужен узнаваемый ink-силуэт, а не фотореализм (урок из
// 07-preview-mockups.md: «узнаваемость важнее правдоподобия»).
//
// Сцену берём из того же реестра `mockups.ts`, что и живое превью — одна
// реализация макета на оба места (инвариант 1). Multipage-обложки (covers.ts)
// пока не покрыты: у них свой stage (книжка), это отдельный заход.
import { getMockup } from "../mockups";
import { shapePath, inkColor, type Rect, type ShapeKind } from "../primitives";
import { SvgContext } from "./context";

export type TileInput = {
  previewKind?: string | null;
  // формат изделия в мм (первый размер каталога) — задаёт пропорцию куклы
  mm?: { w: number; h: number } | null;
  round?: boolean;
  sizeLabel?: string; // метка размера (POS-материалы ветвят силуэт по ней)
  base?: string; // цвет бумаги; по умолчанию нейтральный крем
};

// Пропорции медиа-зоны плитки. 0.66 — как высота живого превью (cssH = cssW·0.66).
const W = 300;
const H = 198;

// Нейтральная кремовая бумага: тёмный ink на ней читается, и плитка выглядит
// одинаково независимо от материала кластера (материал — забота движка, не плитки).
const BASE = "#f4efe6";

export function productTileSvg(input: TileInput): string {
  const round = !!input.round;
  const shape: ShapeKind = round ? "round" : "rectangular";
  const base = input.base ?? BASE;
  const ctx = new SvgContext(W, H);
  const c = ctx as unknown as CanvasRenderingContext2D;

  // вписать карточку нужной пропорции в рамку с полями (как в Preview.vue)
  const aw = round ? 1 : input.mm?.w || 90;
  const ah = round ? 1 : input.mm?.h || 50;
  const aspect = aw / ah;
  const fpad = Math.min(W, H) * 0.14;
  const availW = W - 2 * fpad, availH = H - 2 * fpad;
  let cw = availW, ch = cw / aspect;
  if (ch > availH) { ch = availH; cw = ch * aspect; }
  const x = (W - cw) / 2, y = (H - ch) / 2;
  const minSide = Math.min(cw, ch);
  const radius = round ? minSide / 2 : minSide * 0.03;
  const r: Rect = { x, y, w: cw, h: ch };

  // подложка изделия
  shapePath(c, r, radius, shape);
  c.fillStyle = base;
  c.fill();

  // ink-«кукла» внутри контура
  const env = {
    round,
    ink: inkColor(base),
    foilOn: false,
    foilHex: "#d9b44a",
    foldCount: 0,
    sizeLabel: input.sizeLabel ?? "",
  };
  c.save();
  shapePath(c, r, radius, shape);
  c.clip();
  getMockup(input.previewKind).content(c, r, env);
  c.restore();

  // тонкий контур печати
  shapePath(c, r, radius, shape);
  c.lineWidth = 1;
  c.strokeStyle = "rgba(0,0,0,.15)";
  c.stroke();

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="product-tile__svg" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${ctx.toSVG()}</svg>`;
}
