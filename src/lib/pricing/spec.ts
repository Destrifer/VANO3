// Спецификация заказа по идентификаторам (то, что хранит корзина).
// Сервер по этим id достаёт АКТУАЛЬНЫЕ цены из Directus и пересчитывает —
// клиентским ценам не доверяем. Чистые функции, без фреймворка.
import { computePrice } from "./engine";
import type { OrderConfig, PricingData, PriceResult, Sides } from "./engine";
import type { ProductPricing } from "./data";

export type FinishingPick = { id: number; count: number };

export type CartSpec = {
  productSlug: string;
  form: "rectangular" | "round" | "complex";
  width: number;
  height: number;
  sides: Sides;
  quantity: number;
  paperId: number;
  paperColorId: number | null; // на цену не влияет, но нужен для производства
  laminationId: number | null;
  foil: { id: number; colorId: number | null } | null;
  finishing: FinishingPick[]; // прочая постпечать
};

// Спек (id) + актуальные данные продукта → priced-конфиг движка.
export function buildConfigFromSpec(
  spec: CartSpec,
  product: ProductPricing,
): OrderConfig | null {
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
    finishing,
  };
}

// Человекочитаемое описание спека (по id → имена) для менеджера в админке.
export function describeSpec(spec: CartSpec, product: ProductPricing): string {
  const parts: string[] = [];
  parts.push(spec.form === "round" ? `⌀${spec.width} мм` : `${spec.width}×${spec.height} мм`);
  parts.push(spec.sides);

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

// Авторитетная цена по спеку (для серверного пересчёта при заказе).
export function priceFromSpec(
  spec: CartSpec,
  product: ProductPricing,
  pricing: PricingData,
): PriceResult | null {
  const cfg = buildConfigFromSpec(spec, product);
  return cfg ? computePrice(cfg, pricing) : null;
}
