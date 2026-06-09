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
    <Preview class="cfg__preview" />
    <div class="cfg__plate">
      <OrderPlate :name="name" :slug="slug" />
      <button
        type="button"
        class="btn btn-outline btn-sm btn-block"
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
.cfg__plate    { grid-area: plate; display: flex; flex-direction: column; gap: 0.75rem; }
.cfg__gallery  { grid-area: gallery; }
</style>
