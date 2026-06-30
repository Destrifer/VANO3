<script setup lang="ts">
// Фальцовка (буклеты): выбор типа сложения едиными плитками (OptionTile). Число
// сгибов определяет цену (per_fold) и показывается на плитке. Печать всегда 4+4.
// Иконку берём из Directus (FoldType.thumb, avif/webp); нет фото — глиф Tabler.
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import OptionTile from "./OptionTile.vue";

const calc = inject(calcKey)!;
const foldWord = (n: number) => (n === 1 ? "сгиб" : n >= 2 && n <= 4 ? "сгиба" : "сгибов");

// Глифы-фолбэки (Tabler): book / wave-sine / rotate-clockwise.
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
      <OptionTile
        v-for="(f, i) in calc.foldTypes"
        :key="i"
        :label="f.name"
        :sub="`${f.folds} ${foldWord(f.folds)}`"
        :thumb="f.thumb"
        :glyph="glyphFor(f.kind)"
        :active="calc.foldTypeIndex === i"
        :title="`${f.name} — ${f.folds} ${foldWord(f.folds)}`"
        @select="calc.foldTypeIndex = i"
      />
    </div>
  </div>
</template>
