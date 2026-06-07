<script setup lang="ts">
// Материал визитки = общий PaperSelect, привязанный к calc (визиток).
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import PaperSelect from "./PaperSelect.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <PaperSelect
    :groups="calc.paperGroups"
    v-model:index="calc.paperIndex"
    :colors="calc.colors"
    v-model:colorIndex="calc.selectedColorIndex"
  />
</template>
