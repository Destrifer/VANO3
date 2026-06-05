<script setup lang="ts">
// Переиспользуемая палитра цветов: попап-кнопка + сетка квадратных свотчей
// + lightbox для фото. Используется и для бумаги, и для фольги.
// Наружу — только список цветов и v-model выбранного индекса.
import { computed, ref } from "vue";

type Swatch = { name: string; code: string; hex: string | null; image: string | null };

const props = defineProps<{ colors: Swatch[]; modelValue: number }>();
const emit = defineEmits<{ "update:modelValue": [value: number] }>();

const current = computed(() => props.colors[props.modelValue] ?? props.colors[0]);

function swatchStyle(c: Swatch) {
  return c.image
    ? `background-image:url(${c.image});background-size:cover;background-position:center`
    : `background:${c.hex ?? "#ccc"}`;
}

// Lightbox инкапсулирован внутри компонента
const lightboxEl = ref<HTMLDialogElement | null>(null);
const lightbox = ref<{ name: string; image: string } | null>(null);
function openLightbox(c: Swatch) {
  if (!c.image) return;
  lightbox.value = { name: c.name, image: c.image };
  lightboxEl.value?.showModal();
}
</script>

<template>
  <div class="dropdown">
    <div tabindex="0" role="button" class="btn btn-outline gap-2">
      <span class="h-5 w-5 rounded border border-base-300" :style="swatchStyle(current)"></span>
      {{ current?.name }}
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
    </div>
    <div tabindex="0" class="dropdown-content z-20 mt-2 w-60 rounded-box border border-base-300 bg-base-100 p-2 shadow">
      <div class="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
        <div
          v-for="(c, i) in colors"
          :key="i"
          role="button"
          tabindex="0"
          class="relative aspect-square w-full cursor-pointer rounded-box border"
          :class="i === modelValue ? 'border-base-content ring-2 ring-base-content' : 'border-base-300'"
          :style="swatchStyle(c)"
          :title="c.name + (c.code ? ' · ' + c.code : '')"
          @click="emit('update:modelValue', i)"
        >
          <span
            v-if="c.image"
            role="button"
            tabindex="0"
            aria-label="Увеличить"
            class="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full border border-base-content bg-base-100"
            @click.stop="openLightbox(c)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
        </div>
      </div>
    </div>

    <dialog ref="lightboxEl" class="modal">
      <div class="modal-box max-w-lg p-2">
        <img v-if="lightbox" :src="lightbox.image" :alt="lightbox.name" class="w-full rounded" />
        <p v-if="lightbox" class="mt-2 text-center text-sm">{{ lightbox.name }}</p>
      </div>
      <form method="dialog" class="modal-backdrop"><button>закрыть</button></form>
    </dialog>
  </div>
</template>
