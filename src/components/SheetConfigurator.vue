<script setup lang="ts">
// Листовой конфигуратор (визитки, листовки, …). Состояние через calcKey для
// своих полей + sharedKey для общих компонентов (плашка, загрузка макета).
import { provide } from "vue";
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import { useCalculator, calcKey } from "../composables/useCalculator";
import { sharedKey } from "../composables/calcShared";
import Preview from "./calculator/Preview.vue";
import OrderPlate from "./calculator/OrderPlate.vue";
import Calculator from "./Calculator.vue";

const props = defineProps<{
  product: ProductPricing;
  pricing: PricingData;
  name: string;
  slug: string;
}>();
const calc = useCalculator(props);
provide(calcKey, calc);
provide(sharedKey, calc);
</script>

<template>
  <div class="cfg">
    <Calculator class="cfg__controls" />
    <Preview class="cfg__preview" />
    <OrderPlate class="cfg__plate" :name="name" :slug="slug" />

    <div class="cfg__gallery">
      <slot name="gallery" />
    </div>
  </div>
</template>

<style scoped>
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
.cfg__gallery  { grid-area: gallery; }
</style>
