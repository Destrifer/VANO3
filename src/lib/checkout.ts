// Способы доставки и оплаты (Фаза 1, без внешних интеграций).
// Общий модуль: клиент показывает, сервер считает авторитетно (как ценовой движок).
// Позже способы доставки переедут в Directus (delivery_methods), API — per-provider.

export type DeliveryMethodId = "pickup" | "pickup_second" | "courier_msk" | "pvz";
// type определяет, какие поля показать: pickup — никаких; courier — адрес+детали;
// pvz — город + пожелание по пункту. Все способы manual (везёт/оформляет менеджер).
export type DeliveryType = "pickup" | "courier" | "pvz";
export type DeliveryMethod = {
  id: DeliveryMethodId;
  type: DeliveryType;
  label: string;
  needsAddress: boolean;
  costType: "free" | "fixed" | "manual"; // manual = уточнит менеджер
  cost: number;
  note?: string;
  freeOverThreshold?: boolean; // порог бесплатной доставки обнуляет этот способ
};

// Порог бесплатной доставки по Москве (fallback). Авторитетное число — из Directus
// (settings.free_delivery_threshold), редактируется в админке; сюда прокидывается
// мета-тегом `free-delivery-threshold` (см. BaseLayout) для клиентских островов.
export const FREE_DELIVERY_DEFAULT = 20000;

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { id: "pickup", type: "pickup", label: "Самовывоз", needsAddress: false, costType: "free", cost: 0, note: "Москва, ул. Садовники" },
  { id: "pickup_second", type: "pickup", label: "Самовывоз со второй точки", needsAddress: false, costType: "free", cost: 0, note: "по предварительному согласованию с менеджером (+1 день на перевозку)" },
  // Бесплатно от порога (settings.free_delivery_threshold); иначе — фикс.
  { id: "courier_msk", type: "courier", label: "Курьер по Москве", needsAddress: true, costType: "fixed", cost: 790, freeOverThreshold: true },
  { id: "pvz", type: "pvz", label: "ПВЗ, постамат или доставка по России", needsAddress: true, costType: "manual", cost: 0, note: "стоимость уточнит менеджер" },
];

export function findDelivery(id?: string): DeliveryMethod | undefined {
  return DELIVERY_METHODS.find((m) => m.id === id);
}

// Сети ПВЗ/постаматов и службы курьеров — выбор клиента, оформляет менеджер.
// term — типичный срок доставки (общая справка). price — ориентировочная цена
// «в рынке»; null → показываем «по тарифу перевозчика». Числа согласуются владельцем.
export const PVZ_NETWORKS: { id: string; label: string; term: string; price: string | null }[] = [
  { id: "yandex", label: "Яндекс ПВЗ", term: "2–4 дня", price: null },
  { id: "cdek", label: "СДЭК", term: "2–5 дней", price: null },
  { id: "5post", label: "5Post", term: "3–6 дней", price: null },
  { id: "post", label: "Почта России", term: "5–10 дней", price: null },
];
export const COURIER_SERVICES = [
  { id: "yandex_go", label: "Яндекс Go" },
  { id: "dostavista", label: "Достависта" },
];
export const pvzLabel = (id?: string) => PVZ_NETWORKS.find((n) => n.id === id)?.label;
export const courierLabel = (id?: string) => COURIER_SERVICES.find((c) => c.id === id)?.label;

// Базовая стоимость способа без учёта порога. null = «уточнит менеджер» (manual).
export function deliveryCost(id?: string): number | null {
  const m = findDelivery(id);
  if (!m) return null;
  return m.costType === "manual" ? null : m.cost;
}

// Стоимость с учётом порога бесплатной доставки по Москве. АВТОРИТЕТНО считается на
// сервере (order.ts); клиент показывает ту же оценку. goodsSubtotal — сумма товаров
// после скидок; threshold — из настроек. null = «уточнит менеджер».
export function effectiveDeliveryCost(
  id: string | undefined,
  goodsSubtotal: number,
  threshold: number,
): number | null {
  const m = findDelivery(id);
  if (!m) return null;
  if (m.costType === "manual") return null;
  if (m.freeOverThreshold && threshold > 0 && goodsSubtotal >= threshold) return 0;
  return m.cost;
}

// Прогресс до бесплатной доставки по Москве (для плашки товара и корзины).
// active=false → механику не показываем (порог отключён числом ≤ 0).
export function freeDeliveryProgress(goodsSubtotal: number, threshold: number) {
  if (!threshold || threshold <= 0) {
    return { active: false, qualified: false, remaining: 0, threshold: 0 };
  }
  return {
    active: true,
    qualified: goodsSubtotal >= threshold,
    remaining: Math.max(0, threshold - goodsSubtotal),
    threshold,
  };
}

export type PaymentMethodId = "online" | "on_receipt" | "invoice";
export type PaymentMethod = {
  id: PaymentMethodId;
  label: string;
  available: boolean;
  note?: string;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "online", label: "Онлайн картой / СБП", available: false, note: "скоро" },
  { id: "on_receipt", label: "При получении (наличные/карта)", available: true },
  { id: "invoice", label: "Счёт для юрлица", available: true },
];

export function findPayment(id?: string): PaymentMethod | undefined {
  return PAYMENT_METHODS.find((m) => m.id === id);
}
