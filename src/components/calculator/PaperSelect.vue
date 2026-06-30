<script setup lang="ts">
// Презентационный выбор материала: табы по категориям (Стандартные/Дизайнерские/
// Спец…) + сетка плиток-материалов (текстура + название) + палитра цвета снизу.
// Переиспускается: материал визитки, бумага обложки/блока брошюры.
import { computed, ref, watch } from "vue";
import SwatchPalette from "./SwatchPalette.vue";
import OptionTile from "./OptionTile.vue";
import type { ResponsiveImage } from "../../lib/directus";

// Глиф-фолбэк материала без фото (Tabler file).
const MAT_GLYPH =
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2"/></g>';

type Color = { name: string; code: string; hex: string | null; image: string | null; thumb: ResponsiveImage; full: ResponsiveImage };
type Option = { index: number; name: string; thumb: ResponsiveImage };
type Group = { group: string; options: Option[] };
const props = defineProps<{
  label?: string;
  groups: Group[];
  index: number;
  colors: Color[];
  colorIndex: number;
}>();
const emit = defineEmits<{ "update:index": [v: number]; "update:colorIndex": [v: number] }>();

// Активная вкладка = категория выбранного материала. Следим за внешним index
// (серверный пресет paperIndex / смена продукта), чтобы вкладка не «отвязалась».
const groupOf = (idx: number) =>
  props.groups.find((g) => g.options.some((o) => o.index === idx))?.group ?? null;
const activeGroup = ref<string | null>(groupOf(props.index) ?? props.groups[0]?.group ?? null);
watch(
  () => props.index,
  (i) => { const g = groupOf(i); if (g) activeGroup.value = g; },
);
// Если набор групп сменился (другой продукт) и активной больше нет — сбрасываем.
watch(
  () => props.groups,
  (gs) => { if (!gs.some((g) => g.group === activeGroup.value)) activeGroup.value = gs[0]?.group ?? null; },
);

const activeOptions = computed(
  () => props.groups.find((g) => g.group === activeGroup.value)?.options ?? [],
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-semibold">{{ label ?? "Материал" }}</span>

    <!-- Табы категорий -->
    <div v-if="groups.length > 1" role="tablist" class="flex flex-wrap gap-1">
      <button
        v-for="g in groups"
        :key="g.group"
        type="button"
        role="tab"
        :aria-selected="g.group === activeGroup"
        class="mat-tab"
        :class="{ 'mat-tab--on': g.group === activeGroup }"
        @click="activeGroup = g.group"
      >
        {{ g.group }}
      </button>
    </div>

    <!-- Плитки материалов (единый OptionTile, прокрутка при переполнении).
         Высота фиксирована — блоки ниже не «прыгают» при смене таба. -->
    <div
      class="mat-list"
      :class="{ 'mat-list--fixed': groups.length > 1 }"
      role="radiogroup"
      :aria-label="label ?? 'Материал'"
    >
      <OptionTile
        v-for="o in activeOptions"
        :key="o.index"
        :label="o.name"
        :thumb="o.thumb"
        :glyph="MAT_GLYPH"
        :active="o.index === index"
        @select="emit('update:index', o.index)"
      />
    </div>

    <!-- Цвет выбранного материала -->
    <template v-if="colors.length">
      <span class="mt-1 text-sm font-semibold">Цвет материала</span>
      <SwatchPalette
        inline
        :colors="colors"
        :modelValue="colorIndex"
        @update:modelValue="emit('update:colorIndex', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.mat-tab {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 999px;
  border: 1px solid var(--color-base-300, #d6d3cd);
  background: var(--color-base-100, #fff);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.mat-tab:hover { border-color: var(--color-base-content, #555); }
.mat-tab--on {
  border-color: var(--color-primary, #1f1f1f);
  background: var(--color-primary, #1f1f1f);
  color: var(--color-primary-content, #fff);
}

.mat-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  /* По содержимому, но не выше ~2 рядов (дальше прокрутка) — без пустого места,
     когда материалов мало. */
  max-height: 15.5rem;
  overflow-y: auto;
  align-content: flex-start;
  padding-right: 0.25rem;
}
/* С табами — постоянная высота, чтобы блоки ниже не «прыгали» при смене категории. */
.mat-list--fixed { height: 15.5rem; }
</style>
