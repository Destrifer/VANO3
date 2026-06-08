// Таблица цен «тираж × стороны» — генерируется ТЕМ ЖЕ движком (П2), а не хардкод.
// Статический HTML (П6, краулится), дополняет островную цену конфигуратора.
// Пробная версия: только листовая стратегия (визитки/листовки), базовая бумага,
// без постпечати. Пресет/фольгу для кластеров добавим позже.
import { computePrice } from "./engine";
import type { OrderConfig, PricingData, Sides } from "./engine";
import type { ProductPricing } from "./data";

export type PriceCell = { total: number; perUnit: number };
export type PriceRow = { quantity: number; cells: PriceCell[] };
export type PriceTableData = {
  sideLabels: string[]; // заголовки колонок
  rows: PriceRow[];
  paperName: string;
  width: number;
  height: number;
} | null;

const DEFAULT_QTYS = [50, 100, 200, 300, 500, 1000];

const sideLabel = (s: Sides) => (s === "4+0" ? "Односторонние" : "Двусторонние");

export function priceTable(
  p: ProductPricing,
  pricing: PricingData,
  opts: { quantities?: number[] } = {},
): PriceTableData {
  // Пробно — только чистая листовая. Для прочих стратегий блок не показываем.
  if (p.strategy !== "sheet") return null;
  const paper = p.papers[0];
  const size = p.sizes[0];
  if (!paper || !size) return null;

  // Колонки: учитываем принудительные стороны продукта.
  const sides: Sides[] = p.singleSided
    ? ["4+0"]
    : p.doubleSided
      ? ["4+4"]
      : ["4+0", "4+4"];
  const quantities = opts.quantities ?? DEFAULT_QTYS;

  const rows: PriceRow[] = quantities.map((qty) => ({
    quantity: qty,
    cells: sides.map((sd) => {
      const cfg: OrderConfig = {
        production: p.production,
        form: "rectangular",
        width: size.width,
        height: size.height,
        sides: sd,
        quantity: qty,
        paper,
        urgent: false,
        finishing: [],
      };
      const total = computePrice(cfg, pricing).total;
      return { total, perUnit: total / qty };
    }),
  }));

  return {
    sideLabels: sides.map(sideLabel),
    rows,
    paperName: paper.name,
    width: size.width,
    height: size.height,
  };
}
