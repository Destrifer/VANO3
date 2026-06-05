<script setup lang="ts">
// Остров конфигуратора: создаёт состояние, раздаёт полям/превью/плашке через
// provide/inject и раскладывает зоны.
//
// Раскладка (grid-template-areas, равные колонки 1fr):
//   3 кол. (≥1280): поля | превью/плашка | галерея
//   2 кол. (≥768):  поля | превью/плашка, галерея — полной шириной ниже
//   1 кол. (моб.):  превью → поля → плашка → галерея
// Внутри галереи — auto-fit/minmax (миниатюры 2→1).
import { computed, provide } from "vue";
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import { useCalculator, calcKey } from "../composables/useCalculator";
import Preview from "./calculator/Preview.vue";
import OrderPlate from "./calculator/OrderPlate.vue";
import Calculator from "./Calculator.vue";

const props = defineProps<{
  product: ProductPricing;
  pricing: PricingData;
  gallery?: string[];
}>();
provide(calcKey, useCalculator(props));

// заглушки, пока нет реальных фото (позже — из Directus)
const shots = computed(() =>
  props.gallery?.length ? props.gallery : Array.from({ length: 4 }, () => null),
);
</script>

<template>
  <div class="cfg">
    <Calculator class="cfg__controls" />
    <Preview class="cfg__preview" />
    <OrderPlate class="cfg__plate" />

    <section class="cfg__gallery">
      <h2 class="mb-3 text-lg font-bold">Примеры работ</h2>
      <div class="cfg__shots">
        <div
          v-for="(s, i) in shots"
          :key="i"
          class="aspect-[3/2] overflow-hidden rounded-lg border border-base-300 bg-base-200"
        >
          <img v-if="s" :src="s" class="h-full w-full object-cover" alt="" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Раскладочная сетка (без цветов/токенов — только layout). */
.cfg {
  display: grid;
  gap: 1rem;
  align-items: start;
  margin-block: 1.5rem;
  grid-template-columns: 1fr;
  grid-template-areas:
    "preview"
    "controls"
    "plate"
    "gallery";
}
@media (min-width: 768px) {
  .cfg {
    gap: 2rem;
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "controls preview"
      "controls plate"
      "gallery  gallery";
  }
}
@media (min-width: 1280px) {
  .cfg {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-areas:
      "controls preview gallery"
      "controls plate   gallery";
  }
}
.cfg__controls { grid-area: controls; }
.cfg__preview  { grid-area: preview; }
.cfg__plate    { grid-area: plate; }
.cfg__gallery  { grid-area: gallery; container-type: inline-size; }

/* Миниатюры галереи: максимум 2 в ряд (крупные) → 1 при сужении колонки.
   Container query — ориентир на ширину самой галереи, а не экрана. */
.cfg__shots {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}
@container (min-width: 420px) {
  .cfg__shots { grid-template-columns: 1fr 1fr; }
}
</style>
