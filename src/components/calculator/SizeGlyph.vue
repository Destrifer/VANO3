<script setup lang="ts">
// Иконка формы/формата для плиток выбора размера. Используем НАСТОЯЩИЕ иконки
// Tabler (тела из установленного @iconify-json/tabler, MIT) — те же, что и в
// .astro через astro-icon, но инлайн для Vue-острова. Какую иконку показать,
// решает глиф (см. glyphFor по геометрии в lib/calculator/sizeGlyph.ts).
import { computed } from "vue";
import type { Glyph } from "../../lib/calculator/sizeGlyph";

// Тела иконок Tabler (viewBox 0 0 24 24). Сопоставление глиф → иконка:
// портрет=rectangle-vertical, альбом=rectangle, квадрат=square-rounded,
// круг=circle, сложная=polygon, свой=dimensions (линейка-обмер).
const TABLER: Record<Glyph, string> = {
  portrait:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/>',
  landscape:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  square:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9s-9-1.8-9-9s1.8-9 9-9"/>',
  round:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0"/>',
  complex:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 5a2 2 0 1 0 4 0a2 2 0 1 0-4 0m7 3a2 2 0 1 0 4 0a2 2 0 1 0-4 0M3 11a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6.5 9.5l3.5-3m4-1L17 7m1.5 3L16 17m-2.5.5l-7-5"/>',
  custom:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h11m-2 2l2-2l-2-2M5 3L3 5l2 2m14 3v11m-2-2l2 2l2-2m0-7l-2-2l-2 2M3 12a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
};

const props = defineProps<{ kind: Glyph }>();
const body = computed(() => TABLER[props.kind]);
</script>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true" v-html="body" />
</template>
