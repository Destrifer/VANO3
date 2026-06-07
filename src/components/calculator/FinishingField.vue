<script setup lang="ts">
// Постпечать визитки: общий CoatingField (ламинация+фольга) + доп. обработка.
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import CoatingField from "./CoatingField.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <CoatingField
    :lamination-options="calc.laminationOptions"
    v-model:laminationIndex="calc.laminationIndex"
    :lamination-locked="calc.laminationLocked"
    :foil-option="calc.foilOption"
    v-model:foilOn="calc.foilOn"
    v-model:foilColorIndex="calc.foilColorIndex"
  />

  <!-- Дополнительная обработка (доступна только в листовой стратегии) -->
  <div class="flex flex-col gap-1.5" v-if="calc.otherOptions.length">
    <span class="text-sm font-semibold">Дополнительная обработка</span>
    <label v-for="{ o, i } in calc.otherOptions" :key="i" class="inline-flex items-center gap-2">
      <input type="checkbox" class="toggle" v-model="calc.fin[i].checked" />
      <span>{{ o.name }}</span>
      <input
        v-if="calc.fin[i].checked && calc.needsCount(o.unit)"
        type="number" class="input input-xs w-20"
        v-model.number="calc.fin[i].count" min="1"
        :title="calc.countLabel[o.unit]"
      />
      <span v-if="calc.fin[i].checked && calc.needsCount(o.unit)" class="text-sm opacity-70">{{ calc.countLabel[o.unit] }}</span>
    </label>
  </div>
</template>
