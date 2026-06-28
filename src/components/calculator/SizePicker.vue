<script setup lang="ts">
// Презентационный ряд плиток-иконок для выбора размера/формы. Логику (что есть
// у продукта, какой пресет активен) считает композабл и отдаёт готовый список
// плиток + activeId. Здесь только отрисовка и поповер ввода (свой размер / ⌀).
// Состояние не теряется при гидрации острова: select эмитим по id, значения
// инпутов — через v-model-прокси у родителя (тот же приём, что в FormatField).
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import SizeGlyph from "./SizeGlyph.vue";
import type { SizeTile } from "../../lib/calculator/sizeGlyph";

const props = defineProps<{
  label?: string;
  tiles: SizeTile[];
  activeId: string;
  input: "rect" | "round" | null; // что показывает поповер для активной плитки
  customW: number;
  customH: number;
  diameter: number;
  min?: number;
  max?: number;
}>();
const emit = defineEmits<{
  select: [id: string];
  "update:customW": [v: number];
  "update:customH": [v: number];
  "update:diameter": [v: number];
}>();

const num = (e: Event) => +(e.target as HTMLInputElement).value;

// Видимость поповера ввода — отдельное состояние от «какая плитка активна»:
// плитка остаётся выделенной, а поповер можно закрыть кликом вне и открыть
// повторным кликом по той же плитке (тоггл). Показываем только когда есть что
// вводить (input) И открыто (open).
const rootRef = ref<HTMLElement | null>(null);
const open = ref(false);

function onTileClick(id: string) {
  const wasActive = props.activeId === id;
  emit("select", id);
  // input обновится реактивно после select — читаем на следующем тике
  nextTick(() => {
    if (!props.input) open.value = false;          // обычный размер — поповера нет
    else open.value = wasActive ? !open.value : true; // повторный клик = тоггл
  });
}

// Если активная плитка перестала требовать ввода (выбрали пресет) — прячем.
watch(() => props.input, (v) => { if (!v) open.value = false; });

function onDocPointer(e: PointerEvent) {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}
function onKey(e: KeyboardEvent) { if (e.key === "Escape") open.value = false; }
onMounted(() => {
  document.addEventListener("pointerdown", onDocPointer, true);
  document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocPointer, true);
  document.removeEventListener("keydown", onKey);
});
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">{{ label ?? "Размер" }}</span>

    <div ref="rootRef" class="relative">
      <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="label ?? 'Размер'">
        <button
          v-for="t in tiles"
          :key="t.id"
          type="button"
          role="radio"
          :aria-checked="activeId === t.id"
          :title="t.sub ? `${t.label} · ${t.sub} мм` : t.label"
          class="size-tile"
          :class="{ 'size-tile--on': activeId === t.id }"
          @click="onTileClick(t.id)"
        >
          <span class="size-tile__name">{{ t.label }}</span>
          <SizeGlyph :kind="t.glyph" class="size-tile__icon" />
          <span class="size-tile__dim">{{ t.sub || "‎" }}</span>
        </button>
      </div>

      <!-- Поповер ввода: свой размер (Ш×В) или круглая (⌀). Виден только когда
           открыт; закрывается кликом вне / Esc, плитка остаётся выделенной. -->
      <div v-if="input && open" class="size-pop">
        <div v-if="input === 'round'" class="flex items-center gap-2">
          <span class="text-sm opacity-70">⌀</span>
          <input
            type="number" class="input input-sm w-20" :min="min" :max="max" :value="diameter"
            @input="emit('update:diameter', num($event))"
          />
          <span class="text-sm opacity-70">мм</span>
        </div>
        <div v-else class="flex items-center gap-2">
          <input
            type="number" class="input input-sm w-20" :min="min" :max="max" :value="customW"
            @input="emit('update:customW', num($event))"
          />
          <span class="opacity-60">×</span>
          <input
            type="number" class="input input-sm w-20" :min="min" :max="max" :value="customH"
            @input="emit('update:customH', num($event))"
          />
          <span class="text-sm opacity-70">мм</span>
        </div>
        <span v-if="min || max" class="mt-1 block text-xs opacity-50">
          от {{ min }} до {{ max }} мм
        </span>
      </div>
    </div>

    <slot name="hint" />
  </div>
</template>

<style scoped>
.size-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0.2rem;
  width: 5rem;
  padding: 0.4rem 0.3rem;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: 0.75rem;
  background: var(--color-base-100, #fff);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.size-tile:hover { border-color: var(--color-base-content, #555); }
.size-tile--on {
  border-color: var(--color-primary, #1f1f1f);
  border-width: 2px;
  padding: calc(0.4rem - 1px) calc(0.3rem - 1px);
  background: var(--color-base-200, #f3f1ea);
}
.size-tile__icon { width: 1.6rem; height: 1.6rem; flex: none; }
.size-tile__name {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.05;
  text-align: center;
  /* до 2 строк имени, без обрезки буквами */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.size-tile__dim {
  font-size: 0.65rem;
  line-height: 1;
  opacity: 0.55;
  white-space: nowrap;
}
.size-pop {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  z-index: 20;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: 0.75rem;
  background: var(--color-base-100, #fff);
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%), 0 2px 6px rgb(0 0 0 / 8%);
}
</style>
