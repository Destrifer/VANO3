import { directusFetch, assetUrl } from "../directus";
import type { PricingData, Finishing, Tier, Sides } from "./engine";

const num = (v: unknown): number => Number(v ?? 0);

export type SizePreset = {
  label: string;
  width: number;
  height: number;
  shape: "rectangular" | "round";
};

export type PaperColor = {
  name: string;
  code: string;
  hex: string | null;
  image: string | null; // URL картинки-свотча или null
};

// Материал для UI: цена для движка (name+price) + презентация (group/description/colors).
export type PaperOption = {
  name: string;
  price: number;
  group: string;
  description: string | null;
  colors: PaperColor[];
};

// Постпечать для UI: данные движка + презентация (group + цвета фольги).
export type FinishingOption = Finishing & {
  group: string | null;
  colors: PaperColor[];
};

export type ProductPricing = {
  production: "sheet" | "plotter";
  previewKind: string | null; // какой макет превью рисовать (null → "card")
  allowRound: boolean;
  allowComplex: boolean;
  allowCustom: boolean;
  sizes: SizePreset[];
  papers: PaperOption[];
  finishing: FinishingOption[];
};

// Глобальные параметры + ступени печати → PricingData движка.
export async function getPricingData(): Promise<PricingData> {
  const s = (await directusFetch<{ data: any }>("/items/pricing_settings")).data;
  const rows = (
    await directusFetch<{ data: any[] }>(
      "/items/print_tiers?fields=sides,min_sheets,price&sort=min_sheets&limit=-1",
    )
  ).data;

  const printTiers: Record<Sides, Tier[]> = { "4+0": [], "4+4": [] };
  for (const t of rows) {
    const side = t.sides as Sides;
    if (printTiers[side]) {
      printTiers[side].push({ minSheets: num(t.min_sheets), price: num(t.price) });
    }
  }

  return {
    pressSheet: {
      width: num(s.press_sheet_width),
      height: num(s.press_sheet_height),
      margin: num(s.press_sheet_margin),
    },
    plotterSheet: {
      width: num(s.plotter_sheet_width),
      height: num(s.plotter_sheet_height),
      margin: num(s.plotter_sheet_margin),
    },
    bleed: num(s.default_bleed),
    urgencyMultiplier: num(s.urgency_multiplier) || 1,
    prepCost: num(s.prep_cost),
    minOrder: num(s.min_order),
    roundingStep: num(s.rounding_step) || 1,
    printTiers,
    plotterCutting: (Array.isArray(s.plotter_cutting) ? s.plotter_cutting : [])
      .map((b: any) => ({ to: num(b.to), price: num(b.price) }))
      .sort((a, b) => a.to - b.to),
    manualCuttingRate: num(s.manual_cutting_rate),
  };
}

// Ценовой конфиг продукта (размеры, бумаги, постпечать) → типы движка.
export async function getProductPricing(
  slug: string,
): Promise<ProductPricing | null> {
  const fields = [
    "production",
    // "preview_kind", // включить, когда поле появится в Directus (пока → "card")
    "allow_round",
    "allow_complex",
    "allow_custom",
    "sizes.label",
    "sizes.width",
    "sizes.height",
    "sizes.shape",
    "papers.papers_id.name",
    "papers.papers_id.price",
    "papers.papers_id.group",
    "papers.papers_id.description",
    "papers.papers_id.colors.name",
    "papers.papers_id.colors.code",
    "papers.papers_id.colors.hex",
    "papers.papers_id.colors.image",
    "papers.papers_id.colors.sort",
    "finishing.finishing_id.name",
    "finishing.finishing_id.group",
    "finishing.finishing_id.unit",
    "finishing.finishing_id.unit_price",
    "finishing.finishing_id.setup_price",
    "finishing.finishing_id.tiers.min_sheets",
    "finishing.finishing_id.tiers.price",
    "finishing.finishing_id.colors.name",
    "finishing.finishing_id.colors.code",
    "finishing.finishing_id.colors.hex",
    "finishing.finishing_id.colors.image",
    "finishing.finishing_id.colors.sort",
  ].join(",");

  const res = await directusFetch<{ data: any[] }>(
    `/items/products?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=${fields}&limit=1`,
  );
  const p = res.data?.[0];
  if (!p) return null;

  return {
    production: p.production ?? "sheet",
    previewKind: p.preview_kind ?? null,
    allowRound: !!p.allow_round,
    allowComplex: !!p.allow_complex,
    allowCustom: !!p.allow_custom,
    sizes: (p.sizes ?? []).map((s: any) => ({
      label: s.label,
      width: num(s.width),
      height: num(s.height),
      shape: s.shape ?? "rectangular",
    })),
    papers: (p.papers ?? []).map((x: any) => {
      const pp = x.papers_id;
      return {
        name: pp.name,
        price: num(pp.price),
        group: pp.group ?? "Стандартные",
        description: pp.description ?? null,
        colors: (pp.colors ?? [])
          .slice()
          .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
          .map((c: any) => ({
            name: c.name,
            code: c.code,
            hex: c.hex ?? null,
            image: assetUrl(c.image),
          })),
      };
    }) as PaperOption[],
    finishing: (p.finishing ?? []).map((x: any) => {
      const f = x.finishing_id;
      return {
        name: f.name,
        group: f.group ?? null,
        unit: f.unit,
        unitPrice: f.unit_price == null ? null : num(f.unit_price),
        setupPrice: num(f.setup_price),
        tiers: (f.tiers ?? []).map((t: any) => ({
          minSheets: num(t.min_sheets),
          price: num(t.price),
        })),
        colors: (f.colors ?? [])
          .slice()
          .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
          .map((c: any) => ({
            name: c.name,
            code: c.code,
            hex: c.hex ?? null,
            image: assetUrl(c.image),
          })),
      } as FinishingOption;
    }),
  };
}
