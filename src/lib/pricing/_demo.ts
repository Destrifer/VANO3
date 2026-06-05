// Проверочный прогон движка на реальных числах визиток. Запуск: npx tsx src/lib/pricing/_demo.ts
import { computePrice, type PricingData, type OrderConfig, type Finishing } from "./engine";

const tos = [10, 50, 100, 200, 300, 400, 500, 750, 1000, 2000, 4000];
const lo = [1, ...tos.map((t) => t + 1)];
const mk = (prices: number[]) => lo.map((m, i) => ({ minSheets: m, price: prices[i] }));

const data: PricingData = {
  pressSheet: { width: 438, height: 309, margin: 2 },
  plotterSheet: { width: 290, height: 405, margin: 2 },
  bleed: 2,
  urgencyMultiplier: 1.5,
  prepCost: 0,
  minOrder: 0,
  roundingStep: 1,
  printTiers: {
    "4+0": mk([80, 60, 55, 50, 47, 45, 42, 40, 37, 35, 32, 30]),
    "4+4": mk([120, 100, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45]),
  },
};

const paper = { name: "Мелованная 300 г/м²", price: 25 };
const lamMatte: Finishing = { name: "Ламинация матовая", unit: "per_sheet", unitPrice: 30, setupPrice: 0, tiers: [] };
const foilTos = [10, 30, 50, 100, 200, 300, 500];
const foilLo = [1, ...foilTos.map((t) => t + 1)];
const foil: Finishing = {
  name: "Фольгирование", unit: "per_sheet", unitPrice: null, setupPrice: 0,
  tiers: foilLo.map((m, i) => ({ minSheets: m, price: [400, 350, 300, 250, 170, 150, 135, 120][i] })),
};
const roundCorners: Finishing = { name: "Скругление углов", unit: "per_corner", unitPrice: 1, setupPrice: 300, tiers: [] };

const base: Omit<OrderConfig, "quantity" | "sides" | "finishing"> = {
  production: "sheet", form: "rectangular", width: 90, height: 50, paper, urgent: false,
};

function run(title: string, cfg: OrderConfig) {
  const r = computePrice(cfg, data);
  console.log(`\n=== ${title} ===`);
  console.log(`лист ${r.sheet.width}×${r.sheet.height} | на листе: ${r.fitPerSheet} | листов: ${r.sheets}`);
  for (const l of r.lines) console.log(`  ${l.label} = ${l.amount.toFixed(2)}`);
  console.log(`  ИТОГО: ${r.total.toFixed(2)} ₽  (${(r.total / cfg.quantity).toFixed(2)} ₽/шт)`);
}

run("100 визиток, 4+0, без отделки", { ...base, quantity: 100, sides: "4+0", finishing: [] });
run("1000 визиток, 4+4, матовая ламинация", { ...base, quantity: 1000, sides: "4+4", finishing: [{ option: lamMatte }] });
run("1000 визиток, 4+4, ламинация + фольга", { ...base, quantity: 1000, sides: "4+4", finishing: [{ option: lamMatte }, { option: foil }] });
run("500 визиток, 4+0, скругление 4 угла", { ...base, quantity: 500, sides: "4+0", finishing: [{ option: roundCorners }] });
run("100 визиток, 4+4, срочно", { ...base, quantity: 100, sides: "4+4", urgent: true, finishing: [] });
