// Акцентное пятно плитки: единственный цвет в монохромной куколке.
//
// ГДЕ он лежит, сцена уже объявила сама — через `accentMarks()`, тот же список,
// которым пользуются фольга, УФ-лак и конгрев. Поэтому здесь нет ни одного
// знания о конкретных сценах: новая сцена получает акцент автоматически, а
// осознанный отказ (пустой список у QR-кода и газеты) продолжает работать.
//
// Приём: stage выставляет `env.foilOn = true`, и сцена НЕ рисует декорируемый
// элемент краской, оставляя его движку — ровно как под фольгу. Только вместо
// металла движок кладёт сюда плоский `--color-accent-ink`.
import type { AccentMark } from "../primitives";
import { roundRect } from "../primitives";

export const ACCENT = "var(--color-accent-ink)";

export function paintAccentMarks(
  ctx: CanvasRenderingContext2D,
  marks: readonly AccentMark[],
) {
  for (const m of marks) {
    ctx.save();
    ctx.fillStyle = ACCENT;
    if (m.kind === "text") {
      ctx.textAlign = m.align ?? "left";
      ctx.textBaseline = "top";
      ctx.font = `700 ${m.size}px ${m.font ?? "Georgia, serif"}`;
      ctx.fillText(m.text, m.x, m.y);
    } else {
      roundRect(ctx, m.x, m.y, m.w, m.h, m.radius ?? 0);
      ctx.fill();
    }
    ctx.restore();
  }
}
