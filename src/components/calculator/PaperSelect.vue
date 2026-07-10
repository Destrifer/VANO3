<script setup lang="ts">
// Презентационный выбор материала: табы по категориям (Стандартные/Дизайнерские/
// Спец…) + сетка плиток-материалов (текстура + название) + палитра цвета снизу.
// Переиспускается: материал визитки, бумага обложки/блока брошюры.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import SwatchPalette from "./SwatchPalette.vue";
import OptionTile from "./OptionTile.vue";
import ImageLightbox from "./ImageLightbox.vue";
import type { ResponsiveImage } from "../../lib/directus";

// Глиф-фолбэк материала без фото (Tabler file).
const MAT_GLYPH =
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2"/></g>';

type Color = { name: string; code: string; hex: string | null; image: string | null; thumb: ResponsiveImage; full: ResponsiveImage };
type Option = { index: number; name: string; thumb: ResponsiveImage; full?: ResponsiveImage };
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

// Lightbox фото материала — паттерн CoatingField: лупа на плитке открывает
// полную картинку, клик по самой плитке — выбор.
const lightbox = ref<InstanceType<typeof ImageLightbox> | null>(null);

// Аффорданс прокрутки: пока снизу есть скрытые плитки — градиент-затухание у
// нижнего края (докрутил до конца или таб без переполнения — гаснет) + свой
// рисованный скроллбар. Нативный скрыт: Win11-браузеры (fluent overlay)
// рисуют его тонкой полоской и разворачивают только по ховеру, игнорируя
// кастомные ::-webkit-scrollbar-стили, — поэтому трек и тумб у нас свои
// div'ы. Пересчёт: скролл, смена таба, ресайз (плитки переносятся по-другому).
const listEl = ref<HTMLElement | null>(null);
const faded = ref(false);
const bar = ref({ visible: false, top: 0, h: 100 }); // top/h — % высоты трека
function updateScrollUi() {
  const el = listEl.value;
  if (!el) {
    faded.value = false;
    bar.value.visible = false;
    return;
  }
  const overflow = el.scrollHeight > el.clientHeight + 1;
  faded.value = overflow && el.scrollHeight - el.scrollTop - el.clientHeight > 4;
  bar.value = {
    visible: overflow,
    top: (el.scrollTop / el.scrollHeight) * 100,
    h: (el.clientHeight / el.scrollHeight) * 100,
  };
}
watch(activeOptions, () => nextTick(updateScrollUi));
let ro: ResizeObserver | null = null;
onMounted(() => {
  updateScrollUi();
  ro = new ResizeObserver(updateScrollUi);
  if (listEl.value) ro.observe(listEl.value);
});
onBeforeUnmount(() => ro?.disconnect());

// Перетаскивание тумба — как у нативного скроллбара.
function onThumbDown(e: PointerEvent) {
  const el = listEl.value;
  if (!el) return;
  e.preventDefault();
  const startY = e.clientY;
  const startTop = el.scrollTop;
  const ratio = el.scrollHeight / el.clientHeight;
  const move = (ev: PointerEvent) => { el.scrollTop = startTop + (ev.clientY - startY) * ratio; };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
// Клик по треку — прыжок (центрируем видимую область на точке клика).
function onTrackDown(e: PointerEvent) {
  const el = listEl.value;
  if (!el || e.target !== e.currentTarget) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  el.scrollTop = ((e.clientY - rect.top) / rect.height) * el.scrollHeight - el.clientHeight / 2;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-semibold">{{ label ?? "Материал" }}</span>

    <!-- Табы категорий -->
    <div v-if="groups.length > 1" role="tablist" class="tabs tabs-box w-fit flex-wrap">
      <button
        v-for="g in groups"
        :key="g.group"
        type="button"
        role="tab"
        :aria-selected="g.group === activeGroup"
        class="tab"
        :class="{ 'tab-active': g.group === activeGroup }"
        @click="activeGroup = g.group"
      >
        {{ g.group }}
      </button>
    </div>

    <!-- Плитки материалов (единый OptionTile, прокрутка при переполнении).
         Высота фиксирована — блоки ниже не «прыгают» при смене таба. Высота
         срезает третий ряд посередине + градиент-затухание, чтобы прокрутка
         была очевидна. -->
    <div class="mat-wrap" :class="{ 'mat-wrap--fade': faded }">
      <div
        ref="listEl"
        class="mat-list"
        :class="{ 'mat-list--fixed': groups.length > 1 }"
        role="radiogroup"
        :aria-label="label ?? 'Материал'"
        @scroll.passive="updateScrollUi"
      >
        <OptionTile
          v-for="o in activeOptions"
          :key="o.index"
          :label="o.name"
          :thumb="o.thumb"
          :glyph="MAT_GLYPH"
          :active="o.index === index"
          :zoom="!!o.full"
          @select="emit('update:index', o.index)"
          @zoom="lightbox?.open(o.name, o.full ?? null)"
        />
      </div>
      <div v-if="bar.visible" class="mat-bar" aria-hidden="true" @pointerdown="onTrackDown">
        <div
          class="mat-bar__thumb"
          :style="{ top: bar.top + '%', height: bar.h + '%' }"
          @pointerdown="onThumbDown"
        />
      </div>
    </div>

    <ImageLightbox ref="lightbox" />

    <!-- Палитра цвета — только если у материала РЕАЛЬНО есть выбор (>1 цвета).
         Один цвет = «цвет основы» материала (белая/прозрачная плёнка): он красит
         превью, но выбирать нечего → палитру не показываем (как у Coral Print). -->
    <template v-if="colors.length > 1">
      <span class="mt-1 text-sm font-semibold">
        Цвет материала:
        <span class="font-normal opacity-70">{{ colors[colorIndex]?.name }}</span>
      </span>
      <SwatchPalette
        :colors="colors"
        :modelValue="colorIndex"
        @update:modelValue="emit('update:colorIndex', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.mat-wrap { position: relative; }
/* Затухание у нижнего края, пока снизу есть скрытые плитки (класс ставит JS).
   Справа отступ — не накрывать скроллбар. */
.mat-wrap--fade::after {
  content: "";
  position: absolute;
  left: 0;
  right: 12px;
  bottom: 0;
  height: 3rem;
  background: linear-gradient(to bottom, transparent, var(--color-base-100, #fff));
  pointer-events: none;
}
.mat-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  /* По содержимому, но не выше ~2,5 рядов: третий ряд срезан посередине —
     видно, что список прокручивается. Без пустого места, когда материалов мало. */
  max-height: 19rem;
  overflow-y: auto;
  align-content: flex-start;
  padding-right: 1.1rem; /* место под собственный скроллбар */
  /* нативный скроллбар скрыт — вместо него .mat-bar */
  scrollbar-width: none;
}
.mat-list::-webkit-scrollbar { display: none; }
/* Собственный скроллбар: всегда одинаковый во всех браузерах, не зависит от
   fluent/overlay-режимов ОС. Геометрию тумба (top/height) считает JS. */
.mat-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 10px;
  border-radius: 9999px;
  background: var(--color-base-200, #f3f1ea);
}
.mat-bar__thumb {
  position: absolute;
  left: 0;
  right: 0;
  min-height: 1.5rem;
  border-radius: 9999px;
  background: var(--color-base-300, #d6d3cd);
  touch-action: none;
  transition: background 0.12s;
}
.mat-bar__thumb:hover,
.mat-bar__thumb:active {
  background: color-mix(in oklch, var(--color-base-content, #555) 35%, transparent);
}
/* С табами — постоянная высота, чтобы блоки ниже не «прыгали» при смене категории. */
.mat-list--fixed { height: 19rem; }
</style>
