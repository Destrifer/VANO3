<script setup lang="ts">
// Плашка заказа: срок готовности + итог + «В корзину». Кладёт позицию (полная
// спецификация + снимок цены) в стор корзины. Серверный заказ — этап 2.
import { inject, ref, computed, onMounted, onUnmounted } from "vue";
import { sharedKey } from "../../composables/calcShared";
import { addToCart } from "../../stores/cart";
import { formatLead, msToNextLeadBoundary } from "../../lib/leadtime";
import type { CartSpec } from "../../lib/pricing/spec";

const props = defineProps<{ name: string; slug: string }>();
// Общий контракт: плашка не зависит от стратегии (лист/многостраничная).
const calc = inject(sharedKey)!;
const added = ref(false);

// — Срок готовности (живой пересчёт: в отсечку/полночь обновляется сам) —
const now = ref(new Date());
const cutoff = ref(14);
let timer: ReturnType<typeof setTimeout> | undefined;
const tick = () => {
  now.value = new Date();
  timer = setTimeout(tick, msToNextLeadBoundary(now.value, cutoff.value));
};
onMounted(() => {
  const meta = document.querySelector('meta[name="lead-cutoff"]')?.getAttribute("content");
  if (meta) cutoff.value = Number(meta) || 14;
  tick();
});
onUnmounted(() => timer && clearTimeout(timer));
const lead = computed(() =>
  formatLead(now.value, calc.product.leadDays ?? 2, cutoff.value),
);

function add() {
  if (!calc.result) return;
  addToCart({
    slug: props.slug,
    name: props.name,
    spec: { productSlug: props.slug, ...calc.currentSpec() } as CartSpec,
    details: calc.details(),
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
          {{ (calc.result.total / calc.totalQty).toFixed(2) }} ₽/шт · {{ calc.totalQty }} шт
        </div>

        <!-- Срок готовности — мотивация заказать сейчас -->
        <div class="ready-plate" :title="lead.title">
          <svg class="ready-plate__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0m9 0l3 2m-3-7v5" />
          </svg>
          <span>Готово {{ lead.text }}</span>
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

<style scoped>
.ready-plate {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  align-self: flex-start;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-field, 0.25rem);
  background: var(--color-base-200);
  font-size: 0.9rem;
  font-weight: 600;
}
.ready-plate__icon {
  width: 1.1rem;
  height: 1.1rem;
}
</style>
