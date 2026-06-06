<script setup lang="ts">
// Плашка заказа: итог + «В корзину». Кладёт позицию (полная спецификация
// + снимок цены) в стор корзины. Загрузка макета и серверный заказ — этап 2.
import { inject, ref } from "vue";
import { calcKey } from "../../composables/useCalculator";
import { addToCart } from "../../stores/cart";

const props = defineProps<{ name: string; slug: string }>();
const calc = inject(calcKey)!;
const added = ref(false);

// параметры позиции таблицей (из имён — для показа в корзине)
function buildDetails() {
  const c = calc;
  const d: { label: string; value: string }[] = [];
  d.push({ label: "Размер", value: c.shape === "round" ? `⌀${c.dims.w} мм` : `${c.dims.w}×${c.dims.h} мм` });
  d.push({ label: "Печать", value: c.sides });
  const paper = c.currentPaper?.name;
  const col = c.colors[c.selectedColorIndex]?.name;
  if (paper) d.push({ label: "Материал", value: col ? `${paper} (${col})` : paper });
  if (c.laminationIndex >= 0) {
    const lam = c.laminationOptions[c.laminationIndex]?.name;
    if (lam) d.push({ label: "Ламинация", value: lam });
  }
  if (c.foilOn && c.foilOption) {
    const fc = c.foilOption.colors[c.foilColorIndex]?.name;
    d.push({ label: "Фольга", value: fc ?? "да" });
  }
  const others = c.otherOptions.filter((x) => c.fin[x.i].checked).map((x) => x.o.name);
  if (others.length) d.push({ label: "Обработка", value: others.join(", ") });
  d.push({ label: "Тираж", value: `${c.totalQty} шт` });
  return d;
}

function add() {
  if (!calc.result) return;
  addToCart({
    slug: props.slug,
    name: props.name,
    spec: { productSlug: props.slug, ...calc.currentSpec() },
    details: buildDetails(),
    thumb: calc.captureThumb(),
    qty: calc.totalQty,
    unitPrice: calc.result.total / calc.totalQty,
    total: calc.result.total,
    artworkId: calc.artworkId,
    preflight: calc.artworkPreflight,
  });
  added.value = true;
  setTimeout(() => (added.value = false), 2000);
}
</script>

<template>
  <aside class="card card-border border-base-content">
    <div class="card-body gap-3">
      <template v-if="calc.result">
        <div class="text-3xl font-bold leading-tight">{{ calc.money(calc.result.total) }} ₽</div>
        <div class="text-sm text-base-content/60">
          {{ (calc.result.total / calc.totalQty).toFixed(2) }} ₽/шт · {{ calc.totalQty }} шт · срок 1–3 раб. дня
        </div>

        <button class="btn btn-primary btn-block" :class="{ 'btn-success': added }" @click="add">
          {{ added ? "Добавлено ✓" : "В корзину" }}
        </button>

        <ul class="flex flex-col gap-1.5 text-sm">
          <li v-for="(l, i) in calc.result.lines" :key="i" class="flex justify-between gap-4 border-b border-base-300 pb-1">
            <span>{{ l.label }}</span><span>{{ calc.money(l.amount) }} ₽</span>
          </li>
        </ul>
        <p class="text-xs text-base-content/60">Предварительный расчёт. Точная цена — после проверки макета.</p>
      </template>
      <p v-else class="text-sm text-base-content/60">Заполните параметры для расчёта.</p>
    </div>
  </aside>
</template>
