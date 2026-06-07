import { directusFetch, assetUrl } from "../directus";
import { computePrice } from "./engine";
import type {
  PricingData,
  Finishing,
  Tier,
  Sides,
  OrderConfig,
  MultipageConfig,
  Binding,
} from "./engine";

const num = (v: unknown): number => Number(v ?? 0);

export type Strategy = "sheet" | "multipage" | "area" | "perpiece";

export type SizePreset = {
  label: string;
  width: number;
  height: number;
  shape: "rectangular" | "round";
  pagesPerSheet?: number; // импозиция (только multipage)
};

export type BindingOption = Binding & { id: number };

export type FoldType = { name: string; folds: number; kind: string }; // тип фальцовки; kind: book|accordion|roll

export type PaperColor = {
  id: number;
  name: string;
  code: string;
  hex: string | null;
  image: string | null; // URL картинки-свотча или null
};

// Материал для UI: цена для движка (name+price) + презентация (group/description/colors).
export type PaperOption = {
  id: number;
  name: string;
  price: number;
  group: string;
  description: string | null;
  colors: PaperColor[];
};

// Постпечать для UI: данные движка + презентация (group + цвета фольги).
export type FinishingOption = Finishing & {
  id: number;
  group: string | null;
  colors: PaperColor[];
};

export type ProductPricing = {
  strategy: Strategy; // листовая / многостраничная / площадь / поштучно
  production: "sheet" | "plotter";
  previewKind: string | null; // какой макет превью рисовать (null → "card")
  allowRound: boolean;
  allowComplex: boolean;
  allowCustom: boolean;
  singleSided: boolean; // печать только 4+0 (наклейки)
  doubleSided: boolean; // печать всегда 4+4 (буклеты)
  allowContourCut: boolean; // предлагать контурную резку (наклейки)
  foldTypes: FoldType[]; // варианты фальцовки (буклеты); фальцовка считается per_fold
  sizes: SizePreset[]; // для multipage это форматы (с pagesPerSheet)
  papers: PaperOption[];
  finishing: FinishingOption[];
  // только multipage:
  coverPapers: PaperOption[];
  innerPapers: PaperOption[];
  bindings: BindingOption[];
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
    brochureSheet: {
      width: num(s.brochure_sheet_width) || 438,
      height: num(s.brochure_sheet_height) || 309,
      margin: num(s.brochure_sheet_margin) || 6,
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

// Тираж для цены «от» на витрине (совпадает с дефолтом калькулятора).
export const HOME_BASE_QTY = 100;

// Цена дефолтной конфигурации продукта (для плиток главной «от X ₽»).
// Тот же движок, что в калькуляторе/заказе — единый источник истины (П2).
export function defaultPrice(p: ProductPricing, pricing: PricingData): number | null {
  if (p.strategy === "multipage") return defaultMultipagePrice(p, pricing);

  const paper = p.papers[0];
  const size = p.sizes[0];
  if (!paper || !size) return null;
  const cfg: OrderConfig = {
    production: p.production,
    form: "rectangular",
    width: size.width,
    height: size.height,
    sides: "4+0",
    quantity: HOME_BASE_QTY,
    paper,
    urgent: false,
    finishing: [],
  };
  return computePrice(cfg, pricing).total;
}

function defaultMultipagePrice(p: ProductPricing, pricing: PricingData): number | null {
  const fmt = p.sizes[0];
  const inner = p.innerPapers[0];
  const cover = p.coverPapers[0];
  const bind = p.bindings[0];
  if (!fmt || !inner || !cover || !bind) return null;
  const cfg: MultipageConfig = {
    strategy: "multipage",
    width: fmt.width,
    height: fmt.height,
    pages: Math.max(4, Math.ceil(bind.minPages / 4) * 4),
    innerSides: "4+4",
    coverSides: "4+0",
    innerPaper: inner,
    coverPaper: cover,
    binding: bind,
    quantity: HOME_BASE_QTY,
    urgent: false,
    finishing: [],
  };
  return computePrice(cfg, pricing).total;
}

// Ценовой конфиг продукта (размеры, бумаги, постпечать) → типы движка.
export async function getProductPricing(
  slug: string,
): Promise<ProductPricing | null> {
  // поля бумаги (переиспользуем для papers / cover_papers / inner_papers)
  const paperFields = (rel: string) => [
    `${rel}.papers_id.id`,
    `${rel}.papers_id.name`,
    `${rel}.papers_id.price`,
    `${rel}.papers_id.group`,
    `${rel}.papers_id.description`,
    `${rel}.papers_id.colors.name`,
    `${rel}.papers_id.colors.code`,
    `${rel}.papers_id.colors.hex`,
    `${rel}.papers_id.colors.image`,
    `${rel}.papers_id.colors.sort`,
    `${rel}.papers_id.colors.id`,
  ];

  const fields = [
    "strategy",
    "production",
    "preview_kind",
    "single_sided",
    "double_sided",
    "allow_contour_cut",
    "fold_types",
    "allow_round",
    "allow_complex",
    "allow_custom",
    "sizes.label",
    "sizes.width",
    "sizes.height",
    "sizes.shape",
    "sizes.pages_per_sheet",
    ...paperFields("papers"),
    ...paperFields("cover_papers"),
    ...paperFields("inner_papers"),
    "bindings.bindings_id.id",
    "bindings.bindings_id.name",
    "bindings.bindings_id.price",
    "bindings.bindings_id.min_pages",
    "bindings.bindings_id.max_pages",
    "finishing.finishing_id.id",
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
    "finishing.finishing_id.colors.id",
  ].join(",");

  const res = await directusFetch<{ data: any[] }>(
    `/items/products?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=${fields}&limit=1`,
  );
  const p = res.data?.[0];
  if (!p) return null;

  // junction-строка бумаги (x.papers_id) → PaperOption
  const mapPaper = (x: any): PaperOption => {
    const pp = x.papers_id;
    return {
      id: num(pp.id),
      name: pp.name,
      price: num(pp.price),
      group: pp.group ?? "Стандартные",
      description: pp.description ?? null,
      colors: (pp.colors ?? [])
        .slice()
        .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
        .map((c: any) => ({
          id: num(c.id),
          name: c.name,
          code: c.code,
          hex: c.hex ?? null,
          image: assetUrl(c.image),
        })),
    };
  };

  return {
    strategy: (p.strategy ?? "sheet") as Strategy,
    production: p.production ?? "sheet",
    previewKind: p.preview_kind ?? null,
    allowRound: !!p.allow_round,
    allowComplex: !!p.allow_complex,
    allowCustom: !!p.allow_custom,
    singleSided: !!p.single_sided,
    doubleSided: !!p.double_sided,
    allowContourCut: !!p.allow_contour_cut,
    foldTypes: (Array.isArray(p.fold_types) ? p.fold_types : []).map((f: any) => ({
      name: String(f.name ?? ""),
      folds: num(f.folds),
      kind: String(f.kind ?? "accordion"),
    })),
    sizes: (p.sizes ?? []).map((s: any) => ({
      label: s.label,
      width: num(s.width),
      height: num(s.height),
      shape: s.shape ?? "rectangular",
      pagesPerSheet: s.pages_per_sheet == null ? undefined : num(s.pages_per_sheet),
    })),
    papers: (p.papers ?? []).map(mapPaper),
    coverPapers: (p.cover_papers ?? []).map(mapPaper),
    innerPapers: (p.inner_papers ?? []).map(mapPaper),
    bindings: (p.bindings ?? []).map((x: any) => {
      const b = x.bindings_id;
      return {
        id: num(b.id),
        name: b.name,
        priceBrackets: (Array.isArray(b.price) ? b.price : [])
          .map((br: any) => ({ to: num(br.to), price: num(br.price) }))
          .sort((a: any, z: any) => a.to - z.to),
        minPages: num(b.min_pages),
        maxPages: num(b.max_pages),
      } as BindingOption;
    }),
    finishing: (p.finishing ?? []).map((x: any) => {
      const f = x.finishing_id;
      return {
        id: num(f.id),
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
            id: num(c.id),
            name: c.name,
            code: c.code,
            hex: c.hex ?? null,
            image: assetUrl(c.image),
          })),
      } as FinishingOption;
    }),
  };
}
