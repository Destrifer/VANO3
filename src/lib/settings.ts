import { directusFetch } from "./directus";

export type Settings = {
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  telegram_url: string | null;
  whatsapp_url: string | null;
  map_lat: number | null;
  map_lng: number | null;
  map_zoom: number | null;
  cutoff_hour: number | null; // час отсечки приёма в работу (для «срока готовности»)
  free_delivery_threshold: number | null; // ₽: от этой суммы курьер по Москве бесплатно (0/null → выкл)
  // ₽: минимальная сумма заказа — по ТОВАРАМ, без доставки (0/null → выкл).
  // Ограничение на КОРЗИНУ, а не на тираж: одну книгу положить можно, но
  // оформить — только когда сумма позиций дотянет до порога. Проверяется
  // авторитетно на сервере в /api/order.
  min_order_total: number | null;
};

// Фолбэк, если поля ещё нет в схеме Directus (или его обнулили).
export const MIN_ORDER_DEFAULT = 2500;

// Синглтон: /items/settings возвращает ОДИН объект (не массив).
export async function getSettings(): Promise<Settings> {
  const response = await directusFetch<{ data: Settings }>("/items/settings");
  return response.data;
}
