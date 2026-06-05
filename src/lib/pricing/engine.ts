// Ценовой движок (стратегия `computed`). Чистые функции, без фреймворка.
// Архитектура: линейный конвейер стадий + один поиск по ступеням (tierRate)
// + таблица единиц постпечати. Никаких ветвлений «на каждый случай» —
// разнообразие живёт в данных.

export type Sheet = { width: number; height: number; margin: number };
export type Tier = { minSheets: number; price: number };
export type Sides = "4+0" | "4+4";
export type FinishingUnit =
  | "per_item"
  | "per_sheet"
  | "per_fold"
  | "per_corner"
  | "per_hole";

export type Paper = { name: string; price: number }; // ₽/лист

export type Finishing = {
  name: string;
  unit: FinishingUnit;
  unitPrice: number | null; // плоская ставка (или null, если ступенчатая)
  setupPrice: number; // разовая настройка (base)
  tiers: Tier[]; // для ступенчатых (фольга); иначе []
};

export type CuttingBracket = { to: number; price: number }; // до N листов → цена
export type PricingData = {
  pressSheet: Sheet;
  plotterSheet: Sheet;
  bleed: number;
  urgencyMultiplier: number;
  prepCost: number;
  minOrder: number;
  roundingStep: number;
  printTiers: Record<Sides, Tier[]>;
  plotterCutting: CuttingBracket[]; // ступени резки на плоттере (по числу листов)
  manualCuttingRate: number; // доля от заказа при ручной резке (напр. 0.15)
};

export type OrderConfig = {
  production: "sheet" | "plotter";
  form: "rectangular" | "round" | "complex";
  width: number; // мм (или диаметр для круга)
  height: number; // мм
  sides: Sides;
  quantity: number; // тираж
  paper: Paper;
  urgent: boolean;
  finishing: { option: Finishing; count?: number }[];
};

export type Line = { label: string; amount: number };
export type PriceResult = {
  sheet: Sheet;
  fitPerSheet: number;
  sheets: number;
  lines: Line[];
  subtotal: number;
  total: number;
};

// Ставка ступени: строка с наибольшим minSheets, не превышающим n.
export function tierRate(tiers: Tier[], n: number): number {
  let rate = 0;
  let best = -1;
  for (const t of tiers) {
    if (n >= t.minSheets && t.minSheets > best) {
      best = t.minSheets;
      rate = t.price;
    }
  }
  return rate;
}

// Используется ли плоттер (а не большой лист).
export function isPlotter(c: OrderConfig): boolean {
  return c.production === "plotter" || c.form !== "rectangular";
}

// Выбор листа: плоттер, если база — плоттер ИЛИ форма не прямоугольная.
export function chooseSheet(c: OrderConfig, d: PricingData): Sheet {
  return isPlotter(c) ? d.plotterSheet : d.pressSheet;
}

// Цена по «верхним» диапазонам: первый bracket, где n <= to.
export function bracketRate(brackets: CuttingBracket[], n: number): number {
  for (const b of brackets) if (n <= b.to) return b.price;
  return brackets.length ? brackets[brackets.length - 1].price : 0;
}

// Сколько изделий влезает на лист (пробуем обе ориентации).
export function fitPerSheet(
  sheet: Sheet,
  w: number,
  h: number,
  bleed: number,
): number {
  const uw = sheet.width - 2 * sheet.margin;
  const uh = sheet.height - 2 * sheet.margin;
  const iw = w + 2 * bleed;
  const ih = h + 2 * bleed;
  const straight = Math.floor(uw / iw) * Math.floor(uh / ih);
  const rotated = Math.floor(uw / ih) * Math.floor(uh / iw);
  return Math.max(straight, rotated);
}

// Источник количества для постпечати по её единице.
const UNIT_QTY: Record<
  FinishingUnit,
  (x: { sheets: number; quantity: number; count: number }) => number
> = {
  per_sheet: (x) => x.sheets,
  per_item: (x) => x.quantity,
  per_fold: (x) => x.quantity * x.count,
  per_corner: (x) => x.quantity * x.count,
  per_hole: (x) => x.quantity * x.count,
};
const DEFAULT_COUNT: Record<FinishingUnit, number> = {
  per_sheet: 1,
  per_item: 1,
  per_fold: 1,
  per_corner: 4,
  per_hole: 1,
};

function roundUp(value: number, step: number): number {
  return step > 0 ? Math.ceil(value / step) * step : value;
}

// Главный расчёт: конвейер стадий, читается как формула.
export function computePrice(c: OrderConfig, d: PricingData): PriceResult {
  const sheet = chooseSheet(c, d);
  const fit = fitPerSheet(sheet, c.width, c.height, d.bleed);
  const sheets = Math.ceil(c.quantity / fit);

  const lines: Line[] = [];

  // 1. Печать
  const printRate = tierRate(d.printTiers[c.sides], sheets);
  lines.push({
    label: `Печать ${c.sides} (${sheets} л. × ${printRate})`,
    amount: sheets * printRate,
  });

  // 2. Бумага
  lines.push({
    label: `Бумага «${c.paper.name}» (${sheets} л. × ${c.paper.price})`,
    amount: sheets * c.paper.price,
  });

  // 3. Постпечать — единая формула для всех опций
  for (const { option, count } of c.finishing) {
    const rate = option.tiers.length
      ? tierRate(option.tiers, sheets)
      : option.unitPrice ?? 0;
    const cnt = count ?? DEFAULT_COUNT[option.unit];
    const qty = UNIT_QTY[option.unit]({ sheets, quantity: c.quantity, count: cnt });
    lines.push({
      label: `${option.name} (${option.setupPrice} + ${rate}×${qty})`,
      amount: option.setupPrice + rate * qty,
    });
  }

  // 4. Резка: плоттер — ступенчатый тариф по листам; большой лист — % от заказа.
  if (isPlotter(c)) {
    const cut = bracketRate(d.plotterCutting, sheets);
    if (cut > 0) {
      lines.push({ label: `Резка на плоттере (${sheets} л.)`, amount: cut });
    }
  } else if (d.manualCuttingRate > 0) {
    const base = lines.reduce((s, l) => s + l.amount, 0); // печать+бумага+постпечать
    lines.push({
      label: `Ручная резка (${Math.round(d.manualCuttingRate * 100)}%)`,
      amount: base * d.manualCuttingRate,
    });
  }

  // 5. Подготовка файла
  if (d.prepCost > 0) {
    lines.push({ label: "Подготовка файла", amount: d.prepCost });
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  // 6. Множители → floor → округление
  let total = c.urgent ? subtotal * d.urgencyMultiplier : subtotal;
  total = Math.max(total, d.minOrder);
  total = roundUp(total, d.roundingStep);

  return { sheet, fitPerSheet: fit, sheets, lines, subtotal, total };
}
