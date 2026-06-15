<script setup lang="ts">
// Диспетчер конфигуратора по стратегии продукта. Листовой и многостраничный —
// отдельные самодостаточные конфигураторы (каждый со своим состоянием и полями),
// общие компоненты (плашка/макет) делят контракт sharedKey. Слот «gallery»
// (статичная Astro-галерея) прокидывается внутрь выбранного конфигуратора.
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import type { CalcPreset } from "../composables/calcUrlState";
import SheetConfigurator from "./SheetConfigurator.vue";
import MultipageConfigurator from "./MultipageConfigurator.vue";

const props = defineProps<{
  product: ProductPricing;
  pricing: PricingData;
  name: string;
  slug: string;
  preset?: CalcPreset; // предустановка для кластерной/pSEO-страницы (только листовой)
}>();
const isMultipage = props.product.strategy === "multipage";
</script>

<template>
  <MultipageConfigurator
    v-if="isMultipage"
    :product="props.product"
    :pricing="props.pricing"
    :name="props.name"
    :slug="props.slug"
    :preset="props.preset"
  >
    <template #gallery><slot name="gallery" /></template>
  </MultipageConfigurator>
  <SheetConfigurator
    v-else
    :product="props.product"
    :pricing="props.pricing"
    :name="props.name"
    :slug="props.slug"
    :preset="props.preset"
  >
    <template #gallery><slot name="gallery" /></template>
  </SheetConfigurator>
</template>
