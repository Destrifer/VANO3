// Чистые билдеры Schema.org (JSON-LD). Возвращают обычные объекты —
// рендерит их <JsonLd>. Логика разметки в одном месте, типобезопасно.
// Док 02 §20: нужны Organization/LocalBusiness, Product+Offer, BreadcrumbList, FAQPage.
import type { Settings } from "../settings";

const ORG_ID = "#org"; // якорь организации, чтобы ссылаться из других узлов

// Организация/бренд — для брендового поиска и связи узлов.
export function organization(settings: Settings, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": new URL(ORG_ID, siteUrl).toString(),
    name: settings.company_name ?? "Printmos",
    url: siteUrl,
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
  };
}

// Локальный бизнес — для локального/брендового поиска (док 02 §27).
export function localBusiness(settings: Settings, siteUrl: string) {
  const hasGeo = settings.map_lat != null && settings.map_lng != null;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": new URL(ORG_ID, siteUrl).toString(),
    name: settings.company_name ?? "Printmos",
    url: siteUrl,
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: settings.address,
            addressLocality: "Москва",
            addressCountry: "RU",
          },
        }
      : {}),
    ...(hasGeo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: settings.map_lat,
            longitude: settings.map_lng,
          },
        }
      : {}),
    ...(settings.hours ? { openingHours: settings.hours } : {}),
  };
}

export type Crumb = { name: string; url: string };

// Хлебные крошки. Принимает уже абсолютные URL.
export function breadcrumbList(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

// Услуга/продукт + Offer с ценой «от» (П2: та же цена, что в конфигураторе).
export function productOffer(opts: {
  name: string;
  url: string;
  lowPrice?: number | null;
  description?: string | null;
  image?: string | null;
  brand?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.brand ? { brand: { "@type": "Brand", name: opts.brand } } : {}),
    ...(opts.lowPrice != null
      ? {
          offers: {
            "@type": "Offer",
            url: opts.url,
            price: Math.round(opts.lowPrice),
            priceCurrency: "RUB",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

export type Faq = { question: string; answer: string };

// FAQ — ловит вопросительный хвост, годен для AI-ответов (док 05 §27).
export function faqPage(items: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
