<script setup lang="ts">
// Счётчик корзины в шапке. Общий стор (nanostores) синхронен между островами.
import { useStore } from "@nanostores/vue";
import { cartCount } from "../stores/cart";

const count = useStore(cartCount);
</script>

<template>
  <a href="/cart" class="btn btn-ghost btn-sm" aria-label="Корзина">
    <span class="indicator">
      <span v-if="count" class="badge badge-primary badge-sm indicator-item">{{ count }}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
        <path d="M2 3h2l2.4 12.5a2 2 0 0 0 2 1.5h7.7a2 2 0 0 0 2-1.5L21 7H5.2" />
      </svg>
    </span>
  </a>
</template>
