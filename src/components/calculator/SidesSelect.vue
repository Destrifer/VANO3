<script setup lang="ts">
// Презентационный выбор сторон печати (4+0 / 4+4) плитками-иконками. Единый для
// всех калькуляторов. Тот же вид, что у выбора размера (см. SizePicker): плитка
// = имя + иконка + подпись, активная подсвечена рамкой. Иконки — НАСТОЯЩИЕ тела
// Tabler (@iconify-json/tabler, MIT), инлайн для Vue-острова: лист (4+0) и
// стопка из двух листов (4+4 = две стороны).
type Sides = "4+0" | "4+4";
defineProps<{ label?: string; modelValue: Sides }>();
const emit = defineEmits<{ "update:modelValue": [v: Sides] }>();

// viewBox 0 0 24 24, как у SizeGlyph.
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
      <button
        v-for="t in TILES"
        :key="t.id"
        type="button"
        role="radio"
        :aria-checked="modelValue === t.id"
        :title="`${t.name} · ${t.sub}`"
        class="sides-tile"
        :class="{ 'sides-tile--on': modelValue === t.id }"
        @click="emit('update:modelValue', t.id)"
      >
        <span class="sides-tile__name">{{ t.name }}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" class="sides-tile__icon" v-html="ICONS[t.id]" />
        <span class="sides-tile__sub">{{ t.sub }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Тот же визуал, что у .size-tile в SizePicker, но шире под подпись словами. */
.sides-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0.2rem;
  width: 7rem;
  padding: 0.5rem 0.4rem;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: 0.75rem;
  background: var(--color-base-100, #fff);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.sides-tile:hover { border-color: var(--color-base-content, #555); }
.sides-tile--on {
  border-color: var(--color-primary, #1f1f1f);
  border-width: 2px;
  padding: calc(0.5rem - 1px) calc(0.4rem - 1px);
  background: var(--color-base-200, #f3f1ea);
}
.sides-tile__icon { width: 1.7rem; height: 1.7rem; flex: none; }
.sides-tile__name { font-size: 0.85rem; font-weight: 600; line-height: 1; }
.sides-tile__sub { font-size: 0.7rem; line-height: 1; opacity: 0.6; white-space: nowrap; }
</style>
