// Вся реактивная логика калькулятора в одном месте.
// Компонент Calculator.vue создаёт это состояние и раздаёт полям через provide/inject,
// поэтому поля остаются «тупыми» (только отображение), без проброса десятков пропсов.
import { reactive, ref, computed, watch, type InjectionKey } from "vue";
import { computePrice, type OrderConfig, type Sides } from "../lib/pricing/engine";
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import { isLaminationLocked, forcedLaminationIndex } from "../lib/pricing/rules";

export function useCalculator(props: {
  product: ProductPricing;
  pricing: PricingData;
}) {
  const product = props.product;
  const pricing = props.pricing;

  // — Форма и размер —
  const shapes = computed(() => {
    const list = [{ value: "rectangular", label: "Прямоугольная" }];
    if (product.allowRound) list.push({ value: "round", label: "Круглая" });
    if (product.allowComplex) list.push({ value: "complex", label: "Сложная форма" });
    return list;
  });
  const shape = ref<"rectangular" | "round" | "complex">("rectangular");
  const sizeIndex = ref(0);
  const customMode = ref(false);
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

  const dims = computed(() => {
    if (shape.value === "round") return { w: diameter.value, h: diameter.value };
    if (customMode.value) return { w: customW.value, h: customH.value };
    const s = product.sizes[sizeIndex.value];
    return { w: s?.width ?? 0, h: s?.height ?? 0 };
  });

  // — Тираж и виды —
  const sides = ref<Sides>("4+0");
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
  const paperGroups = computed(() => {
    const groups: { group: string; options: { index: number; name: string }[] }[] = [];
    product.papers.forEach((p, index) => {
      let g = groups.find((x) => x.group === p.group);
      if (!g) {
        g = { group: p.group, options: [] };
        groups.push(g);
      }
      g.options.push({ index, name: p.name });
    });
    return groups;
  });
  const currentPaper = computed(() => product.papers[paperIndex.value]);
  const colors = computed(() => currentPaper.value?.colors ?? []);
  const selectedColorIndex = ref(0);
  watch(paperIndex, () => {
    selectedColorIndex.value = 0;
  });

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
      .filter((x) => !(shape.value === "round" && x.o.unit === "per_corner")),
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
  function buildConfig(total: number): OrderConfig | null {
    const paper = product.papers[paperIndex.value];
    if (!paper || dims.value.w < 1 || dims.value.h < 1) return null;
    const finishing: OrderConfig["finishing"] = [];
    const lam = laminationOptions.value[laminationIndex.value];
    if (laminationIndex.value >= 0 && lam) finishing.push({ option: lam });
    if (foilOn.value && foilOption.value) finishing.push({ option: foilOption.value });
    for (const { o, i } of otherOptions.value) {
      if (fin[i].checked) finishing.push({ option: o, count: fin[i].count });
    }
    return {
      production: product.production,
      form: shape.value,
      width: dims.value.w,
      height: dims.value.h,
      sides: sides.value,
      quantity: total,
      paper,
      urgent: false,
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

  const result = computed(() => {
    if (totalQty.value < 1) return null;
    const cfg = buildConfig(totalQty.value);
    return cfg ? computePrice(cfg, pricing) : null;
  });

  const money = (n: number) =>
    n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

  // reactive(): вложенные ref/computed разворачиваются — поля пишут calc.shape напрямую.
  return reactive({
    product, pricing,
    // форма/размер
    shapes, shape, sizeIndex, customMode, customW, customH, diameter, dims,
    onSizeChange, backToList,
    // тираж
    sides, presets, quantity, views, totalQty, selectQty, incViews, decViews,
    // материал
    paperIndex, paperGroups, currentPaper, colors, selectedColorIndex,
    // постпечать
    laminationOptions, foilOption, otherOptions,
    laminationIndex, foilOn, foilColorIndex, laminationLocked,
    fin, needsCount, countLabel,
    // расчёт
    perUnit, result, money,
  });
}

export type CalculatorState = ReturnType<typeof useCalculator>;
export const calcKey: InjectionKey<CalculatorState> = Symbol("calc");
