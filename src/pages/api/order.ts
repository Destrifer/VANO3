import type { APIRoute } from "astro";
import { getPricingData, getProductPricing, type ProductPricing } from "../../lib/pricing/data";
import { priceFromSpec, describeSpec, type CartSpec } from "../../lib/pricing/spec";
import { findDelivery, deliveryCost, findPayment } from "../../lib/checkout";

// Создание заказа: сервер ПЕРЕСЧИТЫВАЕТ цену из спека (id) по актуальным данным
// Directus (клиентским суммам не доверяем), затем создаёт order + order_items
// вложенно серверным токеном. Оплата отложена — заказ = заявка.
export const prerender = false;

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL ?? "http://localhost:8055";
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;

type IncomingItem = {
  name?: string;
  spec?: CartSpec;
  artworkId?: string | null;
  preflight?: { status?: string; checks?: unknown } | null;
};
type Body = {
  items?: IncomingItem[];
  customer?: { name?: string; phone?: string; email?: string; comment?: string };
  delivery?: {
    method?: string;
    address?: string;
    data?: Record<string, unknown> | null;
  };
  payment?: { method?: string; requisitesFileId?: string | null };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function orderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PM-${ymd}-${rnd}`;
}

export const POST: APIRoute = async ({ request }) => {
  if (!DIRECTUS_TOKEN) return json({ error: "Сервер не настроен" }, 500);

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ожидается JSON" }, 400);
  }

  const items = body.items ?? [];
  const customer = body.customer ?? {};
  if (!items.length) return json({ error: "Корзина пуста" }, 400);
  if (!customer.name?.trim() || !customer.phone?.trim()) {
    return json({ error: "Укажите имя и телефон" }, 400);
  }

  // Доставка и оплата (валидация + авторитетная стоимость на сервере).
  const delivery = body.delivery ?? {};
  const dMethod = findDelivery(delivery.method);
  if (!dMethod) return json({ error: "Выберите способ доставки" }, 400);
  if (dMethod.needsAddress && !delivery.address?.trim()) {
    return json({ error: "Укажите адрес доставки" }, 400);
  }
  const delivery_cost = deliveryCost(dMethod.id) ?? 0; // manual → 0, уточнит менеджер

  const pMethod = findPayment(body.payment?.method);
  if (!pMethod) return json({ error: "Выберите способ оплаты" }, 400);
  if (!pMethod.available) return json({ error: "Этот способ оплаты пока недоступен" }, 400);

  const pricing = await getPricingData();
  const productCache = new Map<string, ProductPricing | null>();

  const orderItems: Record<string, unknown>[] = [];
  let subtotal = 0;

  for (const it of items) {
    const spec = it.spec;
    if (!spec?.productSlug) return json({ error: "Некорректная позиция" }, 400);

    if (!productCache.has(spec.productSlug)) {
      productCache.set(spec.productSlug, await getProductPricing(spec.productSlug));
    }
    const product = productCache.get(spec.productSlug);
    if (!product) return json({ error: `Нет данных для «${spec.productSlug}»` }, 400);

    // АВТОРИТЕТНЫЙ пересчёт из актуальных цен по id
    const result = priceFromSpec(spec, product, pricing);
    if (!result) return json({ error: "Не удалось рассчитать позицию" }, 400);

    const qty = spec.quantity;
    subtotal += result.total;
    orderItems.push({
      product_name: it.name ?? spec.productSlug,
      product_slug: spec.productSlug,
      summary: describeSpec(spec, product),
      spec,
      qty,
      unit_price: qty > 0 ? result.total / qty : result.total,
      line_total: result.total,
      artwork: typeof it.artworkId === "string" ? it.artworkId : null,
      preflight_status: it.preflight?.status ?? null,
      preflight_report: it.preflight ?? null,
    });
  }

  const payload = {
    number: orderNumber(),
    status: "new",
    customer_name: customer.name.trim(),
    phone: customer.phone.trim(),
    email: customer.email?.trim() || null,
    comment: customer.comment?.trim() || null,
    subtotal,
    discount_total: 0,
    total: subtotal + delivery_cost,
    delivery_method: dMethod.id,
    delivery_cost,
    delivery_address: delivery.address?.trim() || dMethod.note || null,
    delivery_data: delivery.data ?? null,
    payment_method: pMethod.id,
    payment_status: "unpaid",
    requisites_file:
      pMethod.id === "invoice" && typeof body.payment?.requisitesFileId === "string"
        ? body.payment.requisitesFileId
        : null,
    items: orderItems,
  };

  const res = await fetch(`${DIRECTUS_URL}/items/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return json({ error: "Не удалось создать заказ" }, 502);

  return json({ number: payload.number, total: payload.total });
};
