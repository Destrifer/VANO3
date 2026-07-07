<script setup lang="ts">
// Переиспользуемый lightbox плиток калькулятора: <dialog> с адаптивной
// картинкой (srcset по ширинам из responsiveAssetFluid) и подписью.
// Родитель держит ref и дёргает open(name, img) — по клику на лупу плитки.
import { ref } from "vue";
import type { ResponsiveImage } from "../../lib/directus";

const el = ref<HTMLDialogElement | null>(null);
const shown = ref<{ name: string; img: NonNullable<ResponsiveImage> } | null>(null);
function open(name: string, img: ResponsiveImage) {
  if (!img) return;
  shown.value = { name, img };
  el.value?.showModal();
}
defineExpose({ open });
</script>

<template>
  <dialog ref="el" class="modal">
    <div class="modal-box w-auto max-w-[92vw] p-2">
      <picture v-if="shown">
        <source v-for="s in shown.img.sources" :key="s.type" :type="s.type" :srcset="s.srcset" :sizes="shown.img.sizes" />
        <img :src="shown.img.src" :alt="shown.name" :sizes="shown.img.sizes" class="mx-auto max-h-[80vh] rounded" />
      </picture>
      <p v-if="shown" class="mt-2 text-center text-sm">{{ shown.name }}</p>
    </div>
    <form method="dialog" class="modal-backdrop"><button>закрыть</button></form>
  </dialog>
</template>
