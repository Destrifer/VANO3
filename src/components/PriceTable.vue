<script setup lang="ts">
// Динамическая таблица цен внутри конфигуратора (остров). Делит состояние с
// калькулятором через calcKey: клик по ячейке подставляет параметры, любое
// изменение параметра пересчитывает сетку. SSR-рендерится в дефолтном состоянии
// → статичная таблица попадает в HTML (П6, краулится), затем гидрируется.
// Цена считается тем же движком (calc.priceForCell, П2) — без хардкода.
import { computed, inject } from "vue";
import { calcKey } from "../composables/useCalculator";

const calc = inject(calcKey)!;

type Ov = { paperIndex?: number; sizeIndex?: number; sides?: "4+0" | "4+4" };
type RowDef = { label: string; ov: Ov; active: boolean };

// Ось рядов: размеры (если их >1) → бумаги (если >1) → стороны. Иначе таблицы нет.
const axis = computed<"size" | "paper" | "sides" | null>(() => {
  if (calc.product.sizes.length > 1) return "size";
  if (calc.product.papers.length > 1) return "paper";
  if (!calc.singleSided && !calc.doubleSided) return "sides";
  return null;
});
const axisLabel = computed(() =>
  axis.value === "size"
    ? "Размер"
    : axis.value === "paper"
      ? "Бумага"
      : axis.value === "sides"
        ? "Стороны"
        : "",
);

const rows = computed<RowDef[]>(() => {
  if (axis.value === "size")
    return calc.product.sizes.map((s, i) => ({
      label: `${s.width}×${s.height} мм`,
      ov: { sizeIndex: i },
      active: !calc.customMode && calc.sizeIndex === i,
    }));
  if (axis.value === "paper")
    return calc.product.papers.map((p, i) => ({
      label: p.name,
      ov: { paperIndex: i },
      active: calc.paperIndex === i,
    }));
  if (axis.value === "sides")
    return [
      { label: "Односторонние", ov: { sides: "4+0" }, active: calc.sides === "4+0" },
      { label: "Двусторонние", ov: { sides: "4+4" }, active: calc.sides === "4+4" },
    ];
  return [];
});

const quantities = computed<number[]>(() => calc.presets);

type Cell = {
  total: number | null;
  perUnit: number | null;
  active: boolean;
  delta: number | null; // % к выбранной ячейке (− выгоднее, + дороже)
};

const grid = computed<Cell[][]>(() => {
  const qs = quantities.value;
  const rws = rows.value;
  const raw = rws.map((r) =>
    qs.map((q) => {
      const total = calc.priceForCell({ ...r.ov, quantity: q });
      return { total, perUnit: total != null ? total / q : null };
    }),
  );
  // База для % — текущая выбранная ячейка (ряд активен + тираж = текущему).
  const ar = rws.findIndex((r) => r.active);
  const ac = qs.findIndex((q) => q === calc.quantity);
  let base: number | null = null;
  if (ar >= 0) base = (ac >= 0 ? raw[ar][ac] : raw[ar][0])?.perUnit ?? null;
  if (base == null) base = raw[0]?.[0]?.perUnit ?? null;
  return raw.map((rowCells, ri) =>
    rowCells.map((c, ci) => ({
      total: c.total,
      perUnit: c.perUnit,
      active: rws[ri].active && qs[ci] === calc.quantity,
      delta: base && c.perUnit != null ? ((c.perUnit - base) / base) * 100 : null,
    })),
  );
});

function select(ri: number, ci: number) {
  const r = rows.value[ri];
  if (r.ov.sizeIndex != null) {
    calc.customMode = false;
    calc.sizeIndex = r.ov.sizeIndex;
  }
  if (r.ov.paperIndex != null) calc.paperIndex = r.ov.paperIndex;
  if (r.ov.sides) calc.sides = r.ov.sides;
  calc.quantity = quantities.value[ci];
}

const money = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
const per = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
const pct = (d: number) => `${d > 0 ? "+" : ""}${d.toFixed(0)}%`;
</script>

<template>
  <section v-if="axis && rows.length" class="price-table my-8">
    <h2 class="mb-3 text-xl font-bold">Цены: тираж × {{ axisLabel.toLowerCase() }}</h2>
    <div class="overflow-x-auto">
      <table class="table border border-base-content">
        <thead>
          <tr>
            <th>{{ axisLabel }}</th>
            <th v-for="q in quantities" :key="q">{{ q }} шт</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, ri) in rows" :key="ri">
            <td class="font-medium">{{ r.label }}</td>
            <td
              v-for="(c, ci) in grid[ri]"
              :key="ci"
              class="price-cell"
              :class="c.active ? 'bg-base-300 font-semibold' : 'hover:bg-base-200'"
              role="button"
              tabindex="0"
              @click="select(ri, ci)"
              @keydown.enter="select(ri, ci)"
            >
              <template v-if="c.total != null">
                <div>{{ money(c.total) }} ₽</div>
                <div class="text-xs text-base-content/60">{{ per(c.perUnit!) }} ₽/шт</div>
                <div
                  v-if="c.delta != null && Math.round(c.delta) !== 0"
                  class="text-xs font-medium"
                  :class="c.delta < 0 ? 'text-gain' : 'text-loss'"
                >
                  {{ pct(c.delta) }}
                </div>
              </template>
              <span v-else class="text-base-content/40">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-2 text-sm text-base-content/60">
      Клик по ячейке подставит параметры в конфигуратор. % — выгода на штуку
      относительно выбранного.
    </p>
  </section>
</template>

<style scoped>
.price-cell {
  cursor: pointer;
  white-space: nowrap;
}
</style>
