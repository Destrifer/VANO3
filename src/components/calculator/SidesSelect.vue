<script setup lang="ts">
// Презентационный выбор сторон печати (4+0 / 4+4) едиными плитками (OptionTile).
// Иконки — тела Tabler (инлайн): лист (4+0), стопка из двух листов (4+4).
import OptionTile from "./OptionTile.vue";

type Sides = "4+0" | "4+4";
defineProps<{ label?: string; modelValue: Sides }>();
const emit = defineEmits<{ "update:modelValue": [v: Sides] }>();

const ICONS: Record<Sides, string> = {
  "4+0":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2"/></g>',
  "4+4":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M7 9.667A2.667 2.667 0 0 1 9.667 7h8.666A2.667 2.667 0 0 1 21 9.667v8.666A2.667 2.667 0 0 1 18.333 21H9.667A2.667 2.667 0 0 1 7 18.333z"/><path d="M4.012 16.737A2 2 0 0 1 3 15V5c0-1.1.9-2 2-2h10c.75 0 1.158.385 1.5 1"/></g>',
};

const TILES: { id: Sides; name: string; sub: string }[] = [
  { id: "4+0", name: "4+0", sub: "одна сторона" },
  { id: "4+4", name: "4+4", sub: "две стороны" },
];
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">{{ label ?? "Печать" }}</span>
    <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="label ?? 'Печать'">
      <OptionTile
        v-for="t in TILES"
        :key="t.id"
        :label="t.name"
        :sub="t.sub"
        :glyph="ICONS[t.id]"
        :active="modelValue === t.id"
        :title="`${t.name} · ${t.sub}`"
        @select="emit('update:modelValue', t.id)"
      />
    </div>
  </div>
</template>
