// Способы доставки и оплаты (Фаза 1, без внешних интеграций).
// Общий модуль: клиент показывает, сервер считает авторитетно (как ценовой движок).
// Позже способы доставки переедут в Directus (delivery_methods), API — per-provider.

export type DeliveryMethodId = "pickup" | "courier_msk" | "rf";
export type DeliveryMethod = {
  id: DeliveryMethodId;
  label: string;
  needsAddress: boolean;
  costType: "free" | "fixed" | "manual"; // manual = уточнит менеджер
  cost: number;
  note?: string;
};

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { id: "pickup", label: "Самовывоз", needsAddress: false, costType: "free", cost: 0, note: "Москва, м. Бауманская" },
  { id: "courier_msk", label: "Курьер по Москве", needsAddress: true, costType: "fixed", cost: 400 },
  { id: "rf", label: "Доставка по России", needsAddress: true, costType: "manual", cost: 0, note: "стоимость уточнит менеджер" },
];

export function findDelivery(id?: string): DeliveryMethod | undefined {
  return DELIVERY_METHODS.find((m) => m.id === id);
}

// null = «уточнит менеджер» (manual)
export function deliveryCost(id?: string): number | null {
  const m = findDelivery(id);
  if (!m) return null;
  return m.costType === "manual" ? null : m.cost;
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
