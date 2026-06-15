<script setup lang="ts">
// Конфигуратор многостраничной продукции. Свои поля — через mpCalcKey, общие
// компоненты (плашка, загрузка макета) — через sharedKey. Раскладка та же, что
// у листового (3→2→1 колонки + галерея).
import { provide } from "vue";
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import { useMultipageCalculator, mpCalcKey } from "../composables/useMultipageCalculator";
import { sharedKey } from "../composables/calcShared";
import { applyMultipagePreset, type CalcPreset } from "../composables/calcUrlState";
import MultipageCalculator from "./MultipageCalculator.vue";
import BookletPreview from "./calculator/BookletPreview.vue";
import OrderPlate from "./calculator/OrderPlate.vue";

const props = defineProps<{
  product: ProductPricing;
  pricing: PricingData;
  name: string;
  slug: string;
  preset?: CalcPreset; // предустановка для кластерной/pSEO-страницы (формат/переплёт)
}>();
const calc = useMultipageCalculator(props);
provide(mpCalcKey, calc);
provide(sharedKey, calc);

// Серверный пресет применяем в setup (работает и в SSR-рендере острова).
if (props.preset) applyMultipagePreset(calc, props.preset);
</script>

<template>
  <div class="cfg">
    <MultipageCalculator class="cfg__controls" />
    <BookletPreview class="cfg__preview" />
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
