<script setup lang="ts">
// Листовой конфигуратор (визитки, листовки, …). Состояние через calcKey для
// своих полей + sharedKey для общих компонентов (плашка, загрузка макета).
import { provide, onMounted } from "vue";
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import { useCalculator, calcKey } from "../composables/useCalculator";
import { sharedKey } from "../composables/calcShared";
import { applyPreset, initUrlSync, type CalcPreset } from "../composables/calcUrlState";
import Preview from "./calculator/Preview.vue";
import OrderPlate from "./calculator/OrderPlate.vue";
import Calculator from "./Calculator.vue";

const props = defineProps<{
  product: ProductPricing;
  pricing: PricingData;
  name: string;
  slug: string;
  preset?: CalcPreset; // предустановка опций для кластерной/pSEO-страницы
}>();
const calc = useCalculator(props);
provide(calcKey, calc);
provide(sharedKey, calc);

// Серверный пресет применяем сразу (в setup — работает и в SSR-рендере острова).
if (props.preset) applyPreset(calc, props.preset);
// URL читаем/пишем только на клиенте (нужен window).
onMounted(() => initUrlSync(calc));
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
