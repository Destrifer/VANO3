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
// нижнего края (докрутил до конца или таб без переполнения — гаснет).
// Пересчёт: скролл, смена таба, ресайз (плитки переносятся по-другому).
const listEl = ref<HTMLElement | null>(null);
const faded = ref(false);
function updateFade() {
  const el = listEl.value;
  faded.value = !!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4;
}
watch(activeOptions, () => nextTick(updateFade));
let ro: ResizeObserver | null = null;
onMounted(() => {
  updateFade();
  ro = new ResizeObserver(updateFade);
  if (listEl.value) ro.observe(listEl.value);
});
onBeforeUnmount(() => ro?.disconnect());
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
        @scroll.passive="updateFade"
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
    </div>

    <ImageLightbox ref="lightbox" />

    <!-- Цвет выбранного материала: имя выбранного — в заголовке (тултипов
         на тачах нет, а свотч сам по себе имя не сообщает) -->
    <template v-if="colors.length">
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
  padding-right: 0.25rem;
  /* daisyUI ставит scrollbar-color на :root, свойство наследуется, а Chrome
     121+ при непустом scrollbar-color игнорирует ::-webkit-scrollbar-стили.
     Сбрасываем, чтобы кастомный скроллбар ниже заработал (Firefox — @supports). */
  scrollbar-color: auto;
}
/* Заметный постоянный скроллбар: круглый тумб + видимый жёлоб. */
.mat-list::-webkit-scrollbar { width: 10px; }
.mat-list::-webkit-scrollbar-track {
  background: var(--color-base-200, #f3f1ea);
  border-radius: 9999px;
}
.mat-list::-webkit-scrollbar-thumb {
  background: var(--color-base-300, #d6d3cd);
  border-radius: 9999px;
}
.mat-list::-webkit-scrollbar-thumb:hover {
  background: color-mix(in oklch, var(--color-base-content, #555) 35%, transparent);
}
/* Firefox не знает ::-webkit-scrollbar — ему стандартные свойства */
@supports not selector(::-webkit-scrollbar) {
  .mat-list {
    scrollbar-width: thin;
    scrollbar-color: var(--color-base-300, #d6d3cd) var(--color-base-200, #f3f1ea);
  }
}
/* С табами — постоянная высота, чтобы блоки ниже не «прыгали» при смене категории. */
.mat-list--fixed { height: 19rem; }
</style>
