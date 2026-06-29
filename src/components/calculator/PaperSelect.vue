<script setup lang="ts">
// Презентационный выбор материала: табы по категориям (Стандартные/Дизайнерские/
// Спец…) + сетка плиток-материалов (текстура + название) + палитра цвета снизу.
// Переиспускается: материал визитки, бумага обложки/блока брошюры.
import { computed, ref, watch } from "vue";
import SwatchPalette from "./SwatchPalette.vue";
import type { ResponsiveImage } from "../../lib/directus";

type Color = { name: string; code: string; hex: string | null; image: string | null };
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

    <!-- Сетка плиток-материалов (3 в ряд, прокрутка при переполнении) -->
    <div class="mat-grid" role="radiogroup" :aria-label="label ?? 'Материал'">
      <button
        v-for="o in activeOptions"
        :key="o.index"
        type="button"
        role="radio"
        :aria-checked="o.index === index"
        :title="o.name"
        class="mat-tile"
        :class="{ 'mat-tile--on': o.index === index }"
        @click="emit('update:index', o.index)"
      >
        <span class="mat-tile__thumb">
          <!-- Адаптивная миниатюра: <picture> avif/webp + fallback. Бокс держит
               место (aspect-ratio) — нет CLS, даже если Directus отдаёт медленно;
               lazy/async/low — не мешает LCP. -->
          <picture v-if="o.thumb">
            <source v-for="s in o.thumb.sources" :key="s.type" :type="s.type" :srcset="s.srcset" />
            <img
              :src="o.thumb.src"
              :width="o.thumb.width"
              :height="o.thumb.height"
              :alt="o.name"
              class="mat-tile__img"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
            />
          </picture>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="mat-tile__glyph">
            <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2" />
            </g>
          </svg>
        </span>
        <span class="mat-tile__name">{{ o.name }}</span>
      </button>
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

.mat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: min-content;
  gap: 0.5rem;
  /* Постоянная высота (≈2 ряда) во всех табах: меньше материалов — остаётся
     пустое место, больше — прокрутка. Так блоки ниже не «прыгают». */
  height: 14.5rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}
.mat-tile {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.4rem;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: 0.75rem;
  background: var(--color-base-100, #fff);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s, background 0.12s;
}
.mat-tile:hover { border-color: var(--color-base-content, #555); }
.mat-tile--on {
  border-color: var(--color-primary, #1f1f1f);
  border-width: 2px;
  padding: calc(0.4rem - 1px);
  background: var(--color-base-200, #f3f1ea);
}
.mat-tile__thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  width: 100%;
  overflow: hidden;
  border-radius: 0.5rem;
  background-color: var(--color-base-200, #f3f1ea); /* placeholder, пока грузится */
}
.mat-tile__thumb picture { display: contents; }
.mat-tile__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.mat-tile__glyph { width: 1.8rem; height: 1.8rem; opacity: 0.35; }
.mat-tile__name {
  font-size: 0.72rem;
  line-height: 1.1;
  /* до 2 строк названия */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
