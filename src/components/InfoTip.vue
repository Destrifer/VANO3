<script setup lang="ts">
// Маленький значок «?» с пояснением (daisyUI tooltip). Внутри острова (UX,
// не индексируется). Текст — из того же источника, что и инлайн-блок.
defineProps<{ text: string }>();
</script>

<template>
  <span class="tooltip tooltip-right align-middle">
    <span
      class="tooltip-content max-w-xs whitespace-normal p-2 text-left text-xs leading-snug"
    >
      {{ text }}
    </span>
    <span
      class="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-base-content/40 text-[0.65rem] leading-none text-base-content/60"
      aria-hidden="true"
    >
      ?
    </span>
  </span>
</template>
