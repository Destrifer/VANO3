// Пресет листового калькулятора + расшаривание расчёта ссылкой.
// Зачем: (1) кластерная/pSEO-страница открывает конфигуратор с предвыбранной
// опцией (серверный пресет, чистый URL); (2) пользователь может ПО КНОПКЕ
// получить ссылку на свой расчёт (02 §92). URL НЕ синхронизируется автоматически —
// чтобы в обычном обходе не плодились параметрические URL (чистый индекс).
import type { CalculatorState } from "./useCalculator";

// Семантический пресет (приходит со страницы или из URL). Все поля опциональны —
// применяем только то, что задано.
export type CalcPreset = {
  shape?: "rectangular" | "round" | "complex";
  sides?: "4+0" | "4+4";
  quantity?: number;
  paperIndex?: number;
  foil?: boolean;
  foilColorIndex?: number;
  laminationIndex?: number;
};

const clampIndex = (i: number, len: number) =>
  Number.isInteger(i) && i >= 0 && i < len ? i : null;

// Применить пресет к реактивному состоянию (с защитой диапазонов/доступности).
export function applyPreset(calc: CalculatorState, p: CalcPreset): void {
  if (!p) return;
  if (p.shape && calc.shapes.some((s) => s.value === p.shape)) {
    calc.shape = p.shape;
  }
  if (p.sides && !calc.singleSided && !calc.doubleSided) {
    calc.sides = p.sides;
  }
  if (p.quantity != null && p.quantity > 0) calc.quantity = Math.floor(p.quantity);
  if (p.paperIndex != null) {
    const i = clampIndex(p.paperIndex, calc.product.papers.length);
    if (i != null) calc.paperIndex = i;
  }
  if (p.foil != null && calc.foilOption) calc.foilOn = p.foil;
  if (p.foilColorIndex != null && calc.foilOption) {
    const i = clampIndex(p.foilColorIndex, calc.foilOption.colors.length);
    if (i != null) calc.foilColorIndex = i;
  }
  if (p.laminationIndex != null) {
    const i = clampIndex(p.laminationIndex, calc.laminationOptions.length);
    if (i != null) calc.laminationIndex = i;
  }
}

// URL → пресет (короткие читаемые параметры).
export function presetFromSearch(search: string): CalcPreset {
  const q = new URLSearchParams(search);
  const out: CalcPreset = {};
  const shape = q.get("shape");
  if (shape === "rectangular" || shape === "round" || shape === "complex") out.shape = shape;
  const sides = q.get("sides");
  if (sides === "1") out.sides = "4+0";
  if (sides === "2") out.sides = "4+4";
  const qty = q.get("qty");
  if (qty && Number(qty) > 0) out.quantity = Number(qty);
  const paper = q.get("paper");
  if (paper != null && paper !== "") out.paperIndex = Number(paper);
  if (q.get("foil") === "1") out.foil = true;
  const fc = q.get("fc");
  if (fc != null && fc !== "") out.foilColorIndex = Number(fc);
  const lam = q.get("lam");
  if (lam != null && lam !== "") out.laminationIndex = Number(lam);
  return out;
}

// Состояние → query-параметры (пишем только «небанальные» значения, чтобы URL был чистым).
export function searchFromCalc(calc: CalculatorState): string {
  const q = new URLSearchParams();
  if (calc.shape !== "rectangular") q.set("shape", calc.shape);
  if (!calc.singleSided && !calc.doubleSided && calc.sides === "4+4") q.set("sides", "2");
  if (calc.quantity !== 100) q.set("qty", String(calc.quantity));
  if (calc.paperIndex !== 0) q.set("paper", String(calc.paperIndex));
  if (calc.foilOn) {
    q.set("foil", "1");
    if (calc.foilColorIndex) q.set("fc", String(calc.foilColorIndex));
  }
  if (calc.laminationIndex >= 0) q.set("lam", String(calc.laminationIndex));
  const s = q.toString();
  return s ? `?${s}` : "";
}

// Клиентская инициализация: один раз прочитать пресет из URL (перекрывает
// серверный пресет — «расшаренная ссылка победила»). БЕЗ обратной записи в URL.
// Вызывать ТОЛЬКО на клиенте (onMounted).
export function applyPresetFromUrl(calc: CalculatorState): void {
  if (typeof window === "undefined") return;
  applyPreset(calc, presetFromSearch(window.location.search));
}

// Абсолютная ссылка на текущий расчёт (для кнопки «Получить ссылку»).
export function buildShareUrl(calc: CalculatorState): string {
  if (typeof window === "undefined") return "";
  const { origin, pathname } = window.location;
  return origin + pathname + searchFromCalc(calc);
}
