<script setup lang="ts">
// Стороны печати визитки = общий SidesSelect, привязанный к calc.
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import SidesSelect from "./SidesSelect.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <SidesSelect v-model="calc.sides" />
</template>
