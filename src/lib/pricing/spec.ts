// Спецификация заказа по идентификаторам (то, что хранит корзина).
// Сервер по этим id достаёт АКТУАЛЬНЫЕ цены из Directus и пересчитывает —
// клиентским ценам не доверяем. Чистые функции, без фреймворка.
import { computePrice } from "./engine";
import type { AnyConfig, OrderConfig, PricingData, PriceResult, Sides, CutType } from "./engine";
import type { ProductPricing } from "./data";

export type FinishingPick = { id: number; count: number };

// Листовая стратегия (визитки, листовки, …).
export type SheetSpec = {
  kind: "sheet";
  productSlug: string;
  form: "rectangular" | "round" | "complex";
  width: number;
  height: number;
  sides: Sides;
  quantity: number;
  paperId: number;
  paperColorId: number | null; // на цену не влияет, но нужен для производства
  cutType?: CutType; // резка наклеек: на листе / надсечка / вырубка
  contourCut?: boolean; // legacy: старые позиции корзины (true = вырубка)
  laminationId: number | null;
  foil: { id: number; colorId: number | null } | null;
  finishing: FinishingPick[];
};

// Многостраничная стратегия (брошюры, каталоги, …).
export type MultipageSpec = {
  kind: "multipage";
  productSlug: string;
  width: number; // формат (спуск считает сервер по печатному листу)
  height: number;
  pages: number; // полос блока (кратно 4)
  innerSides: Sides;
  coverSides: Sides;
  innerPaperId: number;
  coverPaperId: number;
  innerColorId: number | null;
  coverColorId: number | null;
  bindingId: number;
  quantity: number;
  // отделка обложки
  laminationId: number | null;
  foil: { id: number; colorId: number | null } | null;
  finishing: FinishingPick[]; // прочая отделка обложки
};

// Фикс-цена за лист (наклейки на спецплёнке/пластике).
export type FixedSpec = {
  kind: "fixed";
  productSlug: string;
  form: "rectangular" | "round" | "complex";
  width: number;
  height: number;
  quantity: number;
};

export type CartSpec = SheetSpec | MultipageSpec | FixedSpec;

// Спек без productSlug — то, что отдаёт калькулятор (slug добавит плашка).
export type SpecInput =
  | Omit<SheetSpec, "productSlug">
  | Omit<MultipageSpec, "productSlug">
  | Omit<FixedSpec, "productSlug">;

// Старые позиции корзины могли не иметь kind → считаем их листовыми.
function specKind(spec: CartSpec): "sheet" | "multipage" | "fixed" {
  if (spec.kind === "multipage") return "multipage";
  if (spec.kind === "fixed") return "fixed";
  return "sheet";
}

// Спек (id) + актуальные данные продукта → priced-конфиг движка.
export function buildConfigFromSpec(
  spec: CartSpec,
  product: ProductPricing,
): AnyConfig | null {
  const k = specKind(spec);
  if (k === "multipage") return buildMultipageConfig(spec as MultipageSpec, product);
  if (k === "fixed") return buildFixedConfig(spec as FixedSpec, product);
  return buildSheetConfig(spec as SheetSpec, product);
}

function buildFixedConfig(spec: FixedSpec, product: ProductPricing): AnyConfig | null {
  if (spec.width < 1 || spec.height < 1 || !product.fixedPrice.length) return null;
  return {
    strategy: "fixed",
    width: spec.width,
    height: spec.height,
    quantity: spec.quantity,
    sheet: product.fixedSheet,
    priceBrackets: product.fixedPrice,
    urgent: false,
  };
}

function buildSheetConfig(spec: SheetSpec, product: ProductPricing): AnyConfig | null {
  const paper = product.papers.find((p) => p.id === spec.paperId);
  if (!paper || spec.width < 1 || spec.height < 1) return null;

  const finishing: OrderConfig["finishing"] = [];
  if (spec.laminationId != null) {
    const lam = product.finishing.find((f) => f.id === spec.laminationId);
    if (lam) finishing.push({ option: lam });
  }
  if (spec.foil) {
    const foil = product.finishing.find((f) => f.id === spec.foil!.id);
    if (foil) finishing.push({ option: foil });
  }
  for (const pick of spec.finishing) {
    const opt = product.finishing.find((f) => f.id === pick.id);
    if (opt) finishing.push({ option: opt, count: pick.count });
  }

  return {
    production: product.production,
    form: spec.form,
    width: spec.width,
    height: spec.height,
    sides: spec.sides,
    quantity: spec.quantity,
    paper,
    urgent: false,
    // Новые позиции несут cutType; старые — только булев contourCut (true = вырубка).
    cutType: spec.cutType ?? (spec.contourCut ? "die" : "kiss"),
    finishing,
  };
}

function buildMultipageConfig(
  spec: MultipageSpec,
  product: ProductPricing,
): AnyConfig | null {
  const inner = product.innerPapers.find((p) => p.id === spec.innerPaperId);
  const cover = product.coverPapers.find((p) => p.id === spec.coverPaperId);
  const binding = product.bindings.find((b) => b.id === spec.bindingId);
  if (!inner || !cover || !binding || spec.pages < 1) return null;

  const finishing = [] as { option: any; count?: number }[];
  if (spec.laminationId != null) {
    const lam = product.finishing.find((f) => f.id === spec.laminationId);
    if (lam) finishing.push({ option: lam });
  }
  if (spec.foil) {
    const foil = product.finishing.find((f) => f.id === spec.foil!.id);
    if (foil) finishing.push({ option: foil });
  }
  for (const pick of spec.finishing) {
    const o = product.finishing.find((f) => f.id === pick.id);
    if (o) finishing.push({ option: o, count: pick.count });
  }

  return {
    strategy: "multipage",
    width: spec.width,
    height: spec.height,
    pages: spec.pages,
    innerSides: spec.innerSides,
    coverSides: spec.coverSides,
    innerPaper: inner,
    coverPaper: cover,
    binding,
    quantity: spec.quantity,
    urgent: false,
    finishing,
  };
}

// Человекочитаемое описание спека (по id → имена) для менеджера в админке.
export function describeSpec(spec: CartSpec, product: ProductPricing): string {
  const k = specKind(spec);
  if (k === "multipage") return describeMultipage(spec as MultipageSpec, product);
  if (k === "fixed") {
    const s = spec as FixedSpec;
    const sz = s.form === "round" ? `⌀${s.width} мм` : `${s.width}×${s.height} мм`;
    return `${sz} · ${s.quantity} шт`;
  }
  return describeSheet(spec as SheetSpec, product);
}

function describeSheet(spec: SheetSpec, product: ProductPricing): string {
  const parts: string[] = [];
  parts.push(spec.form === "round" ? `⌀${spec.width} мм` : `${spec.width}×${spec.height} мм`);
  parts.push(spec.sides);
  if (product.allowContourCut) {
    const ct = spec.cutType ?? (spec.contourCut ? "die" : "kiss");
    parts.push(ct === "die" ? "вырубка" : ct === "kiss" ? "надсечка" : "на листе");
  }

  const paper = product.papers.find((p) => p.id === spec.paperId);
  if (paper) {
    const col = paper.colors.find((c) => c.id === spec.paperColorId);
    parts.push(col ? `${paper.name} (${col.name})` : paper.name);
  }
  if (spec.laminationId != null) {
    const lam = product.finishing.find((f) => f.id === spec.laminationId);
    if (lam) parts.push(lam.name);
  }
  if (spec.foil) {
    const foil = product.finishing.find((f) => f.id === spec.foil!.id);
    const fc = foil?.colors.find((c) => c.id === spec.foil!.colorId);
    parts.push(foil ? (fc ? `${foil.name} (${fc.name})` : foil.name) : "Фольга");
  }
  for (const pick of spec.finishing) {
    const o = product.finishing.find((f) => f.id === pick.id);
    if (o) parts.push(pick.count > 1 ? `${o.name} ×${pick.count}` : o.name);
  }
  return parts.join(" · ");
}

function describeMultipage(spec: MultipageSpec, product: ProductPricing): string {
  const parts: string[] = [];
  parts.push(`${spec.width}×${spec.height} мм`);
  parts.push(`${spec.pages} стр.`);
  const binding = product.bindings.find((b) => b.id === spec.bindingId);
  if (binding) parts.push(binding.name);
  const cover = product.coverPapers.find((p) => p.id === spec.coverPaperId);
  if (cover) parts.push(`обложка ${cover.name}`);
  const inner = product.innerPapers.find((p) => p.id === spec.innerPaperId);
  if (inner) parts.push(`блок ${inner.name}`);
  if (spec.laminationId != null) {
    const lam = product.finishing.find((f) => f.id === spec.laminationId);
    if (lam) parts.push(lam.name);
  }
  if (spec.foil) {
    const foil = product.finishing.find((f) => f.id === spec.foil!.id);
    const fc = foil?.colors.find((c) => c.id === spec.foil!.colorId);
    parts.push(foil ? (fc ? `${foil.name} (${fc.name})` : foil.name) : "Фольга");
  }
  for (const pick of spec.finishing) {
    const o = product.finishing.find((f) => f.id === pick.id);
    if (o) parts.push(o.name);
  }
  return parts.join(" · ");
}

// Авторитетная цена по спеку (для серверного пересчёта при заказе).
export function priceFromSpec(
  spec: CartSpec,
  product: ProductPricing,
  pricing: PricingData,
): PriceResult | null {
  const cfg = buildConfigFromSpec(spec, product);
  return cfg ? computePrice(cfg, pricing) : null;
}
