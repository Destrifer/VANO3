import { directusFetch, assetUrl } from "./directus";

// «Работа» — самостоятельная единица контента (фото готового изделия), а не
// файл, прицепленный к продукту. Один источник для:
//   • галереи на карточке продукта  → getWorks({ product: slug })
//   • страницы «Примеры работ» /works → getWorks() + клиентский фильтр/поиск
// Модель в Directus: works (M2M → products, M2M → work_tags).

export type WorkRef = { slug: string; name: string };

export type WorkImage = {
  url: string; // полный URL оригинала в Directus (astro:assets оптимизирует на сборке)
  width: number | null; // из метаданных файла → нет CLS, не нужен inferSize
  height: number | null;
  alt: string;
};

export type Work = {
  id: number;
  title: string;
  description: string | null;
  credit: string | null; // авторство → ImageObject.creditText (опц.)
  copyright: string | null; // → ImageObject.copyrightNotice (опц.)
  image: WorkImage;
  products: WorkRef[]; // к каким продуктам относится (фасет фильтра)
  tags: WorkRef[]; // теги/фасеты (материал, постобработка, форма…)
};

type DirectusList<T> = { data: T[] };

type WorkRow = {
  id: number;
  title: string | null;
  description: string | null;
  credit: string | null;
  copyright: string | null;
  image: { id: string; width: number | null; height: number | null; title: string | null } | null;
  products: { products_id: { slug: string; name: string } | null }[] | null;
  tags: { work_tags_id: { slug: string; name: string } | null }[] | null;
};

const FIELDS = [
  "id",
  "title",
  "description",
  "credit",
  "copyright",
  "image.id",
  "image.width",
  "image.height",
  "image.title",
  "products.products_id.slug",
  "products.products_id.name",
  "tags.work_tags_id.slug",
  "tags.work_tags_id.name",
].join(",");

function refs(
  rows: ({ products_id?: WorkRef | null } | { work_tags_id?: WorkRef | null })[] | null,
  key: "products_id" | "work_tags_id",
): WorkRef[] {
  return (rows ?? [])
    .map((r) => (r as Record<string, WorkRef | null | undefined>)[key])
    .filter((x): x is WorkRef => !!x?.slug)
    .map((x) => ({ slug: x.slug, name: x.name }));
}

export async function getWorks(
  opts: { product?: string; limit?: number } = {},
): Promise<Work[]> {
  const params = new URLSearchParams();
  params.set("filter[status][_eq]", "published");
  if (opts.product) {
    // M2M-фильтр: works → junction → products.slug
    params.set("filter[products][products_id][slug][_eq]", opts.product);
  }
  params.set("fields", FIELDS);
  params.set("sort", "sort,id");
  params.set("limit", String(opts.limit ?? -1));

  let rows: WorkRow[] = [];
  try {
    const res = await directusFetch<DirectusList<WorkRow>>(
      `/items/works?${params.toString()}`,
    );
    rows = res.data ?? [];
  } catch {
    // Коллекции ещё нет / Directus недоступен — галерея просто пустая, не падаем.
    return [];
  }

  return rows
    .filter((r): r is WorkRow & { image: NonNullable<WorkRow["image"]> } => !!r.image)
    .map((r) => ({
      id: r.id,
      title: r.title?.trim() || "",
      description: r.description?.trim() || null,
      credit: r.credit?.trim() || null,
      copyright: r.copyright?.trim() || null,
      image: {
        url: assetUrl(r.image.id)!,
        width: r.image.width ?? null,
        height: r.image.height ?? null,
        alt: r.title?.trim() || r.image.title?.trim() || "Пример работы",
      },
      products: refs(r.products, "products_id"),
      tags: refs(r.tags, "work_tags_id"),
    }));
}
