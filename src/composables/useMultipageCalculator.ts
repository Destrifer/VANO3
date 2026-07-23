// Калькулятор многостраничной продукции (брошюры/каталоги/…).
// Тот же архитектурный слой, что визитки (общие презентационные поля), плюс:
// обложка (вторая бумага+стороны), полосы и переплёт. Спуск считает движок
// геометрически от печатного листа. Удовлетворяет контракту SharedCalc.
import { reactive, ref, computed, watch, type InjectionKey } from "vue";
import { computePrice, PAGE_STEP, type MultipageConfig, type Sides } from "../lib/pricing/engine";
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing, PaperOption } from "../lib/pricing/data";
import { CALC_DEFAULT_QTY } from "../lib/pricing/data";
import type { SpecInput } from "../lib/pricing/spec";
import { isLaminationLocked, forcedLaminationIndex } from "../lib/pricing/rules";
import { glyphFor, splitLabel, type SizeTile } from "../lib/calculator/sizeGlyph";

type Group = { group: string; options: { index: number; name: string; thumb: PaperOption["thumb"]; full: PaperOption["full"] }[] };
function buildGroups(papers: PaperOption[]): Group[] {
  const groups: Group[] = [];
  papers.forEach((p, index) => {
    let g = groups.find((x) => x.group === p.group);
    if (!g) { g = { group: p.group, options: [] }; groups.push(g); }
    g.options.push({ index, name: p.name, thumb: p.thumb, full: p.full });
  });
  return groups;
}

export function useMultipageCalculator(props: {
  product: ProductPricing;
  pricing: PricingData;
}) {
  const product = props.product;
  const pricing = props.pricing;
  const sheet = pricing.brochureSheet;
  const usableW = sheet.width - 2 * sheet.margin;
  const usableH = sheet.height - 2 * sheet.margin;
  const maxDim = Math.round(Math.max(usableW, usableH));
  const fits = (w: number, h: number) =>
    w >= 50 && h >= 50 &&
    ((w <= usableW && h <= usableH) || (w <= usableH && h <= usableW));

  // — Формат (пресет или «свой размер» на месте) —
  const formatIndex = ref(0); // -1 → свой размер
  const customMode = computed(() => formatIndex.value === -1);
  const customW = ref(210);
  const customH = ref(297);
  const backToList = () => { formatIndex.value = 0; };
  const format = computed(() => product.sizes[formatIndex.value]);
  const dims = computed(() =>
    customMode.value
      ? { w: customW.value, h: customH.value }
      : { w: format.value?.width ?? 0, h: format.value?.height ?? 0 },
  );
  const formatValid = computed(() => fits(dims.value.w, dims.value.h));

  // — Плитки-иконки выбора формата (без формы — многостраничное всегда прямоуг.) —
  const sizeTiles = computed<SizeTile[]>(() => {
    const tiles: SizeTile[] = product.sizes.map((s, i) => {
      const { top, sub } = splitLabel(s.label, s.width, s.height, s.shape);
      return { id: `p${i}`, glyph: glyphFor(s.shape, s.width, s.height), label: top, sub };
    });
    tiles.push({
      id: "custom", glyph: "custom", label: "Свой",
      sub: customMode.value ? `${customW.value}×${customH.value}` : undefined,
    });
    return tiles;
  });
  const activeTileId = computed(() => (customMode.value ? "custom" : `p${formatIndex.value}`));
  const sizeInput = computed<"rect" | "round" | null>(() => (customMode.value ? "rect" : null));
  function selectTile(id: string) {
    formatIndex.value = id === "custom" ? -1 : Number(id.slice(1));
  }

  // — Полосы (кратно 4, свободно в общем диапазоне) — переплёт подстраивается —
  // Границы — по РЕАЛЬНЫМ переплётам продукта. Раньше здесь стояла жёсткая
  // восьмёрка (`Math.min(...minPages, 8)`), и она опускала нижнюю границу ниже
  // того, что продукт умеет: у выпускных альбомов самый «короткий» переплёт —
  // 7БЦ от 32 полос, поэтому калькулятор открывался на 8 полосах, где ОБА
  // переплёта несовместимы. autoBinding() в таком состоянии не находит ни
  // одного кандидата и оставляет bindings[0], а движок честно считает цену
  // несобираемой конфигурации: страница показывала 39 800 ₽ и активную кнопку
  // «В корзину» (сервер минимум полос тоже не проверяет). Восьмёрка нужна была
  // только как фолбэк для продукта без переплётов — им и осталась.
  const allMin = product.bindings.length
    ? Math.min(...product.bindings.map((b) => b.minPages))
    : 8;
  const allMax = product.bindings.length
    ? Math.max(...product.bindings.map((b) => b.maxPages))
    : 8;
  const pagesMin = Math.ceil(allMin / PAGE_STEP) * PAGE_STEP;
  const pagesMax = Math.floor(allMax / PAGE_STEP) * PAGE_STEP;
  const clampPages = (p: number) =>
    Math.max(pagesMin, Math.min(pagesMax, Math.round(p / PAGE_STEP) * PAGE_STEP));
  const pages = ref(clampPages(8));
  const setPages = (p: number) => { pages.value = clampPages(p); };
  const incPages = () => setPages(pages.value + PAGE_STEP);
  const decPages = () => setPages(pages.value - PAGE_STEP);

  // — Переплёт: авто-выбор по числу полос; несовместимые недоступны —
  const bindingIndex = ref(0);
  const binding = computed(() => product.bindings[bindingIndex.value] ?? product.bindings[0]);
  const bindingCompatible = (b: { minPages: number; maxPages: number }) =>
    pages.value >= b.minPages && pages.value <= b.maxPages;
  function autoBinding() {
    if (binding.value && bindingCompatible(binding.value)) return; // текущий ок
    const idx = product.bindings.findIndex((b) => bindingCompatible(b));
    if (idx >= 0) bindingIndex.value = idx;
  }
  watch(pages, autoBinding, { immediate: true });

  // — Бумаги (обложка/блок) с группами; блок всегда белый (без выбора цвета) —
  const innerGroups = computed(() => buildGroups(product.innerPapers));
  const coverGroups = computed(() => buildGroups(product.coverPapers));
  const innerPaperIndex = ref(0);
  const coverPaperIndex = ref(0);
  const innerPaper = computed(() => product.innerPapers[innerPaperIndex.value] ?? product.innerPapers[0]);
  const coverPaper = computed(() => product.coverPapers[coverPaperIndex.value] ?? product.coverPapers[0]);
  const coverColors = computed(() => coverPaper.value?.colors ?? []);
  const coverColorIndex = ref(0);
  watch(coverPaperIndex, () => { coverColorIndex.value = 0; });

  // — Разлиновка блока (Directus `ruling_options`; у блокнотов есть, у брошюр нет) —
  // На цену не влияет: линовка — это макет блока, который и так печатается 4+4.
  // Поэтому в buildConfig() её нет, только в details() и в спеке заказа.
  const rulingOptions = product.rulingOptions;
  const hasRuling = rulingOptions.length > 0;
  const rulingIndex = ref(0);
  // В спек/итог едет ИМЯ варианта (строка), как и раньше.
  const ruling = computed(() =>
    hasRuling ? (rulingOptions[rulingIndex.value] ?? rulingOptions[0]).name : null,
  );
  const selectRuling = (i: number) => { rulingIndex.value = i; };

  // — Сцена превью (реестр `covers.ts`) —
  // По умолчанию берётся с продукта, но КЛАСТЕР может переопределить пресетом:
  // «Печать газет» живёт продуктом «Журналы», а газета физически не журнал.
  // Пресет — JSON-поле promoted_pages, схему трогать не нужно.
  const previewKindOverride = ref<string | null>(null);
  const previewKind = computed(() => previewKindOverride.value ?? product.previewKind ?? null);
  const setPreviewKind = (k: string | null) => { previewKindOverride.value = k; };

  // — Печать: блок всегда двусторонний (4 полосы на лист → 4+4), обложка на выбор —
  const innerSides: Sides = "4+4";
  const coverSides = ref<Sides>("4+0");

  // — Отделка обложки: ламинация / фольга (общий CoatingField, правила как у визиток) —
  const laminationOptions = computed(() => product.finishing.filter((o) => o.group === "Ламинация"));
  const foilOption = computed(() => product.finishing.find((o) => o.group === "Фольгирование") ?? null);
  const laminationIndex = ref(-1);
  const foilOn = ref(false);
  const foilColorIndex = ref(0);
  const laminationLocked = computed(() => isLaminationLocked(foilOn.value));
  watch(foilOn, (on) => {
    const idx = forcedLaminationIndex(on, laminationOptions.value.map((o) => o.name));
    if (idx >= 0) laminationIndex.value = idx;
  });
  // Доп. обработка обложки: ungrouped-опции (УФ-лак, конгрев, объёмный лак).
  // Чекбоксы; все per_item → цена на весь тираж, ручной count не нужен.
  const coverExtras = product.finishing.filter((o) => !o.group);
  const extraChecked = ref<boolean[]>(coverExtras.map(() => false));

  // — Тираж —
  // Плитки — из продукта (Directus `qty_presets`): у фотокниги/книги минимум 1
  // экз., у тиражных — 50. Это ярлыки, а не ограничение: «Другой тираж» берёт
  // любое число от 1, нижняя граница заказа — сумма корзины, а не тираж.
  const presets = product.qtyPresets;
  const quantity = ref(presets.includes(CALC_DEFAULT_QTY) ? CALC_DEFAULT_QTY : presets[0]);
  const totalQty = computed(() => quantity.value);
  const selectQty = (q: number) => { quantity.value = q; };

  // — Макет —
  const artworkMode = ref<import("./calcShared").ArtworkMode>("have");
  const artworkId = ref<string | null>(null);
  const artworkName = ref<string | null>(null);
  const artworkPreflight = ref<import("../lib/preflight").Preflight | null>(null);
  const sides = computed(() => innerSides);

  function coverFinishing(): { option: any; count?: number }[] {
    const f: { option: any; count?: number }[] = [];
    const lam = laminationOptions.value[laminationIndex.value];
    if (laminationIndex.value >= 0 && lam) f.push({ option: lam });
    if (foilOn.value && foilOption.value) f.push({ option: foilOption.value });
    coverExtras.forEach((o, i) => { if (extraChecked.value[i]) f.push({ option: o }); });
    return f;
  }

  function buildConfig(total: number): MultipageConfig | null {
    const inner = innerPaper.value;
    const cover = coverPaper.value;
    const b = binding.value;
    if (!inner || !cover || !b || pages.value < 1 || !formatValid.value) return null;
    return {
      strategy: "multipage",
      width: dims.value.w,
      height: dims.value.h,
      pages: pages.value,
      innerSides: innerSides,
      coverSides: coverSides.value,
      innerPaper: inner,
      coverPaper: cover,
      binding: b,
      quantity: total,
      urgent: false,
      finishing: coverFinishing(),
    };
  }

  const result = computed(() => {
    if (totalQty.value < 1) return null;
    const cfg = buildConfig(totalQty.value);
    return cfg ? computePrice(cfg, pricing) : null;
  });
  function perUnit(qty: number): number | null {
    if (qty < 1) return null;
    const cfg = buildConfig(qty);
    if (!cfg) return null;
    return computePrice(cfg, pricing).total / qty;
  }

  let thumbFn: (() => string | null) | null = null;
  const setThumbProvider = (fn: () => string | null) => { thumbFn = fn; };
  const captureThumb = () => (thumbFn ? thumbFn() : null);

  function details(): { label: string; value: string }[] {
    const d: { label: string; value: string }[] = [];
    d.push({ label: "Формат", value: customMode.value ? `${dims.value.w}×${dims.value.h} мм (свой)` : (format.value?.label ?? `${dims.value.w}×${dims.value.h} мм`) });
    d.push({ label: "Полос", value: `${pages.value}` });
    if (binding.value) d.push({ label: "Переплёт", value: binding.value.name });
    if (coverPaper.value) {
      const c = coverColors.value[coverColorIndex.value]?.name;
      d.push({ label: "Обложка", value: c ? `${coverPaper.value.name} (${c})` : coverPaper.value.name });
    }
    if (innerPaper.value) d.push({ label: "Блок", value: `${innerPaper.value.name} (белый)` });
    if (ruling.value) d.push({ label: "Разлиновка", value: ruling.value });
    if (laminationIndex.value >= 0) {
      const lam = laminationOptions.value[laminationIndex.value]?.name;
      if (lam) d.push({ label: "Ламинация обложки", value: lam });
    }
    if (foilOn.value && foilOption.value) {
      const fc = foilOption.value.colors[foilColorIndex.value]?.name;
      d.push({ label: "Фольга обложки", value: fc ?? "да" });
    }
    coverExtras.forEach((o, i) => {
      if (extraChecked.value[i]) d.push({ label: "Отделка обложки", value: o.name });
    });
    d.push({ label: "Печать", value: `обложка ${coverSides.value}, блок ${innerSides}` });
    d.push({ label: "Тираж", value: `${totalQty.value} шт` });
    if (artworkMode.value === "design") d.push({ label: "Макет", value: "нужен дизайн" });
    return d;
  }

  const currentSpec = (): SpecInput => ({
    kind: "multipage",
    width: dims.value.w,
    height: dims.value.h,
    pages: pages.value,
    innerSides: innerSides,
    coverSides: coverSides.value,
    innerPaperId: innerPaper.value?.id ?? 0,
    coverPaperId: coverPaper.value?.id ?? 0,
    innerColorId: null, // блок всегда белый
    coverColorId: coverColors.value[coverColorIndex.value]?.id ?? null,
    bindingId: binding.value?.id ?? 0,
    ruling: ruling.value,
    quantity: totalQty.value,
    laminationId:
      laminationIndex.value >= 0 ? laminationOptions.value[laminationIndex.value]?.id ?? null : null,
    foil:
      foilOn.value && foilOption.value
        ? { id: foilOption.value.id, colorId: foilOption.value.colors[foilColorIndex.value]?.id ?? null }
        : null,
    finishing: coverExtras
      .filter((_, i) => extraChecked.value[i])
      .map((o) => ({ id: o.id, count: 1 })), // per_item — count игнорируется движком
    needsDesign: artworkMode.value === "design" || undefined,
  });

  const money = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

  return reactive({
    product, pricing,
    // формат
    formatIndex, customMode, customW, customH, backToList, format, dims, formatValid, maxDim,
    // плитки-иконки выбора формата
    sizeTiles, activeTileId, sizeInput, selectTile,
    // полосы / переплёт
    pages, pagesMin, pagesMax, setPages, incPages, decPages,
    bindingIndex, binding, bindingCompatible,
    // бумаги / печать / тираж
    innerGroups, coverGroups, innerPaperIndex, coverPaperIndex, innerPaper, coverPaper,
    coverColors, coverColorIndex,
    innerSides, coverSides, sides, presets, quantity, totalQty, selectQty,
    // разлиновка блока (на цену не влияет)
    rulingOptions, hasRuling, rulingIndex, ruling, selectRuling,
    // сцена превью
    previewKind, setPreviewKind,
    // отделка обложки
    laminationOptions, foilOption, laminationIndex, foilOn, foilColorIndex, laminationLocked,
    coverExtras, extraChecked,
    // макет
    artworkMode, artworkId, artworkName, artworkPreflight,
    // расчёт / контракт
    result, perUnit, money, details, currentSpec, setThumbProvider, captureThumb,
  });
}

export type MultipageCalcState = ReturnType<typeof useMultipageCalculator>;
export const mpCalcKey: InjectionKey<MultipageCalcState> = Symbol("mpCalc");
