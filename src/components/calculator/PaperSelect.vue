<script setup lang="ts">
// Презентационный выбор бумаги: сгруппированный select + палитра цвета.
// Переиспользуется: материал визитки, бумага обложки/блока брошюры.
import SwatchPalette from "./SwatchPalette.vue";

type Color = { name: string; code: string; hex: string | null; image: string | null };
type Group = { group: string; options: { index: number; name: string }[] };
defineProps<{
  label?: string;
  groups: Group[];
  index: number;
  colors: Color[];
  colorIndex: number;
}>();
const emit = defineEmits<{ "update:index": [v: number]; "update:colorIndex": [v: number] }>();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">{{ label ?? "Материал" }}</span>
    <div class="flex flex-wrap items-center gap-3">
      <select
        class="select max-w-xs"
        :value="index"
        @change="emit('update:index', +($event.target as HTMLSelectElement).value)"
      >
        <optgroup v-for="g in groups" :key="g.group" :label="g.group">
          <option v-for="o in g.options" :key="o.index" :value="o.index">{{ o.name }}</option>
        </optgroup>
      </select>
      <SwatchPalette
        v-if="colors.length"
        :colors="colors"
        :modelValue="colorIndex"
        @update:modelValue="emit('update:colorIndex', $event)"
      />
    </div>
  </div>
</template>
