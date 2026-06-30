<script setup lang="ts">
// Выбор размера/формы листовой продукции — ряд плиток-иконок (размеры + формы
// в одном ряду). Логику плиток считает useCalculator (sizeTiles/activeTileId/
// sizeInput/selectTile), здесь — только подключение к стейту через inject.
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import SizePicker from "./SizePicker.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <SizePicker
    :tiles="calc.sizeTiles"
    :active-id="calc.activeTileId"
    :input="calc.sizeInput"
    v-model:customW="calc.customW"
    v-model:customH="calc.customH"
    v-model:diameter="calc.diameter"
    @select="calc.selectTile"
  >
    <template #hint>
      <span class="block text-xs text-error min-h-8 leading-4" :class="{ invisible: !calc.sizeWarning }">
        {{ calc.sizeWarning || "‎" }}
      </span>
    </template>
  </SizePicker>
</template>
