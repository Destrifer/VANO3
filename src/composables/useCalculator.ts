// Вся реактивная логика калькулятора в одном месте.
// Компонент Calculator.vue создаёт это состояние и раздаёт полям через provide/inject,
// поэтому поля остаются «тупыми» (только отображение), без проброса десятков пропсов.
import { reactive, ref, computed, watch, type InjectionKey } from "vue";
import { computePrice, type OrderConfig, type AnyConfig, type Sides, type CutType } from "../lib/pricing/engine";
import type { PricingData, Sheet } from "../lib/pricing/engine";
import type { ProductPricing, PaperOption } from "../lib/pricing/data";
import { isLaminationLocked, forcedLaminationIndex } from "../lib/pricing/rules";
import type { SpecInput } from "../lib/pricing/spec";
import { glyphFor, splitLabel, type SizeTile } from "../lib/calculator/sizeGlyph";

export function useCalculator(props: {
  product: ProductPricing;
  pricing: PricingData;
}) {
  const product = props.product;
  const pricing = props.pricing;

  // — Форма и размер —
  // Метка режима произвольного контура зависит от продукта: у плоттерных наклеек
  // это «Сложная форма» (в поле «Резка» уже есть свой режим die-cut «Вырубка»),
  // у листовых/прочих — профессиональнее звучит «Вырубка» (высечка по контуру).
  const complexLabel = product.production === "plotter" ? "Сложная форма" : "Вырубка";
  const complexLabelShort = product.production === "plotter" ? "Сложная" : "Вырубка";
  const shapes = computed(() => {
    const list = [{ value: "rectangular", label: "Прямоугольная" }];
    if (product.allowRound) list.push({ value: "round", label: "Круглая" });
    if (product.allowComplex) list.push({ value: "complex", label: complexLabel });
    return list;
  });
  const shape = ref<"rectangular" | "round" | "complex">("rectangular");
  // нет пресетов + разрешён свой размер → сразу режим ввода (с дефолтом)
  const hasPresets = product.sizes.length > 0;
  const sizeIndex = ref(hasPresets ? 0 : -1);
  const customMode = ref(!hasPresets && product.allowCustom);
  const customW = ref(90);
  const customH = ref(50);
  const diameter = ref(40);

  function onSizeChange() {
    if (sizeIndex.value === -1) customMode.value = true;
  }
  function backToList() {
    customMode.value = false;
    sizeIndex.value = 0;
  }

  // — Плитки-иконки выбора размера/формы (единый ряд) —
  // Круг и сложная форма сводятся в тот же ряд: пресеты ⌀ дают форму+размер,
  // а флаги allow_round/allow_complex добавляют отдельные плитки-режимы.
  const hasRoundPreset = product.sizes.some((s) => s.shape === "round");
  const sizeTiles = computed<SizeTile[]>(() => {
    const tiles: SizeTile[] = product.sizes.map((s, i) => {
      const { top, sub } = splitLabel(s.label, s.width, s.height, s.shape);
      return { id: `p${i}`, glyph: glyphFor(s.shape, s.width, s.height), label: top, sub };
    });
    // У плиток-режимов в нижней строке показываем заданный размер, когда плитка
    // активна (поповер можно закрыть — размер всё равно виден).
    const wh = `${customW.value}×${customH.value}`;
    // «Круглая» отдельной плиткой — только если у продукта нет готовых ⌀-пресетов
    if (product.allowRound && !hasRoundPreset)
      tiles.push({
        id: "round", glyph: "round", label: "Круглая",
        sub: shape.value === "round" ? `⌀${diameter.value}` : undefined,
      });
    if (product.allowComplex)
      tiles.push({
        id: "complex", glyph: "complex", label: complexLabelShort,
        sub: shape.value === "complex" ? wh : undefined,
      });
    if (product.allowCustom)
      tiles.push({
        id: "custom", glyph: "custom", label: "Свой",
        sub: customMode.value && shape.value !== "complex" ? wh : undefined,
      });
    return tiles;
  });
  // Какая плитка активна (для подсветки) — выводится из состояния, не хранится.
  const activeTileId = computed(() => {
    if (shape.value === "complex") return "complex";
    if (customMode.value) return "custom";
    if (shape.value === "round" && !hasRoundPreset) return "round";
    return `p${sizeIndex.value}`;
  });
  // Что показывает поповер активной плитки: ввод Ш×В, ⌀ или ничего.
  const sizeInput = computed<"rect" | "round" | null>(() => {
    if (shape.value === "complex") return "rect"; // габарит реза
    if (customMode.value) return "rect";
    if (shape.value === "round" && !hasRoundPreset) return "round";
    return null;
  });
  function selectTile(id: string) {
    if (id === "custom") {
      shape.value = "rectangular";
      customMode.value = true;
      sizeIndex.value = -1;
      return;
    }
    if (id === "complex") {
      shape.value = "complex";
      customMode.value = true; // размер = габарит реза (свой)
      sizeIndex.value = -1;
      return;
    }
    if (id === "round") {
      shape.value = "round"; // круглая без пресета → ввод ⌀
      customMode.value = false;
      return;
    }
    const i = Number(id.slice(1));
    const s = product.sizes[i];
    if (!s) return;
    customMode.value = false;
    sizeIndex.value = i;
    shape.value = s.shape === "round" ? "round" : "rectangular";
    if (s.shape === "round") diameter.value = s.width;
  }

  const dims = computed(() => {
    if (shape.value === "round") return { w: diameter.value, h: diameter.value };
    if (customMode.value) return { w: customW.value, h: customH.value };
    const s = product.sizes[sizeIndex.value];
    return { w: s?.width ?? 0, h: s?.height ?? 0 };
  });

  // — Стороны / контурная резка (наклейки) / фальцовка (буклеты) —
  const singleSided = product.singleSided; // печать только 4+0
  const doubleSided = product.doubleSided; // печать всегда 4+4 (буклеты)
  const allowContourCut = product.allowContourCut;
  // Резка наклеек: на листе / надсечка / вырубка. По умолчанию — надсечка (kiss):
  // самый ходовой вариант, наценки нет. Наценку (+50%) даёт только вырубка (die).
  const cutType = ref<CutType>("kiss");
  const cutTypes = computed(() => {
    const img = pricing.cutImages;
    return [
      { id: "none" as CutType, label: "На листе", sub: "без реза", thumb: img?.none?.thumb ?? undefined, full: img?.none?.full ?? undefined },
      { id: "kiss" as CutType, label: "С надсечкой", sub: "легко отделить", thumb: img?.kiss?.thumb ?? undefined, full: img?.kiss?.full ?? undefined },
      { id: "die" as CutType, label: "Вырубка", sub: "+50%", thumb: img?.die?.thumb ?? undefined, full: img?.die?.full ?? undefined },
    ];
  });

  // Фальцовка: тип → число сгибов; цена через per_fold-отделку (биговка).
  const foldTypes = product.foldTypes;
  const foldFinishing = product.finishing.find((o) => o.unit === "per_fold") ?? null;
  const foldTypeIndex = ref(0);
  const selectedFold = computed(() => foldTypes[foldTypeIndex.value]);

  // — Тираж и виды —
  const sides = ref<Sides>(doubleSided ? "4+4" : "4+0");
  const presets = [50, 100, 250, 500, 1000, 2000];
  const quantity = ref(100);
  const views = ref(1);
  const totalQty = computed(() => quantity.value * views.value);
  const selectQty = (q: number) => {
    quantity.value = q;
  };
  const incViews = () => {
    views.value += 1;
  };
  const decViews = () => {
    if (views.value > 1) views.value -= 1;
  };

  // — Материал и цвет —
  const paperIndex = ref(0);

  // Загруженный макет (id файла в Directus) — заполняет ArtworkUpload.
  const artworkMode = ref<import("./calcShared").ArtworkMode>("have");
  const artworkId = ref<string | null>(null);
  const artworkName = ref<string | null>(null);
  const artworkPreflight = ref<import("../lib/preflight").Preflight | null>(null);
  const paperGroups = computed(() => {
    const groups: { group: string; options: { index: number; name: string; thumb: PaperOption["thumb"]; full: PaperOption["full"] }[] }[] = [];
    product.papers.forEach((p, index) => {
      let g = groups.find((x) => x.group === p.group);
      if (!g) {
        g = { group: p.group, options: [] };
        groups.push(g);
      }
      g.options.push({ index, name: p.name, thumb: p.thumb, full: p.full });
    });
    return groups;
  });
  const currentPaper = computed(() => product.papers[paperIndex.value]);
  // спецматериал с фикс-ценой (плёнка/пластик): резка/печать уже включены
  const currentPaperFixed = computed(() => !!currentPaper.value?.fixedPrice?.length);
  const colors = computed(() => currentPaper.value?.colors ?? []);
  const selectedColorIndex = ref(0);
  watch(paperIndex, () => {
    selectedColorIndex.value = 0;
  });

  const sizeWarning = ref("");

  const sizingSheet = computed<Sheet>(() => {
    if (product.strategy === "fixed") return product.fixedSheet;
    if (currentPaper.value?.fixedPrice?.length && currentPaper.value.fixedSheet) {
      return currentPaper.value.fixedSheet;
    }
    const plotter = product.production === "plotter" || shape.value !== "rectangular";
    return plotter ? pricing.plotterSheet : pricing.pressSheet;
  });
  const sizingBleed = computed(() =>
    product.strategy === "fixed" || currentPaperFixed.value ? 0 : pricing.bleed,
  );
  const printableBox = computed(() => {
    const sheet = sizingSheet.value;
    const bleed = sizingBleed.value;
    return {
      width: Math.max(1, sheet.width - 2 * sheet.margin - 2 * bleed),
      height: Math.max(1, sheet.height - 2 * sheet.margin - 2 * bleed),
    };
  });

  // Клемп размера в печатный лист по каждой стороне (учёт поворота): меньшая
  // сторона ≤ короткой стороне листа, бо́льшая ≤ длинной. Сохраняем максимум.
  function fitInsideSheet(w: number, h: number) {
    const box = printableBox.value;
    const maxLong = Math.floor(Math.max(box.width, box.height));
    const maxShort = Math.floor(Math.min(box.width, box.height));
    let nw = Math.min(w, maxLong);
    let nh = Math.min(h, maxLong);
    // меньшая сторона не должна превышать короткую сторону листа
    if (Math.min(nw, nh) > maxShort) {
      if (nw <= nh) nw = maxShort;
      else nh = maxShort;
    }
    return { width: Math.max(1, nw), height: Math.max(1, nh), changed: nw !== w || nh !== h };
  }

  // selfChange переживает асинхронный повторный запуск watch после нашего клемпа,
  // иначе сообщение «мигает» и сбрасывается.
  let selfChange = false;
  function clampUserSize() {
    if (selfChange) {
      selfChange = false;
      return;
    }
    sizeWarning.value = "";
    if (shape.value === "round") {
      if (!Number.isFinite(diameter.value) || diameter.value < 1) return;
      const maxD = Math.floor(Math.min(printableBox.value.width, printableBox.value.height));
      if (diameter.value > maxD) {
        selfChange = true;
        diameter.value = maxD;
        sizeWarning.value = `Максимальный диаметр для листа — ⌀${maxD} мм.`;
      }
      return;
    }
    if (!customMode.value) return;
    if (!Number.isFinite(customW.value) || !Number.isFinite(customH.value) || customW.value < 1 || customH.value < 1) return;
    const fitted = fitInsideSheet(customW.value, customH.value);
    if (fitted.changed) {
      selfChange = true;
      customW.value = fitted.width;
      customH.value = fitted.height;
      const box = printableBox.value;
      const maxLong = Math.floor(Math.max(box.width, box.height));
      const maxShort = Math.floor(Math.min(box.width, box.height));
      sizeWarning.value = `Максимальный размер изделия для листа — ${maxLong}×${maxShort} мм.`;
    }
  }
  watch(
    () => [
      shape.value,
      customMode.value,
      customW.value,
      customH.value,
      diameter.value,
      paperIndex.value,
      currentPaperFixed.value,
      printableBox.value.width,
      printableBox.value.height,
    ],
    clampUserSize,
    { immediate: true },
  );

  // — Постпечать: ламинация / фольга / прочее —
  const laminationOptions = computed(() =>
    product.finishing.filter((o) => o.group === "Ламинация"),
  );
  const foilOption = computed(
    () => product.finishing.find((o) => o.group === "Фольгирование") ?? null,
  );
  const otherOptions = computed(() =>
    product.finishing
      .map((o, i) => ({ o, i }))
      .filter((x) => !x.o.group)
      .filter((x) => !(shape.value === "round" && x.o.unit === "per_corner"))
      // фальцовку (per_fold) ведёт отдельное поле, не показываем в «доп. обработке»
      .filter((x) => !(foldTypes.length && foldFinishing && x.o.id === foldFinishing.id)),
  );

  const laminationIndex = ref(-1);
  const foilOn = ref(false);
  const foilColorIndex = ref(0);

  // Зависимости покрытия — из rules.ts (данные + применители, не хардкод в .vue).
  const laminationLocked = computed(() => isLaminationLocked(foilOn.value));
  watch(foilOn, (on) => {
    const idx = forcedLaminationIndex(
      on,
      laminationOptions.value.map((o) => o.name),
    );
    if (idx >= 0) laminationIndex.value = idx;
  });

  // Доп. обработка: выбрана ли + count (для per_fold/per_hole)
  const defaultCount: Record<string, number> = {
    per_corner: 4, per_fold: 1, per_hole: 1, per_item: 1, per_sheet: 1,
  };
  const fin = reactive(
    product.finishing.map((o) => ({ checked: false, count: defaultCount[o.unit] ?? 1 })),
  );
  const needsCount = (unit: string) => unit === "per_fold" || unit === "per_hole";
  const countLabel: Record<string, string> = {
    per_fold: "сгибов", per_hole: "отверстий",
  };

  // — Сборка конфига и расчёт —
  // Переопределения для ячеек таблицы цен: считаем как текущее состояние,
  // но с другим тиражом/бумагой/размером/сторонами (без мутации стейта).
  type CellOverride = {
    quantity?: number;
    paperIndex?: number;
    sizeIndex?: number;
    sides?: Sides;
  };
  function buildConfig(total: number, ov?: CellOverride): AnyConfig | null {
    // размер: из пресета (override) или текущий
    let w = dims.value.w;
    let h = dims.value.h;
    if (ov?.sizeIndex != null) {
      const s = product.sizes[ov.sizeIndex];
      if (s) {
        w = s.width;
        h = s.height;
      }
    }
    // Фикс-цена за лист: размер изделия + тираж → листы → ставка по числу листов
    if (product.strategy === "fixed") {
      if (w < 1 || h < 1 || !product.fixedPrice.length) return null;
      return {
        strategy: "fixed",
        width: w,
        height: h,
        quantity: total,
        sheet: product.fixedSheet,
        priceBrackets: product.fixedPrice,
        urgent: false,
      };
    }
    const paper = product.papers[ov?.paperIndex ?? paperIndex.value];
    if (!paper || w < 1 || h < 1) return null;
    const finishing: OrderConfig["finishing"] = [];
    const lam = laminationOptions.value[laminationIndex.value];
    if (laminationIndex.value >= 0 && lam) finishing.push({ option: lam });
    if (foilOn.value && foilOption.value) finishing.push({ option: foilOption.value });
    for (const { o, i } of otherOptions.value) {
      if (fin[i].checked) finishing.push({ option: o, count: fin[i].count });
    }
    // фальцовка буклета: выбранный тип → per_fold по числу сгибов.
    // folds === 0 («Без сложения» → листовка/флаер) — биговку не добавляем.
    if (foldTypes.length && foldFinishing && selectedFold.value && selectedFold.value.folds > 0) {
      finishing.push({ option: foldFinishing, count: selectedFold.value.folds });
    }
    return {
      production: product.production,
      form: shape.value,
      width: w,
      height: h,
      sides: ov?.sides ?? sides.value,
      quantity: total,
      paper,
      urgent: false,
      cutType: allowContourCut ? cutType.value : undefined,
      finishing,
    };
  }

  // Цена за штуку для пресета тиража (на вид) с учётом числа видов.
  function perUnit(perView: number): number | null {
    const total = perView * views.value;
    if (total < 1) return null;
    const cfg = buildConfig(total);
    if (!cfg) return null;
    return computePrice(cfg, pricing).total / total;
  }

  // Цена ячейки таблицы: тираж × (бумага|размер|стороны); прочие параметры — текущие.
  function priceForCell(ov: CellOverride): number | null {
    const total = ov.quantity ?? totalQty.value;
    if (total < 1) return null;
    const cfg = buildConfig(total, ov);
    return cfg ? computePrice(cfg, pricing).total : null;
  }

  const result = computed(() => {
    if (totalQty.value < 1) return null;
    const cfg = buildConfig(totalQty.value);
    return cfg ? computePrice(cfg, pricing) : null;
  });

  // Превью регистрирует функцию снятия миниатюры; OrderPlate её зовёт при добавлении.
  let thumbFn: (() => string | null) | null = null;
  const setThumbProvider = (fn: () => string | null) => { thumbFn = fn; };
  const captureThumb = () => (thumbFn ? thumbFn() : null);

  // Текущая спецификация заказа (для добавления в корзину).
  const currentConfig = () => buildConfig(totalQty.value);

  // Параметры позиции таблицей (имена) — для корзины/плашки (контракт SharedCalc).
  function details(): { label: string; value: string }[] {
    const sizeStr = shape.value === "round" ? `⌀${dims.value.w} мм` : `${dims.value.w}×${dims.value.h} мм`;
    if (product.strategy === "fixed") {
      return [
        { label: "Размер", value: sizeStr },
        { label: "Тираж", value: `${totalQty.value} шт` },
      ];
    }
    const d: { label: string; value: string }[] = [];
    d.push({ label: "Размер", value: sizeStr });
    if (!singleSided) d.push({ label: "Печать", value: sides.value });
    if (foldTypes.length && selectedFold.value) d.push({ label: "Фальцовка", value: selectedFold.value.name });
    if (allowContourCut) {
      const v = cutType.value === "die" ? "вырубка" : cutType.value === "kiss" ? "надсечка" : "на листе";
      d.push({ label: "Резка", value: v });
    }
    const paper = currentPaper.value?.name;
    const col = colors.value[selectedColorIndex.value]?.name;
    if (paper) d.push({ label: "Материал", value: col ? `${paper} (${col})` : paper });
    if (laminationIndex.value >= 0) {
      const lam = laminationOptions.value[laminationIndex.value]?.name;
      if (lam) d.push({ label: "Ламинация", value: lam });
    }
    if (foilOn.value && foilOption.value) {
      const fc = foilOption.value.colors[foilColorIndex.value]?.name;
      d.push({ label: "Фольга", value: fc ?? "да" });
    }
    const others = otherOptions.value.filter((x) => fin[x.i].checked).map((x) => x.o.name);
    if (others.length) d.push({ label: "Обработка", value: others.join(", ") });
    d.push({ label: "Тираж", value: `${totalQty.value} шт` });
    if (artworkMode.value === "design") d.push({ label: "Макет", value: "нужен дизайн" });
    return d;
  }

  // Спек по id (productSlug добавляет вызывающий — он его знает).
  const currentSpec = (): SpecInput => {
    if (product.strategy === "fixed") {
      return {
        kind: "fixed", form: shape.value, width: dims.value.w, height: dims.value.h,
        quantity: totalQty.value,
        needsDesign: artworkMode.value === "design" || undefined,
      };
    }
    return {
    kind: "sheet",
    form: shape.value,
    width: dims.value.w,
    height: dims.value.h,
    sides: sides.value,
    quantity: totalQty.value,
    paperId: currentPaper.value?.id ?? 0,
    paperColorId: colors.value[selectedColorIndex.value]?.id ?? null,
    cutType: allowContourCut ? cutType.value : undefined,
    laminationId:
      laminationIndex.value >= 0
        ? laminationOptions.value[laminationIndex.value]?.id ?? null
        : null,
    foil:
      foilOn.value && foilOption.value
        ? {
            id: foilOption.value.id,
            colorId: foilOption.value.colors[foilColorIndex.value]?.id ?? null,
          }
        : null,
    finishing: [
      ...otherOptions.value
        .filter((x) => fin[x.i].checked)
        .map((x) => ({ id: x.o.id, count: fin[x.i].count })),
      ...(foldTypes.length && foldFinishing && selectedFold.value && selectedFold.value.folds > 0
        ? [{ id: foldFinishing.id, count: selectedFold.value.folds }]
        : []),
    ],
    needsDesign: artworkMode.value === "design" || undefined,
    };
  };

  const money = (n: number) =>
    n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

  // reactive(): вложенные ref/computed разворачиваются — поля пишут calc.shape напрямую.
  return reactive({
    product, pricing,
    // форма/размер
    shapes, shape, sizeIndex, customMode, customW, customH, diameter, dims, sizeWarning,
    onSizeChange, backToList,
    // плитки-иконки выбора размера/формы
    sizeTiles, activeTileId, sizeInput, selectTile,
    // стороны / резка наклеек (на листе/надсечка/вырубка) / фальцовка
    singleSided, doubleSided, allowContourCut, cutType, cutTypes,
    foldTypes, foldTypeIndex, selectedFold,
    // тираж
    sides, presets, quantity, views, totalQty, selectQty, incViews, decViews,
    // материал
    paperIndex, paperGroups, currentPaper, currentPaperFixed, colors, selectedColorIndex,
    // макет
    artworkMode, artworkId, artworkName, artworkPreflight,
    // постпечать
    laminationOptions, foilOption, otherOptions,
    laminationIndex, foilOn, foilColorIndex, laminationLocked,
    fin, needsCount, countLabel,
    // расчёт
    perUnit, priceForCell, result, money, currentConfig, currentSpec, details,
    // миниатюра превью
    setThumbProvider, captureThumb,
  });
}

export type CalculatorState = ReturnType<typeof useCalculator>;
export const calcKey: InjectionKey<CalculatorState> = Symbol("calc");
