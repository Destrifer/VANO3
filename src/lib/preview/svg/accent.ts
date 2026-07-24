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
import type { AccentMark, Rect } from "../primitives";
import { roundRect } from "../primitives";

export const ACCENT = "var(--color-accent-ink)";

// Метка «съедает» плитку, если её кегль больше этой доли меньшей стороны.
// Акцент обязан быть ПЯТНОМ на кукле, а не самой куклой: у наклейки монограмма
// занимает треть поля, и покрашенная целиком плитка читалась как «красное PM»,
// а не как наклейка. Порог подобран по факту: 0.34 у наклейки и объёмной
// наклейки отсекается, 0.24 у бирки и 0.2 у визитки остаются.
const DOMINANT = 0.28;

// Красим ли акцент вообще — и, если да, по каким меткам.
//
// Два случая осознанного отказа:
// 1) Сцена меток НЕ объявила. Фолбэк `defaultAccentMarks` ставит дежурное «PM»
//    в угол — он существует для ФОЛЬГИ (чтобы галочка не была немой), но как
//    акцент плитки это случайная печать поверх чужого рисунка: так карты,
//    чертежи, планы эвакуации и трафареты получали красное «PM» ни к чему.
// 2) Метка доминирует по размеру (см. DOMINANT).
//
// null — акцента не будет. Вызывающий ОБЯЗАН тогда оставить `foilOn = false`,
// иначе сцена не напечатает элемент краской (она уступает его движку) и он
// исчезнет вовсе.
export function resolveAccent<E>(
  scene: { accentMarks?: (r: Rect, env: E) => AccentMark[] },
  r: Rect,
  env: E,
): AccentMark[] | null {
  if (!scene.accentMarks) return null; // случай 1
  const marks = scene.accentMarks(r, env);
  if (!marks.length) return null; // осознанный запрет сцены (QR, газета)
  const u = Math.min(r.w, r.h);
  const dominates = marks.some((m) => m.kind === "text" && m.size > u * DOMINANT);
  return dominates ? null : marks; // случай 2
}

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
