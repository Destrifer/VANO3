<script setup lang="ts">
// Остров конфигуратора: создаёт состояние, раздаёт полям/превью/плашке через
// provide/inject и раскладывает зоны.
//
// Раскладка (grid-template-areas, равные колонки 1fr):
//   3 кол. (≥1280): поля | превью/плашка | галерея
//   2 кол. (≥768):  поля | превью/плашка, галерея — полной шириной ниже
//   1 кол. (моб.):  превью → поля → плашка → галерея
// Внутри галереи — auto-fit/minmax (миниатюры 2→1).
import { provide } from "vue";
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import { useCalculator, calcKey } from "../composables/useCalculator";
import Preview from "./calculator/Preview.vue";
import OrderPlate from "./calculator/OrderPlate.vue";
import Calculator from "./Calculator.vue";

const props = defineProps<{
  product: ProductPricing;
  pricing: PricingData;
  name: string;
  slug: string;
}>();
provide(calcKey, useCalculator(props));
</script>

<template>
  <div class="cfg">
    <Calculator class="cfg__controls" />
    <Preview class="cfg__preview" />
    <OrderPlate class="cfg__plate" :name="name" :slug="slug" />

    <!-- Галерея приходит статикой из Astro (см. Gallery.astro): оптимизированные
         картинки остаются обычным <picture> в HTML, остров их не гидрирует. -->
    <div class="cfg__gallery">
      <slot name="gallery" />
    </div>
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
/* Сетку миниатюр и container-query держит сам Gallery.astro. */
.cfg__gallery  { grid-area: gallery; }
</style>
