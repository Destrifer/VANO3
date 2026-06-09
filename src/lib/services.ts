import { directusFetch, assetUrl } from "./directus";

// SEO/контент страницы услуги — то, что страница «хранит у себя» (док 04):
// мета, заголовок, тексты, шаблон макета, FAQ. Цены/опции тянет конфигуратор.
// Поля опциональны: пока их нет в Directus — graceful fallback (как в works.ts).
export type ServiceFaq = { question: string; answer: string };

export type ServiceContent = {
  h1: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  introText: string | null; // rich HTML — интро (вхождения головы + перелинковка)
  templateUrl: string | null; // скачиваемый шаблон макета
  faq: ServiceFaq[];
};

const EMPTY: ServiceContent = {
  h1: null,
  metaTitle: null,
  metaDescription: null,
  introText: null,
  templateUrl: null,
  faq: [],
};

// Поля запрашиваем отдельным запросом от ценового конфига — если их ещё нет
// в схеме, Directus вернёт 400, мы поймаем и отдадим пустой контент.
const FIELDS = [
  "h1",
  "meta_title",
  "meta_description",
  "intro_text",
  "template_file",
  "faq.faq_items_id.question",
  "faq.faq_items_id.answer",
].join(",");

export async function getServiceContent(slug: string): Promise<ServiceContent> {
  try {
    const res = await directusFetch<{ data: any[] }>(
      `/items/products?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=${FIELDS}&limit=1`,
    );
    const p = res.data?.[0];
    if (!p) return EMPTY;
    const faq: ServiceFaq[] = (Array.isArray(p.faq) ? p.faq : [])
      .map((x: any) => x?.faq_items_id)
      .filter((f: any) => f?.question && f?.answer)
      .map((f: any) => ({ question: String(f.question), answer: String(f.answer) }));
    const trimOrNull = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : null;
    return {
      h1: trimOrNull(p.h1),
      metaTitle: trimOrNull(p.meta_title),
      metaDescription: trimOrNull(p.meta_description),
      introText: trimOrNull(p.intro_text),
      templateUrl: assetUrl(p.template_file),
      faq,
    };
  } catch {
    // Полей ещё нет в Directus / коллекция недоступна — пустой контент.
    return EMPTY;
  }
}
