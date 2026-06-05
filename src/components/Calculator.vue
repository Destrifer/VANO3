<script setup lang="ts">
// Тонкий оркестратор: создаёт состояние калькулятора, раздаёт его полям
// через provide/inject и раскладывает блоки. Вся логика — в useCalculator.
import { provide } from "vue";
import type { PricingData } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import { useCalculator, calcKey } from "../composables/useCalculator";
import SizeField from "./calculator/SizeField.vue";
import QuantityField from "./calculator/QuantityField.vue";
import SidesField from "./calculator/SidesField.vue";
import MaterialField from "./calculator/MaterialField.vue";
import FinishingField from "./calculator/FinishingField.vue";
import SummaryCard from "./calculator/SummaryCard.vue";

const props = defineProps<{ product: ProductPricing; pricing: PricingData }>();
provide(calcKey, useCalculator(props));
</script>

<template>
  <div class="grid gap-8 my-6 md:grid-cols-[1.4fr_1fr] md:items-start">
    <div class="flex flex-col gap-4">
      <SizeField />
      <QuantityField />
      <SidesField />
      <MaterialField />
      <FinishingField />
    </div>
    <SummaryCard />
  </div>
</template>
