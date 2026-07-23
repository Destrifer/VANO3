// Пресет листового калькулятора + расшаривание расчёта ссылкой.
// Зачем: (1) кластерная/pSEO-страница открывает конфигуратор с предвыбранной
// опцией (серверный пресет, чистый URL); (2) пользователь может ПО КНОПКЕ
// получить ссылку на свой расчёт (02 §92). URL НЕ синхронизируется автоматически —
// чтобы в обычном обходе не плодились параметрические URL (чистый индекс).
import type { CalculatorState } from "./useCalculator";
import type { MultipageCalcState } from "./useMultipageCalculator";

// Семантический пресет (приходит со страницы или из URL). Все поля опциональны —
// применяем только то, что задано.
export type CalcPreset = {
  shape?: "rectangular" | "round" | "complex";
  sides?: "4+0" | "4+4";
  quantity?: number;
  // Размер ПО ЗНАЧЕНИЮ (предпочтительно) — мм, как заведено в каталоге.
  // Та же болезнь, что у paperIndex и foldTypeIndex: позиция съезжает при любой
  // перестановке размеров в админке. У POS-материалов это особенно больно —
  // там размер называет ИЗДЕЛИЕ («Ценник A7» / «Воблер 80×80» / «Хенгер»),
  // и съехавший индекс открывает кластер на чужом товаре.
  size?: { w: number; h: number };
  sizeIndex?: number; // устаревшее: позиция в product.sizes
  // Фальцовка ПО ЗНАЧЕНИЮ (предпочтительно): вид + число сгибов. Позиция в
  // product.foldTypes съезжает при любой перестановке вариантов в админке — так
  // и случилось: «Без сложения» переехало в начало списка, и все пять кластеров
  // буклетов молча стали показывать соседнюю фальцовку («Печать листовок» —
  // улитку в 3 сложения). Та же болезнь, что у paperIndex → paperId.
  fold?: { kind?: string; folds: number };
  foldTypeIndex?: number; // устаревшее: позиция в product.foldTypes
  cutType?: "none" | "kiss" | "die"; // резка наклеек (страницы вырубки → 'die')
  paperId?: number; // id материала (стабилен к сортировке/скрытию) — предпочтителен
  paperIndex?: number; // устаревшее: позиция в product.papers; съезжает при правке каталога
  foil?: boolean;
  foilColorIndex?: number;
  laminationIndex?: number;
  // Доп. отделка без группы (УФ-лак, конгрев…): подстроки имён, которые включить.
  // Сопоставление по имени (не по индексу) → не ломается при правке каталога.
  finishing?: string[];
  // — Многостраничные продукты (брошюры/каталоги): отдельная ветка пресета —
  formatIndex?: number; // индекс размера (product.sizes)
  bindingId?: number; // id переплёта (стабильнее индекса)
  pages?: number; // число полос (кратно PAGE_STEP, клампится)
  coverPaperId?: number; // id бумаги обложки (product.coverPapers) — multipage
  innerPaperId?: number; // id бумаги блока (product.innerPapers) — multipage
  // Сцена превью для КЛАСТЕРА, когда его изделие физически не то же, что у
  // продукта: «Печать газет» сидит на продукте «Журналы», «Стикерпаки» — на
  // «Наклейках». Ключ реестра `covers.ts` (multipage) или `mockups.ts`
  // (листовые); неизвестное имя молча падает на сцену продукта.
  previewKind?: string;
};

const clampIndex = (i: number, len: number) =>
  Number.isInteger(i) && i >= 0 && i < len ? i : null;

// Материал пресета → индекс в product.papers (уже отфильтрованном по status).
// paperId стабилен к сортировке и скрытию. Устаревший paperIndex — позиция в
// ИСХОДНОМ порядке каталога (paperOrder), поэтому переводим его через id: иначе
// скрытие любого материала молча сдвинуло бы все пресеты правее него.
// null — материал недоступен (скрыт/удалён): вызывающий оставляет дефолт.
export function resolvePaperIndex(
  papers: readonly { id: number }[],
  p: Pick<CalcPreset, "paperId" | "paperIndex">,
  paperOrder?: readonly number[],
): number | null {
  const byId = (id: number) => {
    const i = papers.findIndex((x) => x.id === id);
    return i >= 0 ? i : null;
  };
  if (p.paperId != null) return byId(p.paperId);
  if (p.paperIndex == null) return null;
  if (paperOrder?.length) {
    const i = clampIndex(p.paperIndex, paperOrder.length);
    return i == null ? null : byId(paperOrder[i]);
  }
  return clampIndex(p.paperIndex, papers.length);
}

// Фальцовка пресета → индекс в product.foldTypes.
// `fold` (kind+folds) устойчив к перестановке вариантов в админке; при точном
// совпадении вида и числа сгибов берём его, иначе ищем по одному числу сгибов
// (вид мог быть не задан), и лишь затем откатываемся на устаревшую позицию.
// null — применять нечего, вызывающий оставляет дефолт.
export function resolveFoldIndex(
  foldTypes: readonly { kind: string; folds: number }[],
  p: Pick<CalcPreset, "fold" | "foldTypeIndex">,
): number | null {
  if (p.fold) {
    if (p.fold.kind) {
      const exact = foldTypes.findIndex(
        (f) => f.kind === p.fold!.kind && f.folds === p.fold!.folds,
      );
      if (exact >= 0) return exact;
    }
    const byFolds = foldTypes.findIndex((f) => f.folds === p.fold!.folds);
    if (byFolds >= 0) return byFolds;
  }
  if (p.foldTypeIndex == null) return null;
  return clampIndex(p.foldTypeIndex, foldTypes.length);
}

// Размер пресета → индекс в product.sizes. Сначала по значению (ширина×высота),
// позиция — только запасной путь для старых пресетов. См. resolvePaperIndex и
// resolveFoldIndex: третий случай той же мины.
// null — применять нечего, вызывающий оставляет дефолт.
export function resolveSizeIndex(
  sizes: readonly { width: number; height: number }[],
  p: Pick<CalcPreset, "size" | "sizeIndex">,
): number | null {
  if (p.size) {
    const i = sizes.findIndex((s) => s.width === p.size!.w && s.height === p.size!.h);
    if (i >= 0) return i;
  }
  if (p.sizeIndex == null) return null;
  return clampIndex(p.sizeIndex, sizes.length);
}

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
  const sizeIdx = resolveSizeIndex(calc.product.sizes, p);
  if (sizeIdx != null) calc.sizeIndex = sizeIdx;
  // Фальцовка: сначала пробуем по значению (kind+folds), позиция — только как
  // запасной путь для старых пресетов.
  const foldIdx = resolveFoldIndex(calc.foldTypes, p);
  if (foldIdx != null) calc.foldTypeIndex = foldIdx;
  if (p.cutType && calc.allowContourCut) calc.cutType = p.cutType;
  const paperIdx = resolvePaperIndex(calc.product.papers, p, calc.product.paperOrder);
  if (paperIdx != null) calc.paperIndex = paperIdx;
  if (p.foil != null && calc.foilOption) calc.foilOn = p.foil;
  if (p.foilColorIndex != null && calc.foilOption) {
    const i = clampIndex(p.foilColorIndex, calc.foilOption.colors.length);
    if (i != null) calc.foilColorIndex = i;
  }
  if (p.laminationIndex != null) {
    const i = clampIndex(p.laminationIndex, calc.laminationOptions.length);
    if (i != null) calc.laminationIndex = i;
  }
  // Доп. отделка (УФ-лак, конгрев…): включаем чекбоксы по совпадению имени.
  // `fin` индексируется позицией в product.finishing; группированные (ламинация/
  // фольга) ведутся выше, здесь — только опции без группы.
  if (Array.isArray(p.finishing)) {
    for (const want of p.finishing) {
      const needle = want.toLowerCase();
      const i = calc.product.finishing.findIndex(
        (o) => !o.group && o.name.toLowerCase().includes(needle),
      );
      if (i >= 0 && calc.fin[i]) calc.fin[i].checked = true;
    }
  }
  if (p.previewKind) calc.setPreviewKind(p.previewKind);
}

// Пресет для МНОГОСТРАНИЧНОГО конфигуратора (брошюры/каталоги). Поля sheet-ветки
// игнорируются; читаем только formatIndex/bindingId/pages (+общие quantity/foil/
// laminationIndex). Серверный пресет с чистого URL — как у листового.
export function applyMultipagePreset(calc: MultipageCalcState, p: CalcPreset): void {
  if (!p) return;
  if (p.formatIndex != null && calc.product.sizes[p.formatIndex]) {
    calc.formatIndex = p.formatIndex;
  }
  // Полосы раньше переплёта: setPages триггерит авто-подбор переплёта, затем
  // явный bindingId перекрывает (если совместим с числом полос).
  if (p.pages != null && p.pages > 0) calc.setPages(p.pages);
  if (p.bindingId != null) {
    const i = calc.product.bindings.findIndex((b) => b.id === p.bindingId);
    if (i >= 0) calc.bindingIndex = i;
  }
  // Бумага обложки/блока по id (стабильно к сортировке; см. paperId у листовых).
  if (p.coverPaperId != null) {
    const i = calc.product.coverPapers.findIndex((x) => x.id === p.coverPaperId);
    if (i >= 0) calc.coverPaperIndex = i;
  }
  if (p.innerPaperId != null) {
    const i = calc.product.innerPapers.findIndex((x) => x.id === p.innerPaperId);
    if (i >= 0) calc.innerPaperIndex = i;
  }
  if (p.quantity != null && p.quantity > 0) calc.quantity = Math.floor(p.quantity);
  if (p.laminationIndex != null) {
    const i = clampIndex(p.laminationIndex, calc.laminationOptions.length);
    if (i != null) calc.laminationIndex = i;
  }
  if (p.foil != null && calc.foilOption) calc.foilOn = p.foil;
  if (p.previewKind) calc.setPreviewKind(p.previewKind);
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
  const cut = q.get("cut");
  if (cut === "none" || cut === "kiss" || cut === "die") out.cutType = cut;
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
  // Резка наклеек — пишем, только если отходит от дефолта (надсечка).
  if (calc.allowContourCut && calc.cutType !== "kiss") q.set("cut", calc.cutType);
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
