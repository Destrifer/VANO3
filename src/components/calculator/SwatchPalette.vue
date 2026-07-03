<script setup lang="ts">
// Переиспользуемая палитра цветов: сетка квадратных свотчей + lightbox для фото.
// Используется для бумаги и для фольги. Свотчи и lightbox — адаптивные картинки
// (avif/webp + retina) через responsiveAsset, чтобы не тянуть оригиналы.
// inline=true — рисуем сразу сетку (блок материала); иначе кнопка-дропдаун (фольга).
import { computed, ref } from "vue";
import type { ResponsiveImage } from "../../lib/directus";

type Swatch = {
  name: string;
  code: string;
  hex: string | null;
  image: string | null;
  thumb: ResponsiveImage;
  full: ResponsiveImage;
};

const props = withDefaults(
  defineProps<{ colors: Swatch[]; modelValue: number; inline?: boolean }>(),
  { inline: false },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();

const current = computed(() => props.colors[props.modelValue] ?? props.colors[0]);
const hexStyle = (c?: Swatch) => `background:${c?.hex ?? "#ccc"}`;

// Lightbox инкапсулирован внутри компонента.
const lightboxEl = ref<HTMLDialogElement | null>(null);
const lightbox = ref<{ name: string; img: ResponsiveImage } | null>(null);
function openLightbox(c: Swatch) {
  if (!c.full) return;
  lightbox.value = { name: c.name, img: c.full };
  lightboxEl.value?.showModal();
}
</script>

<template>
  <!-- inline: контейнер прозрачен (display:contents), видимый блок = сетка.
       dropdown: кнопка + выпадающая сетка. Ячейка и lightbox — единый разметка. -->
  <div :class="inline ? 'contents' : 'dropdown'">
    <div v-if="!inline" tabindex="0" role="button" class="btn btn-outline gap-2">
      <span class="h-5 w-5 overflow-hidden rounded border border-base-300" :style="current?.thumb ? '' : hexStyle(current)">
        <img v-if="current?.thumb" :src="current.thumb.src" alt="" class="h-full w-full object-cover" />
      </span>
      {{ current?.name }}
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
    </div>

    <div :class="inline ? 'contents' : 'dropdown-content z-20 mt-2 w-60 rounded-box border border-base-300 bg-base-100 p-2 shadow'">
      <div
        class="gap-2 overflow-y-auto"
        :class="inline ? 'flex flex-wrap max-h-44' : 'grid grid-cols-3 max-h-56'"
      >
        <div
          v-for="(c, i) in colors"
          :key="i"
          role="button"
          tabindex="0"
          class="relative cursor-pointer overflow-hidden rounded-box border"
          :class="[
            inline ? 'h-11 w-11' : 'aspect-square w-full',
            i === modelValue ? 'border-base-content ring-2 ring-base-content' : 'border-base-300',
          ]"
          :style="c.thumb ? '' : hexStyle(c)"
          :title="c.name + (c.code ? ' · ' + c.code : '')"
          @click="emit('update:modelValue', i)"
        >
          <picture v-if="c.thumb">
            <source v-for="s in c.thumb.sources" :key="s.type" :type="s.type" :srcset="s.srcset" />
            <img :src="c.thumb.src" :alt="c.name" class="h-full w-full object-cover" loading="lazy" decoding="async" />
          </picture>
          <span
            v-if="c.full"
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
      <div class="modal-box w-auto max-w-[92vw] p-2">
        <picture v-if="lightbox">
          <source v-for="s in lightbox.img!.sources" :key="s.type" :type="s.type" :srcset="s.srcset" :sizes="lightbox.img!.sizes" />
          <img :src="lightbox.img!.src" :alt="lightbox.name" :sizes="lightbox.img!.sizes" class="mx-auto max-h-[80vh] rounded" />
        </picture>
        <p v-if="lightbox" class="mt-2 text-center text-sm">{{ lightbox.name }}</p>
      </div>
      <form method="dialog" class="modal-backdrop"><button>закрыть</button></form>
    </dialog>
  </div>
</template>
