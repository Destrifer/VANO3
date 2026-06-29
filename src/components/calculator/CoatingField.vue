<script setup lang="ts">
// Презентационное поле «покрытие»: ламинация (select) + фольгирование (тумблер +
// палитра цвета). Единое для всех калькуляторов (визитки, обложка брошюры…).
// Никакой бизнес-логики — только отображение и v-model наружу.
import SwatchPalette from "./SwatchPalette.vue";
import InfoTip from "../InfoTip.vue";
import { optionInfo } from "../../lib/optionInfo";
import type { ResponsiveImage } from "../../lib/directus";

const lamInfo = optionInfo("Ламинация");
const foilInfo = optionInfo("Фольгирование");

// Глифы-фолбэки для плиток ламинации (Tabler, viewBox 0 0 24 24): «без» —
// circle-off, опция без своего фото — sparkles (блеск/покрытие).
const GLYPH_NONE =
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.042 16.045A9 9 0 0 0 7.955 3.958M5.637 5.635a9 9 0 1 0 12.725 12.73M3 3l18 18"/>';
const GLYPH_LAM =
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2m0-12a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2M9 18a6 6 0 0 1 6-6a6 6 0 0 1-6-6a6 6 0 0 1-6 6a6 6 0 0 1 6 6"/>';

type Color = { name: string; code: string; hex: string | null; image: string | null; thumb: ResponsiveImage; full: ResponsiveImage };
defineProps<{
  laminationOptions: { name: string; thumb: ResponsiveImage }[];
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
    <div
      class="flex flex-wrap gap-2"
      :class="{ 'pointer-events-none opacity-50': laminationLocked }"
      role="radiogroup"
      aria-label="Ламинация"
    >
      <!-- Без ламинации (индекс -1) -->
      <button
        type="button"
        role="radio"
        :aria-checked="laminationIndex === -1"
        :disabled="laminationLocked"
        title="Без ламинации"
        class="lam-tile"
        :class="{ 'lam-tile--on': laminationIndex === -1 }"
        @click="emit('update:laminationIndex', -1)"
      >
        <span class="lam-tile__thumb">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="lam-tile__glyph" v-html="GLYPH_NONE" />
        </span>
        <span class="lam-tile__name">Без ламинации</span>
      </button>

      <button
        v-for="(o, i) in laminationOptions"
        :key="i"
        type="button"
        role="radio"
        :aria-checked="laminationIndex === i"
        :disabled="laminationLocked"
        :title="o.name"
        class="lam-tile"
        :class="{ 'lam-tile--on': laminationIndex === i }"
        @click="emit('update:laminationIndex', i)"
      >
        <span class="lam-tile__thumb">
          <picture v-if="o.thumb">
            <source v-for="s in o.thumb.sources" :key="s.type" :type="s.type" :srcset="s.srcset" />
            <img :src="o.thumb.src" :alt="o.name" class="lam-tile__img" loading="lazy" decoding="async" fetchpriority="low" />
          </picture>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="lam-tile__glyph" v-html="GLYPH_LAM" />
        </span>
        <span class="lam-tile__name">{{ o.name }}</span>
      </button>
    </div>
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

<style scoped>
/* Плитки ламинации — единый вид с размером/материалом (.size-tile/.mat-tile). */
.lam-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  width: 6rem;
  padding: 0.4rem;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: 0.75rem;
  background: var(--color-base-100, #fff);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.lam-tile:hover { border-color: var(--color-base-content, #555); }
.lam-tile--on {
  border-color: var(--color-primary, #1f1f1f);
  border-width: 2px;
  padding: calc(0.4rem - 1px);
  background: var(--color-base-200, #f3f1ea);
}
.lam-tile__thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  width: 100%;
  overflow: hidden;
  border-radius: 0.5rem;
  background-color: var(--color-base-200, #f3f1ea); /* placeholder, пока грузится */
}
.lam-tile__thumb picture { display: contents; }
.lam-tile__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lam-tile__glyph { width: 1.6rem; height: 1.6rem; opacity: 0.4; }
.lam-tile__name {
  font-size: 0.72rem;
  line-height: 1.1;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
