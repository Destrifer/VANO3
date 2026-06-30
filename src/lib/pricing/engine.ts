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

export type Paper = {
  name: string;
  price: number; // ₽/лист (для обычного расчёта)
  // Спецматериал с фикс-ценой за лист (световозвращающая плёнка, пластик 3M):
  // если задано — база считается по этой таблице (всё включено: печать+резка+
  // материал), а обычные печать/бумага/резка пропускаются. Постпечать (ламинация/
  // фольга) добавляется сверху как обычно.
  fixedPrice?: { to: number; price: number }[]; // ₽/лист по числу листов
  fixedSheet?: Sheet; // печатный лист этого материала
};

export type Finishing = {
  name: string;
  unit: FinishingUnit;
  unitPrice: number | null; // плоская ставка (или null, если ступенчатая)
  setupPrice: number; // разовая настройка (base)
  tiers: Tier[]; // для ступенчатых (фольга); иначе []
};

export type CuttingBracket = { to: number; price: number }; // до N (листов/тиража) → цена
export type PricingData = {
  pressSheet: Sheet;
  plotterSheet: Sheet;
  brochureSheet: Sheet; // печатный лист брошюр (438×309) — для спуска многостраничной
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
  strategy?: "sheet"; // дефолтная стратегия (раскладка на лист)
  production: "sheet" | "plotter";
  form: "rectangular" | "round" | "complex";
  width: number; // мм (или диаметр для круга)
  height: number; // мм
  sides: Sides;
  quantity: number; // тираж
  paper: Paper;
  urgent: boolean;
  contourCut?: boolean; // контурная надсечка (наклейки): +50% к резке
  finishing: { option: Finishing; count?: number }[];
};

// Многостраничная (брошюры/каталоги/…): блок + обложка + переплёт.
// Цена переплёта — по тиражу (брекеты ₽/экз). Диапазон полос (min/max) задаёт
// совместимость переплёта (скоба ≤64, пружина ≤200, клей ≥100).
export type Binding = {
  name: string;
  priceBrackets: CuttingBracket[]; // ₽/экз по тиражу: первый bracket, где тираж ≤ to
  minPages: number;
  maxPages: number;
};
export const PAGE_STEP = 4; // полосы всегда кратны 4

export type MultipageConfig = {
  strategy: "multipage";
  width: number; // формат, мм
  height: number;
  pages: number; // полос блока (кратно 4)
  innerSides: Sides; // печать блока (обычно 4+4)
  coverSides: Sides; // печать обложки
  innerPaper: Paper; // бумага блока (₽/лист)
  coverPaper: Paper; // бумага обложки
  binding: Binding;
  quantity: number; // тираж
  urgent: boolean;
  finishing: { option: Finishing; count?: number }[]; // отделка обложки
};

// Спуск брошюры: сколько полос даёт один печатный лист бумаги. Геометрически —
// (страниц формата на сторону, обе ориентации) × 2 стороны. Без вылетов между
// полосами (трим общий). Минимум 2 (одна полоса на сторону).
export function pagesPerSheet(sheet: Sheet, w: number, h: number): number {
  return Math.max(2, fitPerSheet(sheet, w, h, 0) * 2);
}

// Фикс-цена за лист (наклейки на спецплёнке/пластике): цена ВКЛЮЧАЕТ всё
// (печать+резка+материал) и зависит от числа листов (скидка за объём). Листов
// считаем из размера изделия (сколько влезает на лист продукта) и тиража.
export type FixedConfig = {
  strategy: "fixed";
  width: number; // размер изделия, мм
  height: number;
  quantity: number; // тираж
  sheet: Sheet; // печатный лист продукта (напр. 275×405)
  priceBrackets: CuttingBracket[]; // ₽/лист по числу листов (всё включено)
  urgent: boolean;
};

export type AnyConfig = OrderConfig | MultipageConfig | FixedConfig;

export type Line = { label: string; amount: number };
export type PriceResult = {
  sheet?: Sheet; // только для листовой стратегии
  fitPerSheet?: number;
  sheets?: number;
  lines: Line[];
  subtotal: number;
  total: number;
};

// Ставка ступени: строка с наибольшим minSheets, не превышающим n.
// Ниже самой нижней ступени берём её ставку (самую дорогую за лист), а НЕ 0:
// минимума по тиражу/числу листов нет, поэтому малый заказ должен считаться по
// честной ставке (порог рентабельности ловит уже minOrder на итоге, см. computeSheet).
export function tierRate(tiers: Tier[], n: number): number {
  let rate = 0;
  let best = -1;
  let lowest: Tier | null = null; // ступень с минимальным minSheets (без опоры на сортировку)
  for (const t of tiers) {
    if (lowest === null || t.minSheets < lowest.minSheets) lowest = t;
    if (n >= t.minSheets && t.minSheets > best) {
      best = t.minSheets;
      rate = t.price;
    }
  }
  if (best === -1 && lowest) return lowest.price; // n ниже всех ступеней
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

// Диспетчер стратегий: выбирает расчёт по c.strategy. Текущая листовая логика —
// computeSheet; многостраничная — computeMultipage. Новые паттерны (area,
// perpiece) добавляются сюда же, не трогая существующие.
export function computePrice(c: AnyConfig, d: PricingData): PriceResult {
  const strat = (c as { strategy?: string }).strategy;
  if (strat === "multipage") return computeMultipage(c as MultipageConfig, d);
  if (strat === "fixed") return computeFixed(c as FixedConfig, d);
  return computeSheet(c as OrderConfig, d);
}

// Фикс-цена за лист: листов = ceil(тираж / влезает на лист), ставка по числу
// листов (брекеты), итог = ставка × листов. Всё включено.
export function computeFixed(c: FixedConfig, d: PricingData): PriceResult {
  const fit = Math.max(1, fitPerSheet(c.sheet, c.width, c.height, 0));
  const sheets = Math.ceil(Math.max(1, c.quantity) / fit);
  const rate = bracketRate(c.priceBrackets, sheets);
  const amount = rate * sheets;
  const lines: Line[] = [
    { label: `Печать, резка, материал (${sheets} л. × ${rate} ₽)`, amount },
  ];
  let total = c.urgent ? amount * d.urgencyMultiplier : amount;
  total = Math.max(total, d.minOrder);
  total = roundUp(total, d.roundingStep);
  return { sheet: c.sheet, fitPerSheet: fit, sheets, lines, subtotal: amount, total };
}

// Листовая стратегия: конвейер стадий, читается как формула.
// Спецматериал с фикс-ценой (paper.fixedPrice) → база по таблице «₽/лист × листы»
// (всё включено), без отдельных печати/бумаги/резки; постпечать добавляется сверху.
export function computeSheet(c: OrderConfig, d: PricingData): PriceResult {
  const fixedMat = c.paper.fixedPrice && c.paper.fixedPrice.length ? c.paper : null;
  const sheet = fixedMat?.fixedSheet ?? chooseSheet(c, d);
  const fit = Math.max(1, fitPerSheet(sheet, c.width, c.height, fixedMat ? 0 : d.bleed));
  const sheets = Math.ceil(c.quantity / fit);

  const lines: Line[] = [];

  if (fixedMat) {
    // База: всё включено (печать+резка+материал) по числу листов
    const rate = bracketRate(fixedMat.fixedPrice!, sheets);
    lines.push({
      label: `Печать, резка, материал «${c.paper.name}» (${sheets} л. × ${rate} ₽)`,
      amount: rate * sheets,
    });
  } else {
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
  }

  // 3. Постпечать — единая формула для всех опций (и для fixed добавляется сверху)
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

  // 4. Резка и 5. подготовка — только для обычного расчёта (для fixed всё включено)
  if (!fixedMat) {
    if (isPlotter(c)) {
      // ступень выбирается по числу изделий на листе (fit), цена — за резку листа,
      // итог — ставка × число листов.
      const cutRate = bracketRate(d.plotterCutting, fit);
      let cut = cutRate * sheets;
      if (c.contourCut) cut *= 1.5; // контурная надсечка дороже на 50%
      if (cut > 0) {
        lines.push({
          label: `Резка на плоттере${c.contourCut ? " (контур)" : ""} (${sheets} л. × ${cutRate})`,
          amount: cut,
        });
      }
    } else if (d.manualCuttingRate > 0) {
      const base = lines.reduce((s, l) => s + l.amount, 0); // печать+бумага+постпечать
      lines.push({
        label: `Ручная резка (${Math.round(d.manualCuttingRate * 100)}%)`,
        amount: base * d.manualCuttingRate,
      });
    }
    if (d.prepCost > 0) lines.push({ label: "Подготовка файла", amount: d.prepCost });
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  // 6. Множители → floor → округление
  let total = c.urgent ? subtotal * d.urgencyMultiplier : subtotal;
  total = Math.max(total, d.minOrder);
  total = roundUp(total, d.roundingStep);

  return { sheet, fitPerSheet: fit, sheets, lines, subtotal, total };
}

// Многостраничная стратегия: блок (страницы → листы) + обложка + переплёт.
// Печатные тарифы — общие (d.printTiers), бумаги/переплёт приходят в конфиге
// (как `paper` у листовой). Числа продукта — из Directus (data-driven).
export function computeMultipage(c: MultipageConfig, d: PricingData): PriceResult {
  const lines: Line[] = [];

  const pps = pagesPerSheet(d.brochureSheet, c.width, c.height); // спуск от листа
  const innerPerCopy = Math.max(1, Math.ceil(c.pages / pps));
  const innerSheets = innerPerCopy * c.quantity;
  const coverSheets = c.quantity; // один печатный лист обложки на экземпляр

  // 1. Блок
  const innerRate = tierRate(d.printTiers[c.innerSides], innerSheets);
  lines.push({
    label: `Печать блока ${c.innerSides} (${innerSheets} л. × ${innerRate})`,
    amount: innerSheets * innerRate,
  });
  lines.push({
    label: `Бумага блока «${c.innerPaper.name}» (${innerSheets} л. × ${c.innerPaper.price})`,
    amount: innerSheets * c.innerPaper.price,
  });

  // 2. Обложка
  const coverRate = tierRate(d.printTiers[c.coverSides], coverSheets);
  lines.push({
    label: `Печать обложки ${c.coverSides} (${coverSheets} л. × ${coverRate})`,
    amount: coverSheets * coverRate,
  });
  lines.push({
    label: `Бумага обложки «${c.coverPaper.name}» (${coverSheets} л. × ${c.coverPaper.price})`,
    amount: coverSheets * c.coverPaper.price,
  });

  // 3. Переплёт — ₽/экз по тиражу (брекеты)
  const b = c.binding;
  const bindRate = bracketRate(b.priceBrackets, c.quantity);
  lines.push({
    label: `Переплёт «${b.name}» (${bindRate} ₽/экз × ${c.quantity})`,
    amount: bindRate * c.quantity,
  });

  // 4. Отделка обложки — та же таблица единиц (per_item=экз, per_sheet=обложки)
  for (const { option, count } of c.finishing) {
    const rate = option.tiers.length
      ? tierRate(option.tiers, coverSheets)
      : option.unitPrice ?? 0;
    const cnt = count ?? DEFAULT_COUNT[option.unit];
    const qty = UNIT_QTY[option.unit]({ sheets: coverSheets, quantity: c.quantity, count: cnt });
    lines.push({
      label: `${option.name} (${option.setupPrice} + ${rate}×${qty})`,
      amount: option.setupPrice + rate * qty,
    });
  }

  // 5. Подготовка файла
  if (d.prepCost > 0) lines.push({ label: "Подготовка файла", amount: d.prepCost });

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  let total = c.urgent ? subtotal * d.urgencyMultiplier : subtotal;
  total = Math.max(total, d.minOrder);
  total = roundUp(total, d.roundingStep);

  return { sheets: innerSheets + coverSheets, lines, subtotal, total };
}
