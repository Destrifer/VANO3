// Корзина: источник правды — localStorage (переживает навигацию между
// страницами Astro), в памяти — nanostores-атом, общий для всех островов
// (шапка, плашка товара, страница корзины). Гостевой режим, без авторизации.
import { persistentAtom } from "@nanostores/persistent";
import { computed } from "nanostores";
import type { CartSpec } from "../lib/pricing/spec";
import type { Preflight } from "../lib/preflight";

export type CartItem = {
  id: string;
  slug: string; // для ссылки на товар
  name: string; // отображаемое имя продукта
  spec: CartSpec; // спецификация по id (сервер пересчитает цену по ней)
  summary: string; // читаемое описание для показа в корзине
  qty: number; // итоговый тираж
  unitPrice: number; // снимок цены за шт (только показ; сервер пересчитает)
  total: number; // снимок суммы (только показ)
  artworkId: string | null; // id загруженного макета в Directus
  preflight: Preflight | null; // результат проверки макета
  createdAt: number;
};

export const cartItems = persistentAtom<CartItem[]>("printmos:cart", [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export const cartCount = computed(cartItems, (items) => items.length);
export const cartTotal = computed(cartItems, (items) =>
  items.reduce((sum, i) => sum + i.total, 0),
);

export function addToCart(item: Omit<CartItem, "id" | "createdAt">) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now() + Math.random());
  cartItems.set([...cartItems.get(), { ...item, id, createdAt: Date.now() }]);
}

export function removeFromCart(id: string) {
  cartItems.set(cartItems.get().filter((i) => i.id !== id));
}

export function clearCart() {
  cartItems.set([]);
}
