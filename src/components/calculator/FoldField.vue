<script setup lang="ts">
// Фальцовка (буклеты) / биговка (чертежи и др.): выбор плитками (OptionTile). Число
// сгибов определяет цену (per_fold) и показывается на плитке. Печать всегда 4+4.
// Иконку берём из Directus (FoldType.thumb, avif/webp); нет фото — глиф Tabler.
// Если ВСЕ варианты продукта имеют kind:"crease" — блок называется «Биговка»
// (плитки «Без биговки / 1 / 2 / … сгиба»), иначе классическая «Фальцовка».
import { computed, inject, ref } from "vue";
import { calcKey } from "../../composables/useCalculator";
import OptionTile from "./OptionTile.vue";
import ImageLightbox from "./ImageLightbox.vue";

const calc = inject(calcKey)!;
const foldWord = (n: number) => (n === 1 ? "сгиб" : n >= 2 && n <= 4 ? "сгиба" : "сгибов");
const heading = computed(() =>
  calc.foldTypes.length && calc.foldTypes.every((f) => f.kind === "crease")
    ? "Биговка"
    : "Фальцовка",
);
// «1 сгиб» под плиткой «1 сгиб» — шум; сабтайтл только когда имя про другое.
const subFor = (f: { name: string; folds: number }) =>
  f.name.toLowerCase().includes("сгиб") ? undefined : `${f.folds} ${foldWord(f.folds)}`;
// Lightbox фото сгиба — паттерн PaperSelect/CoatingField (тач); десктопное
// ховер-превью делает сама OptionTile через full.
const lightbox = ref<InstanceType<typeof ImageLightbox> | null>(null);

// Глифы-фолбэки (Tabler): book / wave-sine / rotate-clockwise.
const FOLD_GLYPH: Record<string, string> = {
  book: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13m9-13v13m9-13v13"/>',
  accordion: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12h-2c-.894 0-1.662-.857-1.761-2c-.296-3.45-.749-6-2.749-6s-2.5 3.582-2.5 8s-.5 8-2.5 8s-2.452-2.547-2.749-6c-.1-1.147-.867-2-1.763-2h-2"/>',
  roll: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5"/>',
  crease:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5h16v14H4z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" stroke-dasharray="1 4" d="M12 6v12"/>',
};
const glyphFor = (kind: string) => FOLD_GLYPH[kind] ?? FOLD_GLYPH.accordion;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">{{ heading }}</span>
    <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="heading">
      <OptionTile
        v-for="(f, i) in calc.foldTypes"
        :key="i"
        :label="f.name"
        :sub="subFor(f)"
        :thumb="f.thumb"
        :glyph="glyphFor(f.kind)"
        :zoom="!!f.full"
        :full="f.full"
        :active="calc.foldTypeIndex === i"
        :title="`${f.name} — ${f.folds} ${foldWord(f.folds)}`"
        @select="calc.foldTypeIndex = i"
        @zoom="lightbox?.open(f.name, f.full ?? null)"
      />
    </div>
    <ImageLightbox ref="lightbox" />
  </div>
</template>
