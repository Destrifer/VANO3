<script setup lang="ts">
// Резка наклеек: три варианта едиными плитками (OptionTile).
//   На листе   — печать без надсечки и вырубки, как есть на листе (без наценки);
//   С надсечкой — kiss-cut: прорезан только винил, подложку легко отделить (по умолчанию, без наценки);
//   Вырубка    — die-cut: рез насквозь по контуру, наклейки отделены от листа (+50% к резке).
// Картинки — глобальные (pricing_settings.cut_*_image); нет фото → глиф-фолбэк.
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import OptionTile from "./OptionTile.vue";

const calc = inject(calcKey)!;

// Глифы-фолбэки (viewBox 0 0 24 24), пока картинки не загружены:
// лист без реза / лист с пунктирным контуром (надсечка) / вырезанная фигура.
const CUT_GLYPH: Record<string, string> = {
  none: '<rect x="4" y="3" width="16" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>',
  kiss: '<rect x="4" y="3" width="16" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8" y="7" width="8" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>',
  die: '<path d="M12 3l2.2 2.2 3-.6-.6 3L18.8 12l-2.2 2.2.6 3-3-.6L12 18.8 9.8 16.6l-3 .6.6-3L5.2 12l2.2-2.2-.6-3 3 .6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
};
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Резка</span>
    <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Резка наклеек">
      <OptionTile
        v-for="c in calc.cutTypes"
        :key="c.id"
        :label="c.label"
        :sub="c.sub"
        :thumb="c.thumb"
        :glyph="CUT_GLYPH[c.id]"
        :active="calc.cutType === c.id"
        :title="`${c.label} — ${c.sub}`"
        @select="calc.cutType = c.id"
      />
    </div>
  </div>
</template>
