<script setup lang="ts">
// Фальцовка (буклеты): выбор типа сложения плитками-иконками. Число сгибов
// определяет цену (per_fold-отделка) и показывается на плитке. Печать буклета
// всегда 4+4. Иконку сложения берём из Directus (FoldType.thumb, avif/webp);
// пока её нет — глиф-фолбэк Tabler по типу (книжная/гармошка/рулонная).
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";

const calc = inject(calcKey)!;
const foldWord = (n: number) => (n === 1 ? "сгиб" : n >= 2 && n <= 4 ? "сгиба" : "сгибов");

// Глифы-фолбэки (Tabler, viewBox 0 0 24 24): book / wave-sine / rotate-clockwise.
const FOLD_GLYPH: Record<string, string> = {
  book: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13m9-13v13m9-13v13"/>',
  accordion: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12h-2c-.894 0-1.662-.857-1.761-2c-.296-3.45-.749-6-2.749-6s-2.5 3.582-2.5 8s-.5 8-2.5 8s-2.452-2.547-2.749-6c-.1-1.147-.867-2-1.763-2h-2"/>',
  roll: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5"/>',
};
const glyphFor = (kind: string) => FOLD_GLYPH[kind] ?? FOLD_GLYPH.accordion;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Фальцовка</span>
    <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Фальцовка">
      <button
        v-for="(f, i) in calc.foldTypes"
        :key="i"
        type="button"
        role="radio"
        :aria-checked="calc.foldTypeIndex === i"
        :title="`${f.name} — ${f.folds} ${foldWord(f.folds)}`"
        class="fold-tile"
        :class="{ 'fold-tile--on': calc.foldTypeIndex === i }"
        @click="calc.foldTypeIndex = i"
      >
        <span class="fold-tile__thumb">
          <picture v-if="f.thumb">
            <source v-for="s in f.thumb.sources" :key="s.type" :type="s.type" :srcset="s.srcset" />
            <img :src="f.thumb.src" :alt="f.name" class="fold-tile__img" loading="lazy" decoding="async" fetchpriority="low" />
          </picture>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="fold-tile__glyph" v-html="glyphFor(f.kind)" />
        </span>
        <span class="fold-tile__name">{{ f.name }}</span>
        <span class="fold-tile__sub">{{ f.folds }} {{ foldWord(f.folds) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Единый вид плиток с размером/материалом/покрытием (.size-tile/.mat-tile/.coat-tile). */
.fold-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  width: 6.5rem;
  padding: 0.4rem;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: 0.75rem;
  background: var(--color-base-100, #fff);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.fold-tile:hover { border-color: var(--color-base-content, #555); }
.fold-tile--on {
  border-color: var(--color-primary, #1f1f1f);
  border-width: 2px;
  padding: calc(0.4rem - 1px);
  background: var(--color-base-200, #f3f1ea);
}
.fold-tile__thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  width: 100%;
  overflow: hidden;
  border-radius: 0.5rem;
  background-color: var(--color-base-200, #f3f1ea); /* placeholder, пока грузится */
}
.fold-tile__thumb picture { display: contents; }
.fold-tile__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fold-tile__glyph { width: 1.7rem; height: 1.7rem; opacity: 0.4; }
.fold-tile__name {
  font-size: 0.72rem;
  line-height: 1.1;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fold-tile__sub { font-size: 0.65rem; line-height: 1; opacity: 0.55; white-space: nowrap; }
</style>
