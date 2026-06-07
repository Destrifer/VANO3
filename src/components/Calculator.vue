<script setup lang="ts">
// Колонка полей листового калькулятора. Состав полей зависит от продукта:
// односторонние (наклейки) скрывают выбор сторон; продукты с контурной резкой
// показывают её тумблер.
import { inject } from "vue";
import { calcKey } from "../composables/useCalculator";
import SizeField from "./calculator/SizeField.vue";
import QuantityField from "./calculator/QuantityField.vue";
import SidesField from "./calculator/SidesField.vue";
import MaterialField from "./calculator/MaterialField.vue";
import FinishingField from "./calculator/FinishingField.vue";
import CuttingField from "./calculator/CuttingField.vue";
import ArtworkUpload from "./calculator/ArtworkUpload.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <div class="flex flex-col gap-4">
    <SizeField />
    <QuantityField />
    <SidesField v-if="!calc.singleSided" />
    <MaterialField />
    <FinishingField />
    <CuttingField v-if="calc.allowContourCut" />
    <ArtworkUpload />
  </div>
</template>
