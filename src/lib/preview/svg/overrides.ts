// Узкий обход для сцен, которые НЕ переживают монохром.
//
// Почему это вообще нужно. Плитка рисует «сколько краски на белом», поэтому
// белое = ноль краски, то есть ЛЮБОЙ эффект, построенный на бликах, в ней
// исчезает — остаются одни тени. Купол смолы у объёмной наклейки именно такой:
// в цвете это стеклянная линза (яркий блик + мягкий спад), а в монохроме от неё
// оставалась только тёмная виньетка, и плитка читалась как чёрная кнопка.
//
// Живому превью это не грозит — там есть цвет и настоящие блики. Поэтому обход
// живёт ЗДЕСЬ, в слое плитки, а не в реестре сцен: `mockups.ts` остаётся одной
// реализацией макета (инвариант 1), а компромиссы носителя не протекают в него.
//
// Правило добавления: сюда попадает сцена, чей эффект физически неотобразим в
// «краске на белом», а не та, которая просто не нравится. Сейчас такая одна.
import { getMockup } from "../mockups";
import type { MockupEnv } from "../mockups";
import type { Rect } from "../primitives";

type TileContent = (ctx: CanvasRenderingContext2D, r: Rect, env: MockupEnv) => void;

// Купол в штриховой манере: кант линзы по периметру + серп блика сверху-слева.
// Это конвенция «стекло» в линейной графике — она сообщает объём контуром, а не
// светотенью, и потому переживает монохром.
function resinDomeOutline(ctx: CanvasRenderingContext2D, r: Rect, round: boolean) {
  const u = Math.min(r.w, r.h);
  const inset = u * 0.07;
  const ix = r.x + inset, iy = r.y + inset;
  const iw = r.w - 2 * inset, ih = r.h - 2 * inset;

  // кант линзы
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.38)";
  ctx.lineWidth = Math.max(1, u * 0.012);
  ctx.beginPath();
  if (round) {
    ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, iw / 2, ih / 2, 0, 0, Math.PI * 2);
  } else {
    const rad = u * 0.12;
    ctx.moveTo(ix + rad, iy);
    ctx.arcTo(ix + iw, iy, ix + iw, iy + ih, rad);
    ctx.arcTo(ix + iw, iy + ih, ix, iy + ih, rad);
    ctx.arcTo(ix, iy + ih, ix, iy, rad);
    ctx.arcTo(ix, iy, ix + iw, iy, rad);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // серп блика — две дуги в левом верхнем углу линзы
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = Math.max(1, u * 0.02);
  ctx.beginPath();
  ctx.arc(r.x + r.w / 2, r.y + r.h / 2, u * 0.3, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, u * 0.012);
  ctx.beginPath();
  ctx.arc(r.x + r.w / 2, r.y + r.h / 2, u * 0.375, Math.PI * 1.12, Math.PI * 1.32);
  ctx.stroke();
  ctx.restore();
}

export const tileOverrides: Record<string, TileContent> = {
  // Объёмная наклейка: та же «рыба», что у обычной наклейки, но под линзой,
  // нарисованной контуром вместо светотени.
  "volume-sticker"(ctx, r, env) {
    getMockup("sticker").content(ctx, r, env);
    resinDomeOutline(ctx, r, env.round);
  },
};
