// Способы оплаты (Фаза 1). Доставка переехала в src/lib/delivery.ts (данные из
// Directus). Клиент показывает, сервер (order.ts) валидирует авторитетно.

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
