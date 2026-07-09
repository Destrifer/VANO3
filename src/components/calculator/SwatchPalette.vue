<script setup lang="ts">
// Палитра цветов материала: сетка квадратных свотчей (radiogroup). Выбранный —
// кольцо киноварью с зазором цвета фона (видно и на чёрном, и на белом) +
// галочка с автоконтрастом по яркости hex. Имя выбранного цвета показывает
// родитель (PaperSelect) в заголовке блока. Фото-свотч (дизайнерские бумаги):
// лупа в углу открывает общий ImageLightbox; hex-свотчам лупа не нужна.
// Бывший dropdown-режим удалён — фольга давно на плитках OptionTile.
import { ref } from "vue";
import ImageLightbox from "./ImageLightbox.vue";
import type { ResponsiveImage } from "../../lib/directus";

type Swatch = {
  name: string;
  code: string;
  hex: string | null;
  image: string | null;
  thumb: ResponsiveImage;
  full: ResponsiveImage;
};

defineProps<{ colors: Swatch[]; modelValue: number; label?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: number] }>();

// Галочка выбранного свотча: тёмная на светлых цветах, белая на тёмных.
// Порог по воспринимаемой яркости hex; фото-свотч без надёжного hex считаем
// тёмным — белая галочка с тенью читается на любой текстуре.
function isLight(hex: string | null): boolean {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

const lightbox = ref<InstanceType<typeof ImageLightbox> | null>(null);
</script>

<template>
  <div class="swatches" role="radiogroup" :aria-label="label ?? 'Цвет материала'">
    <button
      v-for="(c, i) in colors"
      :key="i"
      type="button"
      role="radio"
      :aria-checked="i === modelValue"
      class="swatch"
      :class="{ 'swatch--on': i === modelValue }"
      :style="c.thumb ? '' : `background:${c.hex ?? '#ccc'}`"
      :title="c.name + (c.code ? ' · ' + c.code : '')"
      @click="emit('update:modelValue', i)"
    >
      <picture v-if="c.thumb" class="swatch__img">
        <source v-for="s in c.thumb.sources" :key="s.type" :type="s.type" :srcset="s.srcset" />
        <img :src="c.thumb.src" :alt="c.name" loading="lazy" decoding="async" />
      </picture>
      <svg
        v-if="i === modelValue"
        class="swatch__check"
        :class="isLight(c.hex) && !c.thumb ? 'swatch__check--dark' : 'swatch__check--lite'"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      ><polyline points="5 13 10 18 19 7" /></svg>
      <span
        v-if="c.full"
        role="button"
        tabindex="0"
        aria-label="Увеличить"
        class="swatch__zoom"
        @click.stop="lightbox?.open(c.name, c.full)"
        @keydown.enter.stop.prevent="lightbox?.open(c.name, c.full)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      </span>
    </button>

    <ImageLightbox ref="lightbox" />
  </div>
</template>

<style scoped>
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  max-height: 11rem;
  overflow-y: auto;
  /* запас под кольцо выделения (2px зазор + 2px киноварь), иначе обрежется */
  padding: 4px;
}
.swatch {
  position: relative;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  overflow: hidden;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: box-shadow 0.12s;
}
.swatch--on {
  box-shadow:
    0 0 0 2px var(--color-base-100, #fff),
    0 0 0 4px var(--color-accent-ink);
}
.swatch__img { display: contents; }
.swatch__img img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.swatch__check {
  position: relative;
  width: 1.15rem;
  height: 1.15rem;
}
.swatch__check--dark { color: rgba(0, 0, 0, 0.75); }
.swatch__check--lite {
  color: #fff;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.55));
}
.swatch__zoom {
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  place-items: center;
  width: 1.15rem;
  height: 1.15rem;
  border: 1px solid var(--color-base-content, #555);
  border-radius: 9999px;
  background: var(--color-base-100, #fff);
}
</style>
