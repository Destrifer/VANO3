<script setup lang="ts">
// Колонка полей калькулятора. Состояние приходит из родителя (ProductConfigurator)
// через inject в каждом поле — здесь только компоновка блоков.
import SizeField from "./calculator/SizeField.vue";
import QuantityField from "./calculator/QuantityField.vue";
import SidesField from "./calculator/SidesField.vue";
import MaterialField from "./calculator/MaterialField.vue";
import FinishingField from "./calculator/FinishingField.vue";
</script>

<template>
  <div class="flex flex-col gap-4">
    <SizeField />
    <QuantityField />
    <SidesField />
    <MaterialField />
    <FinishingField />
  </div>
</template>
