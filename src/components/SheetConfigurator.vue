<script setup lang="ts">
// Листовой конфигуратор (визитки, листовки, …). Состояние через calcKey для
// своих полей + sharedKey для общих компонентов (плашка, загрузка макета).
import { provide, onMounted, ref } from "vue";
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import { useCalculator, calcKey } from "../composables/useCalculator";
import { sharedKey } from "../composables/calcShared";
import {
  applyPreset,
  applyPresetFromUrl,
  buildShareUrl,
  type CalcPreset,
} from "../composables/calcUrlState";
import Preview from "./calculator/Preview.vue";
import OrderPlate from "./calculator/OrderPlate.vue";
import ArtworkUpload from "./calculator/ArtworkUpload.vue";
import Calculator from "./Calculator.vue";
import PriceTable from "./PriceTable.vue";

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
// На клиенте один раз читаем пресет из URL (расшаренная ссылка). Обратной
// записи в URL нет — параметры появляются только по кнопке «Получить ссылку».
onMounted(() => applyPresetFromUrl(calc));

// Кнопка «Получить ссылку на расчёт»: собираем URL с текущими опциями в буфер.
const shared = ref(false);
async function shareLink() {
  const url = buildShareUrl(calc);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Буфер недоступен (нет https/разрешения) — показываем ссылку через prompt.
    window.prompt("Ссылка на расчёт:", url);
    return;
  }
  shared.value = true;
  setTimeout(() => (shared.value = false), 2000);
}
</script>

<template>
  <div class="cfg">
    <Calculator class="cfg__controls" />
    <!-- Превью + макет под ним (макет вынесен из колонки полей) -->
    <div class="cfg__main">
      <Preview />
      <ArtworkUpload />
    </div>
    <div class="cfg__plate">
      <OrderPlate :name="name" :slug="slug" />
      <button
        type="button"
        class="btn btn-outline btn-sm btn-block cfg__share"
        :class="{ 'btn-success': shared }"
        @click="shareLink"
      >
        {{ shared ? "Ссылка скопирована ✓" : "Получить ссылку на расчёт" }}
      </button>
    </div>

    <div class="cfg__gallery">
      <slot name="gallery" />
    </div>
  </div>

  <!-- Динамическая таблица цен (делит состояние с калькулятором) -->
  <PriceTable />

  <!-- Отступ под фикс. нижнюю панель итогов на мобайле, чтобы не перекрывала контент -->
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
    "plate"
    "gallery";
}
.cfg__main { grid-area: main; display: flex; flex-direction: column; gap: 1rem; }
.cfg__controls { grid-area: controls; }
.cfg__plate { grid-area: plate; display: flex; flex-direction: column; gap: 0.75rem; }
.cfg__gallery { grid-area: gallery; }

@media (min-width: 768px) {
  .cfg {
    gap: 2rem;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    grid-template-areas:
      "controls main"
      "controls plate"
      "gallery  gallery";
  }
  /* Плашка «плавает» — прилипает при скролле длинной колонки полей. */
  .cfg__plate { position: sticky; top: 1rem; }
}
@media (min-width: 1280px) {
  .cfg {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 19rem);
    grid-template-areas:
      "controls main    plate"
      "controls gallery plate";
  }
}

/* Мобайл: панель итогов фиксирована снизу (см. OrderPlate) — share-кнопку
   оставляем в потоке, добавляем нижний отступ страницы под высоту панели. */
.cfg__share { /* на десктопе обычная кнопка под плашкой */ }
.cfg__bottom-spacer { display: none; }
@media (max-width: 767px) {
  /* под контакт-панель + панель итогов над ней */
  .cfg__bottom-spacer { display: block; height: calc(var(--mobile-bar-h, 5rem) + 4rem); }
}
</style>
