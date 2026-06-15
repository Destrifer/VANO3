<script setup lang="ts">
// Презентационный выбор бумаги: сгруппированный select + палитра цвета.
// Переиспользуется: материал визитки, бумага обложки/блока брошюры.
import { computed } from "vue";
import SwatchPalette from "./SwatchPalette.vue";

type Color = { name: string; code: string; hex: string | null; image: string | null };
type Group = { group: string; options: { index: number; name: string }[] };
const props = defineProps<{
  label?: string;
  groups: Group[];
  index: number;
  colors: Color[];
  colorIndex: number;
}>();
const emit = defineEmits<{ "update:index": [v: number]; "update:colorIndex": [v: number] }>();
// v-model (а не :value/@change): Vue синхронизирует <select> при гидрации, иначе
// серверный пресет paperIndex терялся после гидрации острова.
const model = computed({
  get: () => props.index,
  set: (v: number) => emit("update:index", v),
});
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">{{ label ?? "Материал" }}</span>
    <div class="flex flex-wrap items-center gap-3">
      <select class="select max-w-xs" v-model.number="model">
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
