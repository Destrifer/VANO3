<script setup lang="ts">
// Презентационное поле «покрытие»: ламинация (select) + фольгирование (тумблер +
// палитра цвета). Единое для всех калькуляторов (визитки, обложка брошюры…).
// Никакой бизнес-логики — только отображение и v-model наружу.
import SwatchPalette from "./SwatchPalette.vue";
import InfoTip from "../InfoTip.vue";
import { optionInfo } from "../../lib/optionInfo";

const lamInfo = optionInfo("Ламинация");
const foilInfo = optionInfo("Фольгирование");

type Color = { name: string; code: string; hex: string | null; image: string | null };
defineProps<{
  laminationOptions: { name: string }[];
  laminationIndex: number;
  laminationLocked: boolean;
  foilOption: { name: string; colors: Color[] } | null;
  foilOn: boolean;
  foilColorIndex: number;
}>();
const emit = defineEmits<{
  "update:laminationIndex": [v: number];
  "update:foilOn": [v: boolean];
  "update:foilColorIndex": [v: number];
}>();
</script>

<template>
  <!-- Ламинация -->
  <div class="flex flex-col gap-1.5" v-if="laminationOptions.length">
    <span class="text-sm font-semibold">
      Ламинация
      <InfoTip v-if="lamInfo" :text="lamInfo" />
    </span>
    <select
      class="select max-w-xs"
      :value="laminationIndex"
      :disabled="laminationLocked"
      @change="emit('update:laminationIndex', +($event.target as HTMLSelectElement).value)"
    >
      <option :value="-1">Без ламинации</option>
      <option v-for="(o, i) in laminationOptions" :key="i" :value="i">{{ o.name }}</option>
    </select>
    <span class="text-sm opacity-70 min-h-5" :class="{ invisible: !laminationLocked }">
      С фольгой ламинация фиксируется на Soft Touch.
    </span>
  </div>

  <!-- Фольгирование -->
  <div class="flex flex-col gap-1.5" v-if="foilOption">
    <span class="text-sm font-semibold">
      Фольгирование
      <InfoTip v-if="foilInfo" :text="foilInfo" />
    </span>
    <div class="flex min-h-12 flex-wrap items-center gap-3">
      <label class="inline-flex items-center gap-2">
        <input
          type="checkbox"
          class="toggle"
          :checked="foilOn"
          @change="emit('update:foilOn', ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ foilOption.name }}</span>
      </label>
      <SwatchPalette
        v-if="foilOn && foilOption.colors.length"
        :colors="foilOption.colors"
        :modelValue="foilColorIndex"
        @update:modelValue="emit('update:foilColorIndex', $event)"
      />
    </div>
  </div>
</template>
