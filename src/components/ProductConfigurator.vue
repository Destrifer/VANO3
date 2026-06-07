<script setup lang="ts">
// Диспетчер конфигуратора по стратегии продукта. Листовой и многостраничный —
// отдельные самодостаточные конфигураторы (каждый со своим состоянием и полями),
// общие компоненты (плашка/макет) делят контракт sharedKey. Слот «gallery»
// (статичная Astro-галерея) прокидывается внутрь выбранного конфигуратора.
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import SheetConfigurator from "./SheetConfigurator.vue";
import MultipageConfigurator from "./MultipageConfigurator.vue";

const props = defineProps<{
  product: ProductPricing;
  pricing: PricingData;
  name: string;
  slug: string;
}>();
const isMultipage = props.product.strategy === "multipage";
</script>

<template>
  <MultipageConfigurator v-if="isMultipage" v-bind="props">
    <template #gallery><slot name="gallery" /></template>
  </MultipageConfigurator>
  <SheetConfigurator v-else v-bind="props">
    <template #gallery><slot name="gallery" /></template>
  </SheetConfigurator>
</template>
