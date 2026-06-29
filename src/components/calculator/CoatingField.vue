<script setup lang="ts">
// Презентационное поле «покрытие»: ламинация + фольгирование — оба плитками
// (.coat-tile): «без» + варианты с миниатюрой (avif/webp) или глифом/цветом.
// Единое для всех калькуляторов (визитки, обложка брошюры…). Без бизнес-логики —
// только отображение и v-model наружу.
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
        class="coat-tile"
        :class="{ 'coat-tile--on': laminationIndex === -1 }"
        @click="emit('update:laminationIndex', -1)"
      >
        <span class="coat-tile__thumb">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="coat-tile__glyph" v-html="GLYPH_NONE" />
        </span>
        <span class="coat-tile__name">Без ламинации</span>
      </button>

      <button
        v-for="(o, i) in laminationOptions"
        :key="i"
        type="button"
        role="radio"
        :aria-checked="laminationIndex === i"
        :disabled="laminationLocked"
        :title="o.name"
        class="coat-tile"
        :class="{ 'coat-tile--on': laminationIndex === i }"
        @click="emit('update:laminationIndex', i)"
      >
        <span class="coat-tile__thumb">
          <picture v-if="o.thumb">
            <source v-for="s in o.thumb.sources" :key="s.type" :type="s.type" :srcset="s.srcset" />
            <img :src="o.thumb.src" :alt="o.name" class="coat-tile__img" loading="lazy" decoding="async" fetchpriority="low" />
          </picture>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="coat-tile__glyph" v-html="GLYPH_LAM" />
        </span>
        <span class="coat-tile__name">{{ o.name }}</span>
      </button>
    </div>
    <span class="text-sm opacity-70 min-h-5" :class="{ invisible: !laminationLocked }">
      С фольгой ламинация фиксируется на Soft Touch.
    </span>
  </div>

  <!-- Фольгирование: «Без фольги» + плитки цветов (картинка-текстура фольги) -->
  <div class="flex flex-col gap-1.5" v-if="foilOption">
    <span class="text-sm font-semibold">
      Фольгирование
      <InfoTip v-if="foilInfo" :text="foilInfo" />
    </span>
    <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Фольгирование">
      <!-- Без фольги -->
      <button
        type="button"
        role="radio"
        :aria-checked="!foilOn"
        title="Без фольги"
        class="coat-tile"
        :class="{ 'coat-tile--on': !foilOn }"
        @click="emit('update:foilOn', false)"
      >
        <span class="coat-tile__thumb">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="coat-tile__glyph" v-html="GLYPH_NONE" />
        </span>
        <span class="coat-tile__name">Без фольги</span>
      </button>

      <button
        v-for="(c, i) in foilOption.colors"
        :key="i"
        type="button"
        role="radio"
        :aria-checked="foilOn && foilColorIndex === i"
        :title="c.name + (c.code ? ' · ' + c.code : '')"
        class="coat-tile"
        :class="{ 'coat-tile--on': foilOn && foilColorIndex === i }"
        @click="emit('update:foilColorIndex', i); emit('update:foilOn', true)"
      >
        <span class="coat-tile__thumb" :style="c.thumb ? '' : `background:${c.hex ?? '#ccc'}`">
          <picture v-if="c.thumb">
            <source v-for="s in c.thumb.sources" :key="s.type" :type="s.type" :srcset="s.srcset" />
            <img :src="c.thumb.src" :alt="c.name" class="coat-tile__img" loading="lazy" decoding="async" fetchpriority="low" />
          </picture>
        </span>
        <span class="coat-tile__name">{{ c.name }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Плитки ламинации — единый вид с размером/материалом (.size-tile/.mat-tile). */
.coat-tile {
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
.coat-tile:hover { border-color: var(--color-base-content, #555); }
.coat-tile--on {
  border-color: var(--color-primary, #1f1f1f);
  border-width: 2px;
  padding: calc(0.4rem - 1px);
  background: var(--color-base-200, #f3f1ea);
}
.coat-tile__thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  width: 100%;
  overflow: hidden;
  border-radius: 0.5rem;
  background-color: var(--color-base-200, #f3f1ea); /* placeholder, пока грузится */
}
.coat-tile__thumb picture { display: contents; }
.coat-tile__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.coat-tile__glyph { width: 1.6rem; height: 1.6rem; opacity: 0.4; }
.coat-tile__name {
  font-size: 0.72rem;
  line-height: 1.1;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
