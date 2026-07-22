import { directusFetch, assetUrl, responsiveAsset, responsiveAssetFluid, type ResponsiveImage } from "../directus";
import { resolvePaperIndex, type CalcPreset } from "../../composables/calcUrlState";

// Миниатюры плиток — 16:9 под единый OptionTile (с запасом под retina).
const TILE_THUMB_W = 240;
const TILE_THUMB_H = 135;
const PAPER_THUMB_W = TILE_THUMB_W; // материал
const PAPER_THUMB_H = TILE_THUMB_H;
const COLOR_SWATCH = 64; // свотч цвета (квадрат)
// Lightbox (цвета, материалы, ламинация): браузер выбирает по вьюпорту (моб. —
// меньше, ПК — до 4K), апскейла нет — крупнее оригинала Directus не отдаст
// (withoutEnlargement).
const FULL_WIDTHS = [768, 1280, 2048, 3840];
const FULL_SIZES = "(max-width: 767px) 100vw, 92vw";
const FIN_THUMB_W = TILE_THUMB_W; // ламинация
const FIN_THUMB_H = TILE_THUMB_H;
const FOLD_THUMB_W = TILE_THUMB_W; // фальцовка
const FOLD_THUMB_H = TILE_THUMB_H;

// Маппинг цвета (бумага/фольга) → UI: hex/URL + адаптивные свотч и lightbox.
function mapColor(c: any): PaperColor {
  return {
    id: num(c.id),
    name: c.name,
    code: c.code,
    hex: c.hex ?? null,
    image: assetUrl(c.image),
    thumb: responsiveAsset(c.image, COLOR_SWATCH, COLOR_SWATCH),
    tile: responsiveAsset(c.image, TILE_THUMB_W, TILE_THUMB_H),
    full: responsiveAssetFluid(c.image, FULL_WIDTHS, FULL_SIZES),
  };
}
import { computePrice, PAGE_STEP } from "./engine";
import type {
  PricingData,
  Finishing,
  Tier,
  Sides,
  OrderConfig,
  MultipageConfig,
  FixedConfig,
  Binding,
  CuttingBracket,
  Sheet,
} from "./engine";

const num = (v: unknown): number => Number(v ?? 0);

export type Strategy = "sheet" | "multipage" | "fixed" | "area" | "perpiece";

export type SizePreset = {
  label: string;
  width: number;
  height: number;
  shape: "rectangular" | "round";
  pagesPerSheet?: number; // импозиция (только multipage)
};

// full — крупное фото для ховер-превью/лайтбокса (как у фальцовки и материалов).
export type BindingOption = Binding & {
  id: number;
  image: string | null;
  thumb: ResponsiveImage;
  full: ResponsiveImage;
};

// Вариант разлиновки: имя + картинка плитки (может не быть — тогда глиф);
// full — крупное фото для ховер-превью/лайтбокса.
export type RulingOption = {
  name: string;
  image: string | null;
  thumb: ResponsiveImage;
  full: ResponsiveImage;
};

// тип фальцовки; kind: book|accordion|roll|crease; image/thumb — картинка плитки,
// full — крупное фото для ховер-превью/лайтбокса (как у бумаги и фольги)
export type FoldType = {
  name: string;
  folds: number;
  kind: string;
  image: string | null;
  thumb: ResponsiveImage;
  full: ResponsiveImage;
};

// Универсальная доп-обработка плитками (скругление, сверление, еврослот и т.п.):
// опция с group (кроме зарезервированных ламинации/фольги/разлиновки) и вариантами
// finishing_colors → плитки «Без …» + варианты с картинкой. `count` — число единиц
// (углов/отверстий) из `code` варианта: для per_corner/per_hole меняет цену, для
// per_item/per_sheet цену не трогает (в UNIT_QTY count не участвует).
export type FinishingVariant = {
  name: string;
  count: number;
  image: string | null;
  thumb: ResponsiveImage;
  full: ResponsiveImage;
};
export type FinishingVariantGroup = {
  id: number; // finishing_options.id — по нему берём опцию из product.finishing для цены
  heading: string; // finishing_options.group (заголовок блока)
  unit: string; // единица опции (для гейтов: per_corner скрываем у круглой формы)
  // Картинка «чистого» (без услуги) — из самой опции (finishing_options.image),
  // как «Без биговки»/«Чистый». Нет фото → плитка «Без …» покажет глиф.
  image: string | null;
  thumb: ResponsiveImage;
  full: ResponsiveImage;
  variants: FinishingVariant[];
};

export type PaperColor = {
  id: number;
  name: string;
  code: string;
  hex: string | null;
  image: string | null; // URL картинки-свотча или null
  thumb: ResponsiveImage; // адаптивный свотч (avif/webp, квадрат)
  tile: ResponsiveImage; // миниатюра 16:9 для OptionTile (цвета фольги)
  full: ResponsiveImage; // адаптивная картинка для lightbox (ресайз по ширине)
};

// Материал для UI: цена для движка (name+price) + презентация (group/description/colors).
export type PaperOption = {
  id: number;
  name: string;
  price: number;
  group: string;
  materialType: string; // тип материала (Directus papers.material_type) — для блока «Материалы»
  description: string | null;
  image: string | null;
  thumb: ResponsiveImage; // адаптивная миниатюра (avif/webp) для плитки материала
  full: ResponsiveImage; // адаптивная картинка для lightbox (ресайз по ширине)
  colors: PaperColor[];
  // спецматериал с фикс-ценой за лист (световозвращающая плёнка, пластик 3M)
  fixedPrice?: CuttingBracket[];
  fixedSheet?: Sheet;
};

// Постпечать для UI: данные движка + презентация (group + цвета фольги).
export type FinishingOption = Finishing & {
  id: number;
  group: string | null;
  image: string | null; // фото отделки (finishing_options.image)
  thumb: ResponsiveImage; // адаптивная миниатюра (avif/webp) для плитки ламинации
  full: ResponsiveImage; // адаптивная картинка для lightbox (ресайз по ширине)
  colors: PaperColor[];
};

export type ProductPricing = {
  strategy: Strategy; // листовая / многостраничная / площадь / поштучно
  production: "sheet" | "plotter";
  leadDays: number; // срок изготовления, рабочих дней (база) — для «срока готовности»
  previewKind: string | null; // какой макет превью рисовать (null → "card")
  allowRound: boolean;
  allowComplex: boolean;
  allowCustom: boolean;
  singleSided: boolean; // печать только 4+0 (наклейки)
  doubleSided: boolean; // печать всегда 4+4 (буклеты)
  allowContourCut: boolean; // предлагать контурную резку (наклейки)
  // Плитки тиража в калькуляторе. Задаются на продукте (Directus `qty_presets`):
  // у визиток осмысленный минимум — 50, у фотокниги/книги — 1 экземпляр. Это
  // ЯРЛЫКИ, а не ограничение: поле «Другой тираж» принимает любое число от 1, а
  // нижняя граница заказа — сумма корзины (settings.min_order_total), не тираж.
  qtyPresets: number[];
  // Разлиновка блока (только multipage): «Чистый / Линейка / Клетка / Точка».
  // Пусто → поля в калькуляторе нет. На цену НЕ влияет — это макет блока,
  // который мы и так печатаем; выбор (имя) едет в спек заказа для производства
  // (тот же приём, что `needsDesign`). Источники: свои строки продукта
  // (`ruling_options`) или универсальные варианты отделки «Разлиновка» с
  // картинками — см. сборку в getProductPricing().
  rulingOptions: RulingOption[];
  // Универсальные группы доп-обработки плитками (скругление/сверление/еврослот и
  // т.п.) — см. FinishingVariantGroup и сборку в getProductPricing().
  variantGroups: FinishingVariantGroup[];
  foldTypes: FoldType[]; // варианты фальцовки (буклеты); фальцовка считается per_fold
  sizes: SizePreset[]; // для multipage это форматы (с pagesPerSheet)
  papers: PaperOption[]; // только published
  // id материалов в исходном порядке Directus, включая скрытые. Нужен ровно для
  // одного: перевести устаревший preset.paperIndex в id, чтобы скрытие черновика
  // не сдвинуло пресеты кластерных страниц. Новые пресеты используют paperId.
  paperOrder: number[];
  finishing: FinishingOption[];
  // только multipage:
  coverPapers: PaperOption[];
  innerPapers: PaperOption[];
  bindings: BindingOption[];
  // только fixed (фикс-цена за лист):
  fixedPrice: CuttingBracket[]; // ₽/лист по числу листов
  fixedSheet: Sheet; // печатный лист продукта
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
      .sort((a: CuttingBracket, b: CuttingBracket) => a.to - b.to),
    manualCuttingRate: num(s.manual_cutting_rate),
    // Плитки реза наклеек — общие для всех наклеек (грузятся из pricing_settings).
    cutImages: {
      none: {
        thumb: responsiveAsset(s.cut_none_image, TILE_THUMB_W, TILE_THUMB_H),
        full: responsiveAssetFluid(s.cut_none_image, FULL_WIDTHS, FULL_SIZES),
      },
      kiss: {
        thumb: responsiveAsset(s.cut_kiss_image, TILE_THUMB_W, TILE_THUMB_H),
        full: responsiveAssetFluid(s.cut_kiss_image, FULL_WIDTHS, FULL_SIZES),
      },
      die: {
        thumb: responsiveAsset(s.cut_die_image, TILE_THUMB_W, TILE_THUMB_H),
        full: responsiveAssetFluid(s.cut_die_image, FULL_WIDTHS, FULL_SIZES),
      },
    },
  };
}

// Стартовый тираж калькулятора: открываемся на ходовой сотне, если она есть в
// пресетах продукта. К цене «от» отношения НЕ имеет — витрина считает minPrice()/
// presetPrice() по минимальному пресету (раньше здесь жил HOME_BASE_QTY, которым
// считали и «от» на главной/каталоге — т.е. показывали цену СОТНИ экземпляров).
export const CALC_DEFAULT_QTY = 100;

function fixedPrice(p: ProductPricing, pricing: PricingData, quantity: number): number | null {
  const size = p.sizes[0];
  if (!size || !p.fixedPrice.length) return null;
  const cfg: FixedConfig = {
    strategy: "fixed",
    width: size.width,
    height: size.height,
    quantity,
    sheet: p.fixedSheet,
    priceBrackets: p.fixedPrice,
    urgent: false,
  };
  return computePrice(cfg, pricing).total;
}

// Плитки тиража по умолчанию — если у продукта не заданы `qty_presets`.
// Совпадают с прежним хардкодом в калькуляторах, чтобы поведение не поехало
// у продуктов, которым пресеты ещё не проставили.
export const DEFAULT_QTY_PRESETS: Partial<Record<Strategy, number[]>> = {
  sheet: [50, 100, 250, 500, 1000, 2000],
  multipage: [50, 100, 250, 500, 1000],
  fixed: [50, 100, 250, 500, 1000],
};
const QTY_PRESETS_FALLBACK = [50, 100, 250, 500, 1000];

// Пресеты из Directus: массив чисел, тихо чистим мусор. Пусто/кривое → дефолт.
function qtyPresets(raw: unknown, strategy: Strategy): number[] {
  const list = (Array.isArray(raw) ? raw : [])
    .map((v) => Math.floor(Number(v)))
    .filter((v) => Number.isFinite(v) && v >= 1);
  const uniq = [...new Set(list)].sort((a, b) => a - b);
  return uniq.length ? uniq : (DEFAULT_QTY_PRESETS[strategy] ?? QTY_PRESETS_FALLBACK);
}

// Разлиновка из Directus: массив непустых строк, мусор тихо чистим. Дефолта нет
// — пусто значит «поле не показывать» (у брошюр/каталогов линовки не бывает).
function rulingOptions(raw: unknown): string[] {
  const list = (Array.isArray(raw) ? raw : [])
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
  return [...new Set(list)];
}

// Тираж витрины для цены «от» — минимальный пресет продукта: у визиток это 50,
// у фотокниги/книги — 1 экземпляр. Раньше здесь была общая константа 50, из-за
// чего «от» у multipage считалось вообще не так (см. ниже).
function showcaseQty(p: ProductPricing): number {
  return p.qtyPresets[0] ?? 1;
}

// Цена «от» = самый дешёвый реальный заказ: минимальный пресет × одна сторона ×
// самая дешёвая из доступных бумаг. Честный минимум для title/Offer (дефолт
// конфигуратора может быть дороже — это нормально, не враньё).
//
// Было (баг, найден на гэп-аудите фотокниг 2026-07-16): для multipage/fixed
// «от» возвращало defaultPrice() — дефолтную конфигурацию в HOME_BASE_QTY = 100
// экземпляров. Т.е. «от» показывало цену СОТНИ: `/photobooks/wedding` — «от
// 72 600 ₽», `/books/single-copy` — «Печать книги в 1 экземпляре — от 19 500 ₽»
// (сама себе противоречила). Теперь тираж един для всех стратегий и берётся из
// пресетов продукта. Движок считает 1 экз честно: tierRate/bracketRate дадут
// самую дорогую ступень, а не 1/100 от сотни.
export function minPrice(p: ProductPricing, pricing: PricingData): number | null {
  const qty = showcaseQty(p);
  if (p.strategy === "multipage") return minMultipagePrice(p, pricing, qty);
  if (p.strategy === "fixed") return fixedPrice(p, pricing, qty);
  const size = p.sizes[0];
  if (!size || !p.papers.length) return null;
  const sides: Sides = p.doubleSided ? "4+4" : "4+0";
  let min = Infinity;
  for (const paper of p.papers) {
    const cfg: OrderConfig = {
      production: p.production,
      form: "rectangular",
      width: size.width,
      height: size.height,
      sides,
      quantity: qty,
      paper,
      urgent: false,
      finishing: [],
    };
    const total = computePrice(cfg, pricing).total;
    if (total < min) min = total;
  }
  return Number.isFinite(min) ? min : null;
}

// Цена «от» с учётом пресета кластерной страницы (для плиток хаба).
// Зеркалит дефолт калькулятора при заданном пресете: бумага/форма/стороны/тираж
// + фольга. Совпадает с тем, что покажет конфигуратор на кластере при открытии.
//
// Было (баг, найден на гэп-аудите блокнотов 2026-07-17): для не-sheet стратегий
// ветка уходила в defaultPrice() — т.е. в HOME_BASE_QTY = 100 экз, ровно тот
// дефект, который на аудите фотокниг починили в minPrice(), но только для
// title/JSON-LD. Плитки хаба остались на старом пути, и хаб противоречил
// собственным кластерам: `/photobooks` плитка «свадебная — от 72 600 ₽», а
// сама `/photobooks/wedding` в title — «от 423 ₽». Задето было 34 плитки на 9
// multipage-хабах. Теперь не-sheet считается тем же честным минимумом, что и
// minPrice(), но суженным пресетом кластера — плитки и совпадают с целевой
// страницей, и отличаются друг от друга.
export function presetPrice(
  p: ProductPricing,
  pricing: PricingData,
  preset: CalcPreset | null | undefined,
): number | null {
  if (p.strategy === "multipage") return minMultipagePrice(p, pricing, showcaseQty(p), preset);
  if (p.strategy === "fixed") return fixedPrice(p, pricing, showcaseQty(p));
  if (!preset) return minPrice(p, pricing);
  const round = preset.shape === "round";
  const sizeIdx =
    preset.sizeIndex != null &&
    Number.isInteger(preset.sizeIndex) &&
    preset.sizeIndex >= 0 &&
    preset.sizeIndex < p.sizes.length
      ? preset.sizeIndex
      : 0;
  const size = p.sizes[sizeIdx];
  // Круглая форма: диаметр по умолчанию как в калькуляторе (40 мм), иначе размер[0].
  const ROUND_D = 40;
  const width = round ? ROUND_D : size?.width ?? 0;
  const height = round ? ROUND_D : size?.height ?? 0;
  // Материал недоступен (скрыт/удалён) → дефолтный, как и в конфигураторе.
  const paper = p.papers[resolvePaperIndex(p.papers, preset, p.paperOrder) ?? 0];
  if (!paper || width < 1 || height < 1) return null;
  const sides: Sides = preset.sides ?? (p.doubleSided ? "4+4" : "4+0");
  // Тираж: пресет, иначе минимальный пресет продукта — НЕ HOME_BASE_QTY.
  // Здесь была сотня, и «от» листового кластера считалось за 100 экз (тот же
  // дефект, что чинили у multipage на аудите фотокниг): `/stickers/transparent`
  // показывал «от 675 ₽» вместо честных 450 ₽ за минимальные 50 шт.
  const quantity =
    preset.quantity && preset.quantity > 0 ? preset.quantity : showcaseQty(p);
  const finishing: OrderConfig["finishing"] = [];
  if (preset.foil) {
    const foil = p.finishing.find((o) => o.group === "Фольгирование");
    if (foil) finishing.push({ option: foil });
  }
  const cfg: OrderConfig = {
    production: p.production,
    form: preset.shape ?? "rectangular",
    width,
    height,
    sides,
    quantity,
    paper,
    urgent: false,
    // Кластер вырубки (preset.cutType='die') → +50% к резке отражаем в «от».
    cutType: p.allowContourCut ? preset.cutType : undefined,
    finishing,
  };
  return computePrice(cfg, pricing).total;
}

// Настоящий минимум multipage: перебираем переплёты и бумаги, берём самое дешёвое
// сочетание — как sheet-ветка minPrice() перебирает бумаги. Брать bindings[0]
// нельзя: у фотокниг это твёрдый 7БЦ (min 32 полосы, 1261 ₽), тогда как самый
// дешёвый реальный заказ — пружина на 8 полосах (423 ₽), и именно на нём
// открывается калькулятор (переплёт авто-выбирается по числу полос). «От» должно
// совпадать с тем, что человек видит на странице, иначе title противоречит ей же.
// Пресет кластера сужает перебор: заданные им поля фиксируются, свободные —
// минимизируются. Без пресета (хаб, title) перебирается всё.
function minMultipagePrice(
  p: ProductPricing,
  pricing: PricingData,
  quantity: number,
  preset?: CalcPreset | null,
): number | null {
  const fmtIdx =
    preset?.formatIndex != null && p.sizes[preset.formatIndex] ? preset.formatIndex : 0;
  const fmt = p.sizes[fmtIdx];
  if (!fmt || !p.bindings.length || !p.innerPapers.length || !p.coverPapers.length) return null;
  const bindings =
    preset?.bindingId != null && p.bindings.some((b) => b.id === preset.bindingId)
      ? p.bindings.filter((b) => b.id === preset.bindingId)
      : p.bindings;
  const inners =
    preset?.innerPaperId != null && p.innerPapers.some((x) => x.id === preset.innerPaperId)
      ? p.innerPapers.filter((x) => x.id === preset.innerPaperId)
      : p.innerPapers;
  const covers =
    preset?.coverPaperId != null && p.coverPapers.some((x) => x.id === preset.coverPaperId)
      ? p.coverPapers.filter((x) => x.id === preset.coverPaperId)
      : p.coverPapers;
  let min = Infinity;
  for (const binding of bindings) {
    // Полосы: пресет, но не ниже минимума переплёта (как клампит калькулятор).
    const floor = Math.max(PAGE_STEP, Math.ceil(binding.minPages / PAGE_STEP) * PAGE_STEP);
    const pages =
      preset?.pages != null && preset.pages > 0
        ? Math.max(floor, Math.ceil(preset.pages / PAGE_STEP) * PAGE_STEP)
        : floor;
    for (const innerPaper of inners) {
      for (const coverPaper of covers) {
        const cfg: MultipageConfig = {
          strategy: "multipage",
          width: fmt.width,
          height: fmt.height,
          pages,
          innerSides: "4+4",
          coverSides: "4+0",
          innerPaper,
          coverPaper,
          binding,
          quantity,
          urgent: false,
          finishing: [],
        };
        const total = computePrice(cfg, pricing).total;
        if (total < min) min = total;
      }
    }
  }
  return Number.isFinite(min) ? min : null;
}

// Ценовой конфиг продукта (размеры, бумаги, постпечать) → типы движка.
export async function getProductPricing(
  slug: string,
): Promise<ProductPricing | null> {
  // поля бумаги (переиспользуем для papers / cover_papers / inner_papers)
  const paperFields = (rel: string) => [
    `${rel}.papers_id.id`,
    `${rel}.papers_id.status`,
    `${rel}.papers_id.name`,
    `${rel}.papers_id.price`,
    `${rel}.papers_id.group`,
    `${rel}.papers_id.material_type`,
    `${rel}.papers_id.description`,
    `${rel}.papers_id.image`,
    `${rel}.papers_id.fixed_price`,
    `${rel}.papers_id.fixed_sheet_width`,
    `${rel}.papers_id.fixed_sheet_height`,
    `${rel}.papers_id.fixed_sheet_margin`,
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
    "lead_days",
    "allow_contour_cut",
    "qty_presets",
    "ruling_options",
    "fold_variants.name",
    "fold_variants.folds",
    "fold_variants.kind",
    "fold_variants.image",
    "fold_variants.sort",
    "fixed_price",
    "fixed_sheet_width",
    "fixed_sheet_height",
    "fixed_sheet_margin",
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
    // Фото переплёта. ОТКЛЮЧЕНО: поле bindings.image на проде не держится.
    // POST /fields отвечает 200 и Directus показывает колонку, но в БД её нет
    // («column bindings.image does not exist» на любом реальном чтении);
    // успешные ответы шли из кеша, /utils/cache/clear это вскрывает.
    // Колонка получалась настоящей только когда поле заводили через UI
    // админки — но её сносил `schema apply` на деплое.
    // ⛔ Включать обратно ТОЛЬКО после того, как ВСЁ выполнено:
    //   1) поле заведено через UI прода;
    //   2) POST /utils/cache/clear;
    //   3) GET /items/products?fields=bindings.bindings_id.image → 200;
    //   4) прошёл деплой, и пункт 3 всё ещё даёт 200.
    // "bindings.bindings_id.image",
    "bindings.bindings_id.price",
    "bindings.bindings_id.min_pages",
    "bindings.bindings_id.max_pages",
    "finishing.finishing_id.id",
    "finishing.finishing_id.name",
    "finishing.finishing_id.group",
    "finishing.finishing_id.image",
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

  // Directus отдаёт связанные материалы без оглядки на их status — черновики
  // иначе попадают и в калькулятор, и в цену «от». Отсутствующий status (нет
  // права чтения у роли) НЕ прячет материал: пустой список бумаг сломал бы
  // расчёт продукта целиком, а это хуже лишней плитки.
  const isPublished = (x: any): boolean => {
    const s = x.papers_id.status;
    return s == null || s === "published";
  };
  // осиротевшие junction-строки (материал удалён) отсекаем до всего остального,
  // иначе они сдвинут paperOrder и уронят mapPaper
  const rawPapers = (p.papers ?? []).filter((x: any) => x?.papers_id);

  // junction-строка бумаги (x.papers_id) → PaperOption
  const mapPaper = (x: any): PaperOption => {
    const pp = x.papers_id;
    const hasFixed = Array.isArray(pp.fixed_price) && pp.fixed_price.length > 0;
    return {
      id: num(pp.id),
      name: pp.name,
      price: num(pp.price),
      group: pp.group ?? "Стандартные",
      materialType: pp.material_type ?? "Прочее",
      description: pp.description ?? null,
      image: assetUrl(pp.image),
      thumb: responsiveAsset(pp.image, PAPER_THUMB_W, PAPER_THUMB_H),
      full: responsiveAssetFluid(pp.image, FULL_WIDTHS, FULL_SIZES),
      colors: (pp.colors ?? [])
        .slice()
        .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
        .map(mapColor),
      fixedPrice: hasFixed
        ? pp.fixed_price.map((b: any) => ({ to: num(b.to), price: num(b.price) })).sort((a: any, z: any) => a.to - z.to)
        : undefined,
      fixedSheet: hasFixed
        ? { width: num(pp.fixed_sheet_width) || 275, height: num(pp.fixed_sheet_height) || 405, margin: num(pp.fixed_sheet_margin) || 5 }
        : undefined,
    };
  };

  const finishingList: FinishingOption[] = (p.finishing ?? []).map((x: any) => {
    const f = x.finishing_id;
    return {
      id: num(f.id),
      name: f.name,
      group: f.group ?? null,
      image: assetUrl(f.image),
      thumb: responsiveAsset(f.image, FIN_THUMB_W, FIN_THUMB_H),
      full: responsiveAssetFluid(f.image, FULL_WIDTHS, FULL_SIZES),
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
        .map(mapColor),
    } as FinishingOption;
  });

  // Плитки сгибов. Свои виды фальцовки продукта (буклеты/приглашения/открытки) —
  // O2M-коллекция `product_fold_types` (поле `fold_variants`): name/folds/kind +
  // картинка drag-drop, как у product_sizes. Приоритетнее биговки. Если их нет,
  // но привязана per_fold-отделка с вариантами (finishing_colors: «1 сгиб»…, folds
  // в поле code) — строим универсальные плитки биговки: «Без биговки» + варианты
  // с картинками из самой отделки (заводятся ОДИН раз в «Постпечати», как фольга).
  const ownFoldTypes = (Array.isArray(p.fold_variants) ? p.fold_variants : [])
    .slice()
    .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((f: any) => ({
      name: String(f.name ?? ""),
      folds: num(f.folds),
      kind: String(f.kind ?? "accordion"),
      image: assetUrl(f.image),
      thumb: responsiveAsset(f.image, FOLD_THUMB_W, FOLD_THUMB_H),
      full: responsiveAssetFluid(f.image, FULL_WIDTHS, FULL_SIZES),
    }));
  // Плитки разлиновки — тот же приём, что с биговкой ниже: свои строки продукта
  // (`ruling_options`) в приоритете (без картинок, глифы), иначе — варианты
  // универсальной отделки «Разлиновка» (finishing_colors, с картинками) плюс
  // синтетический «Чистый». Отделка на цену не влияет (в расчёт не попадает),
  // она только носитель вариантов.
  const ownRuling = rulingOptions(p.ruling_options).map((name) => ({
    name,
    image: null,
    thumb: null,
    full: null,
  }));
  const rulingSource = ownRuling.length
    ? null
    : finishingList.find((f) => f.group === "Разлиновка" && f.colors.length);
  // «Чистый» — синтетическая плитка «без варианта»; её картинка — image САМОЙ
  // опции «Разлиновка» (владелец грузит чистый лист туда, варианты — в строки).
  const rulingList: RulingOption[] = ownRuling.length
    ? ownRuling
    : rulingSource
      ? [
          { name: "Чистый", image: rulingSource.image, thumb: rulingSource.thumb, full: rulingSource.full },
          ...rulingSource.colors.map((c) => ({ name: c.name, image: c.image, thumb: c.tile, full: c.full })),
        ]
      : [];

  const creaseSource = ownFoldTypes.length
    ? null
    : finishingList.find((f) => f.unit === "per_fold" && f.colors.length);
  const foldTypes: FoldType[] = ownFoldTypes.length
    ? ownFoldTypes
    : creaseSource
      ? [
          // Картинка «Без биговки» — image самой опции «Биговка» (как у «Чистого»).
          { name: "Без биговки", folds: 0, kind: "crease", image: creaseSource.image, thumb: creaseSource.thumb, full: creaseSource.full },
          ...creaseSource.colors.map((c) => ({
            name: c.name,
            folds: num(c.code),
            kind: "crease",
            image: c.image,
            thumb: c.tile,
            full: c.full,
          })),
        ]
      : [];

  // Универсальные плитки доп-обработки: любая привязанная опция с group (кроме
  // ламинации/фольги/разлиновки — у них своя отрисовка) и вариантами
  // finishing_colors → блок «Без …» + плитки вариантов с картинками. Варианты
  // заводятся ОДИН раз в «Постпечати» и работают у любого продукта с этой опцией
  // (как цвета фольги). `count` берём из code варианта (углы/отверстия).
  const RESERVED_GROUPS = new Set(["Ламинация", "Фольгирование", "Разлиновка"]);
  const DEFAULT_UNIT_COUNT: Record<string, number> = {
    per_sheet: 1, per_item: 1, per_fold: 1, per_corner: 4, per_hole: 1,
  };
  const variantGroups: FinishingVariantGroup[] = finishingList
    .filter((f) => f.group && !RESERVED_GROUPS.has(f.group) && f.colors.length)
    .map((f) => ({
      id: f.id,
      heading: f.group as string,
      unit: f.unit,
      image: f.image,
      thumb: f.thumb,
      full: f.full,
      variants: f.colors.map((c) => {
        const n = Number(c.code);
        return {
          name: c.name,
          count: c.code && !Number.isNaN(n) ? n : (DEFAULT_UNIT_COUNT[f.unit] ?? 1),
          image: c.image,
          thumb: c.tile,
          full: c.full,
        };
      }),
    }));

  return {
    strategy: (p.strategy ?? "sheet") as Strategy,
    production: p.production ?? "sheet",
    leadDays: p.lead_days != null ? num(p.lead_days) : 2,
    previewKind: p.preview_kind ?? null,
    allowRound: !!p.allow_round,
    allowComplex: !!p.allow_complex,
    allowCustom: !!p.allow_custom,
    singleSided: !!p.single_sided,
    doubleSided: !!p.double_sided,
    allowContourCut: !!p.allow_contour_cut,
    qtyPresets: qtyPresets(p.qty_presets, (p.strategy ?? "sheet") as Strategy),
    rulingOptions: rulingList,
    variantGroups,
    foldTypes,
    sizes: (p.sizes ?? []).map((s: any) => ({
      label: s.label,
      width: num(s.width),
      height: num(s.height),
      shape: s.shape ?? "rectangular",
      pagesPerSheet: s.pages_per_sheet == null ? undefined : num(s.pages_per_sheet),
    })),
    paperOrder: rawPapers.map((x: any) => num(x.papers_id.id)),
    papers: rawPapers.filter(isPublished).map(mapPaper),
    coverPapers: (p.cover_papers ?? []).filter((x: any) => x?.papers_id && isPublished(x)).map(mapPaper),
    innerPapers: (p.inner_papers ?? []).filter((x: any) => x?.papers_id && isPublished(x)).map(mapPaper),
    bindings: (p.bindings ?? []).map((x: any) => {
      const b = x.bindings_id;
      return {
        id: num(b.id),
        name: b.name,
        image: assetUrl(b.image),
        thumb: responsiveAsset(b.image, FOLD_THUMB_W, FOLD_THUMB_H),
        full: responsiveAssetFluid(b.image, FULL_WIDTHS, FULL_SIZES),
        priceBrackets: (Array.isArray(b.price) ? b.price : [])
          .map((br: any) => ({ to: num(br.to), price: num(br.price) }))
          .sort((a: any, z: any) => a.to - z.to),
        minPages: num(b.min_pages),
        maxPages: num(b.max_pages),
      } as BindingOption;
    }),
    fixedPrice: (Array.isArray(p.fixed_price) ? p.fixed_price : [])
      .map((b: any) => ({ to: num(b.to), price: num(b.price) }))
      .sort((a: any, z: any) => a.to - z.to),
    fixedSheet: {
      width: num(p.fixed_sheet_width) || 275,
      height: num(p.fixed_sheet_height) || 405,
      margin: num(p.fixed_sheet_margin) || 0,
    },
    finishing: finishingList,
  };
}
