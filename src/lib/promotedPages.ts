import { directusFetch } from "./directus";
import type { ServiceFaq } from "./services";
import type { CalcPreset } from "../composables/calcUrlState";

// Продвигаемая кластерная страница (pSEO, Tier-1). URL: /<product>/<slug>.
// «Тянет» продукт (конфигуратор + пресет), «хранит» свой контент (04 §68-98).
export type PromotedPage = {
  slug: string; // сегмент URL после продукта (напр. "foil")
  productSlug: string; // родительский продукт (первый сегмент URL)
  h1: string | null;
  tileLabel: string | null; // короткая подпись для плитки (иначе h1)
  icon: string | null; // иконка плитки (Tabler)
  metaTitle: string | null;
  metaDescription: string | null;
  introText: string | null; // rich HTML
  preset: CalcPreset | null; // предустановка конфигуратора
  showAsTile: boolean; // Tier-1 (плитка на хабе) vs Tier-2 (только ссылка/sitemap)
  faq: ServiceFaq[];
};

const FIELDS = [
  "slug",
  "h1",
  "tile_label",
  "icon",
  "meta_title",
  "meta_description",
  "intro_text",
  "preset",
  "show_as_tile",
  "product.slug",
  "faq.faq_items_id.question",
  "faq.faq_items_id.answer",
].join(",");

function mapPage(p: any): PromotedPage {
  const faq: ServiceFaq[] = (Array.isArray(p.faq) ? p.faq : [])
    .map((x: any) => x?.faq_items_id)
    .filter((f: any) => f?.question && f?.answer)
    .map((f: any) => ({ question: String(f.question), answer: String(f.answer) }));
  const trim = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    slug: String(p.slug),
    productSlug: String(p.product.slug),
    h1: trim(p.h1),
    tileLabel: trim(p.tile_label),
    icon: trim(p.icon),
    metaTitle: trim(p.meta_title),
    metaDescription: trim(p.meta_description),
    introText: trim(p.intro_text),
    preset: p.preset && typeof p.preset === "object" ? (p.preset as CalcPreset) : null,
    // Tier-1 только при явном true; null/false/отсутствие поля → Tier-2 (без плитки).
    showAsTile: p.show_as_tile === true,
    faq,
  };
}

// Все опубликованные кластерные страницы (для getStaticPaths и плиток хаба).
// Только published (предохранитель против дорвей-перебора, 05 §49).
export async function getPromotedPages(): Promise<PromotedPage[]> {
  try {
    const res = await directusFetch<{ data: any[] }>(
      `/items/promoted_pages?filter[status][_eq]=published&fields=${FIELDS}&sort=sort&limit=-1`,
    );
    return (res.data ?? []).filter((p) => p?.slug && p?.product?.slug).map(mapPage);
  } catch {
    // Коллекции ещё нет / недоступна — пусто (graceful, как в works.ts).
    return [];
  }
}
