// Единый слой способов доставки: данные из Directus (коллекция delivery_methods)
// + помощники стоимости/прогресса/выбираемости. Один источник и для витрины
// (плашка товара), и для корзины, и для сервера (order.ts). Заменяет прежний
// хардкод в checkout.ts.
import { directusFetch, assetUrl } from "./directus";

export type DeliveryType = "pickup" | "courier" | "pvz";

export type DeliveryMethod = {
  code: string; // стабильный слаг (pickup_main, courier_msk, cdek, ...)
  label: string;
  type: DeliveryType;
  logo: string | null; // публичный URL лого перевозчика (или null → заглушка)
  priceFrom: number | null; // 0=бесплатно; null=уточнит менеджер; число=ориентир
  pricePrefix: string; // "от" | "~" | ""
  etaDays: number; // транзит, рабочих дней (для дня доставки)
  note: string | null;
  needsAddress: boolean;
  freeOverThreshold: boolean; // бесплатно от settings.free_delivery_threshold (наш курьер)
};

// Порог бесплатной доставки по Москве (fallback; авторитет — settings.free_delivery_threshold).
export const FREE_DELIVERY_DEFAULT = 20000;

// Читается на сборке/сервере, публикуется в HTML (мета/JSON) для островов.
// Устойчиво к сбою (нет прав/сети) → пустой список: UI покажет фолбэк, сборка не падает.
export async function getDeliveryMethods(): Promise<DeliveryMethod[]> {
  try {
    const res = await directusFetch<{ data: any[] }>(
      "/items/delivery_methods?filter[active][_eq]=true&sort=sort&limit=-1" +
        "&fields=code,label,type,logo,price_from,price_prefix,eta_days,note,needs_address,free_over_threshold",
    );
    return (res.data ?? []).map((m) => ({
      code: String(m.code),
      label: String(m.label ?? m.code),
      type: (m.type ?? "pvz") as DeliveryType,
      logo: assetUrl(m.logo),
      priceFrom: m.price_from == null ? null : Number(m.price_from),
      pricePrefix: m.price_prefix ?? "",
      etaDays: Number(m.eta_days ?? 0),
      note: m.note ?? null,
      needsAddress: !!m.needs_address,
      freeOverThreshold: !!m.free_over_threshold,
    }));
  } catch {
    return [];
  }
}

export function findMethod(
  methods: DeliveryMethod[],
  code: string | undefined,
): DeliveryMethod | undefined {
  return methods.find((m) => m.code === code);
}

// Порог набран для бесплатного курьера?
export function thresholdMet(goodsSubtotal: number, threshold: number): boolean {
  return threshold > 0 && goodsSubtotal >= threshold;
}

// Авторитетная стоимость (сервер) и оценка (клиент). null = «уточнит менеджер».
// pickup=0; наш курьер (free_over_threshold)=0 когда порог набран, иначе не выбирается;
// перевозчики/ПВЗ без интеграции = null (priceFrom только для показа «от N ₽»).
export function methodCost(
  m: DeliveryMethod | undefined,
  goodsSubtotal: number,
  threshold: number,
): number | null {
  if (!m) return null;
  if (m.type === "pickup") return 0;
  if (m.freeOverThreshold) return thresholdMet(goodsSubtotal, threshold) ? 0 : null;
  return null;
}

// Наш курьер до набора порога показываем как промо-строку с прогрессом, а не
// как выбираемую плитку (см. макет). Всё остальное выбираемо всегда.
export function isPromoCourier(
  m: DeliveryMethod,
  goodsSubtotal: number,
  threshold: number,
): boolean {
  return m.freeOverThreshold && !thresholdMet(goodsSubtotal, threshold);
}
export function isSelectable(
  m: DeliveryMethod,
  goodsSubtotal: number,
  threshold: number,
): boolean {
  return !isPromoCourier(m, goodsSubtotal, threshold);
}

// Прогресс до бесплатной доставки по Москве (плашка товара и корзина).
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
