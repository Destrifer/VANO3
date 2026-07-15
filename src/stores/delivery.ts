// Выбранный способ доставки — уровня заказа (не позиции), общий для плашки товара
// и корзины. Persistent (localStorage), переживает навигацию между страницами Astro.
// Плашка пишет выбор → корзина его предвыбирает.
import { persistentAtom } from "@nanostores/persistent";

export const selectedDeliveryCode = persistentAtom<string>(
  "printmos:delivery",
  "pickup_main",
);

export function setDelivery(code: string) {
  selectedDeliveryCode.set(code);
}
