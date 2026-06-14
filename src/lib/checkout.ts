// Способы доставки и оплаты (Фаза 1, без внешних интеграций).
// Общий модуль: клиент показывает, сервер считает авторитетно (как ценовой движок).
// Позже способы доставки переедут в Directus (delivery_methods), API — per-provider.

export type DeliveryMethodId = "pickup" | "courier_msk" | "pvz";
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
};

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { id: "pickup", type: "pickup", label: "Самовывоз", needsAddress: false, costType: "free", cost: 0, note: "Москва, ул. Садовники" },
  { id: "courier_msk", type: "courier", label: "Курьер по Москве", needsAddress: true, costType: "fixed", cost: 400 },
  { id: "pvz", type: "pvz", label: "ПВЗ или постамат", needsAddress: true, costType: "manual", cost: 0, note: "стоимость уточнит менеджер" },
];

export function findDelivery(id?: string): DeliveryMethod | undefined {
  return DELIVERY_METHODS.find((m) => m.id === id);
}

// Сети ПВЗ/постаматов и службы курьеров — выбор клиента, оформляет менеджер.
export const PVZ_NETWORKS = [
  { id: "yandex", label: "Яндекс ПВЗ" },
  { id: "cdek", label: "СДЭК" },
  { id: "5post", label: "5Post" },
];
export const COURIER_SERVICES = [
  { id: "yandex_go", label: "Яндекс Go" },
  { id: "dostavista", label: "Достависта" },
];
export const pvzLabel = (id?: string) => PVZ_NETWORKS.find((n) => n.id === id)?.label;
export const courierLabel = (id?: string) => COURIER_SERVICES.find((c) => c.id === id)?.label;

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
