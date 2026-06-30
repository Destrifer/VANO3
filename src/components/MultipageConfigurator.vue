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
import ArtworkUpload from "./calculator/ArtworkUpload.vue";

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
    <!-- Превью + макет под ним (макет вынесен из колонки полей) -->
    <div class="cfg__main">
      <BookletPreview />
      <ArtworkUpload />
    </div>

    <div class="cfg__gallery">
      <slot name="gallery" />
    </div>
  </div>

  <!-- Плавающая корзина ПОВЕРХ контента (fixed, см. OrderPlate). Вне сетки. -->
  <OrderPlate :name="name" :slug="slug" />

  <!-- Отступ под фикс. панели на мобайле -->
  <div class="cfg__bottom-spacer" aria-hidden="true"></div>
</template>

<style scoped>
.cfg {
  display: grid;
  gap: 1rem;
  align-items: start;
  margin-block: 1.5rem;
  grid-template-columns: 1fr;
  grid-template-areas:
    "main"
    "controls"
    "gallery";
}
.cfg__main { grid-area: main; display: flex; flex-direction: column; gap: 1rem; }
.cfg__controls { grid-area: controls; }
.cfg__gallery { grid-area: gallery; }

@media (min-width: 768px) {
  .cfg {
    gap: 2rem;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    grid-template-areas:
      "controls main"
      "gallery  gallery";
  }
}
@media (min-width: 1280px) {
  .cfg {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas: "controls main gallery";
  }
}

.cfg__bottom-spacer { display: none; }
@media (max-width: 767px) {
  .cfg__bottom-spacer { display: block; height: calc(var(--mobile-bar-h, 5rem) + 4rem); }
}
</style>
