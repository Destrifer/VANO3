<script setup lang="ts">
// Презентационное поле «покрытие»: ламинация + фольгирование — оба едиными
// плитками (OptionTile) с миниатюрой (avif/webp) / глифом / цвет-заливкой.
// Услуга включается выбором плитки и выключается повторным кликом по ней же —
// отдельных плиток «Без ламинации»/«Без фольги» нет. Единое для всех
// калькуляторов. Без бизнес-логики — только отображение и v-model наружу.
import { ref } from "vue";
import InfoTip from "../InfoTip.vue";
import OptionTile from "./OptionTile.vue";
import ImageLightbox from "./ImageLightbox.vue";
import { optionInfo } from "../../lib/optionInfo";
import type { ResponsiveImage } from "../../lib/directus";

const lamInfo = optionInfo("Ламинация");
const foilInfo = optionInfo("Фольгирование");

// Глиф-фолбэк ламинации без фото (Tabler sparkles).
const GLYPH_LAM =
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2m0-12a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2M9 18a6 6 0 0 1 6-6a6 6 0 0 1-6-6a6 6 0 0 1-6 6a6 6 0 0 1 6 6"/>';

type Color = { name: string; code: string; hex: string | null; image: string | null; thumb: ResponsiveImage; tile: ResponsiveImage; full: ResponsiveImage };
defineProps<{
  laminationOptions: { name: string; thumb: ResponsiveImage; full?: ResponsiveImage }[];
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

// Lightbox фото (фольга/ламинация) — общий ImageLightbox: лупа на плитке
// открывает полную картинку, клик по самой плитке — выбор.
const lightbox = ref<InstanceType<typeof ImageLightbox> | null>(null);
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
      role="group"
      aria-label="Ламинация"
    >
      <OptionTile
        v-for="(o, i) in laminationOptions"
        :key="i"
        multi
        :label="o.name"
        :thumb="o.thumb"
        :glyph="GLYPH_LAM"
        :active="laminationIndex === i"
        :disabled="laminationLocked"
        :zoom="!!o.full"
        :full="o.full"
        @select="emit('update:laminationIndex', laminationIndex === i ? -1 : i)"
        @zoom="lightbox?.open(o.name, o.full ?? null)"
      />
    </div>
    <span class="text-sm opacity-70 min-h-5" :class="{ invisible: !laminationLocked }">
      С фольгой ламинация фиксируется на Soft Touch.
    </span>
  </div>

  <!-- Фольгирование: «Без фольги» + плитки цветов (картинка-текстура / цвет) -->
  <div class="flex flex-col gap-1.5" v-if="foilOption">
    <span class="text-sm font-semibold">
      Фольгирование
      <InfoTip v-if="foilInfo" :text="foilInfo" />
    </span>
    <div class="flex flex-wrap gap-2" role="group" aria-label="Фольгирование">
      <OptionTile
        v-for="(c, i) in foilOption.colors"
        :key="i"
        multi
        :label="c.name"
        :thumb="c.tile"
        :fill="c.hex ?? '#ccc'"
        :active="foilOn && foilColorIndex === i"
        :title="c.name + (c.code ? ' · ' + c.code : '')"
        :zoom="!!c.full"
        :full="c.full"
        @select="foilOn && foilColorIndex === i
          ? emit('update:foilOn', false)
          : (emit('update:foilColorIndex', i), emit('update:foilOn', true))"
        @zoom="lightbox?.open(c.name, c.full)"
      />
    </div>
  </div>

  <ImageLightbox ref="lightbox" />
</template>
