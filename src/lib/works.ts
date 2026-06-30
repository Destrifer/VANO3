import { directusFetch, assetUrl } from "./directus";

// «Работа» = одно фото из ГАЛЕРЕИ продукта (`products.gallery`, M2M → файлы).
// Раньше была отдельная коллекция works; теперь единый источник — галерея
// продукта, а /works собирается агрегатом всех галерей. Один источник для:
//   • галереи на карточке продукта  → getWorks({ product: slug })
//   • страницы «Примеры работ» /works → getWorks() + клиентский фильтр/поиск
// Контракт типа Work сохранён, чтобы Gallery/WorkCard/страницы не менялись.

export type WorkRef = { slug: string; name: string };

export type WorkImage = {
  url: string; // полный URL оригинала в Directus (astro:assets оптимизирует на сборке)
  width: number | null; // из метаданных файла → нет CLS, не нужен inferSize
  height: number | null;
  alt: string;
};

export type Work = {
  id: string; // уникальный ключ «продукт:файл»
  title: string; // подпись (caption); может быть пустой
  description: string | null;
  credit: string | null;
  copyright: string | null;
  image: WorkImage;
  products: WorkRef[]; // продукт-владелец (для фасета фильтра/поиска)
  category: WorkRef | null; // категория продукта (фасет фильтра)
  tags: WorkRef[]; // зарезервировано (теги по фото пока не вводим)
};

type DirectusList<T> = { data: T[] };

type GalleryRow = {
  sort: number | null;
  caption: string | null;
  alt: string | null;
  directus_files_id: { id: string; width: number | null; height: number | null } | null;
};
type ProductRow = {
  name: string;
  slug: string;
  category: { name: string | null; slug: string | null } | null;
  gallery: GalleryRow[] | null;
};

const FIELDS = [
  "name",
  "slug",
  "category.name",
  "category.slug",
  "gallery.sort",
  "gallery.caption",
  "gallery.alt",
  "gallery.directus_files_id.id",
  "gallery.directus_files_id.width",
  "gallery.directus_files_id.height",
].join(",");

// Один продукт → плоский список Work (по одному на фото галереи).
function rowToWorks(p: ProductRow): Work[] {
  const product: WorkRef = { slug: p.slug, name: p.name };
  const category: WorkRef | null =
    p.category?.slug ? { slug: p.category.slug, name: p.category.name ?? p.category.slug } : null;

  return (p.gallery ?? [])
    .filter(
      (g): g is GalleryRow & { directus_files_id: NonNullable<GalleryRow["directus_files_id"]> } =>
        !!g.directus_files_id,
    )
    .sort((a, b) => (a.sort ?? 1e9) - (b.sort ?? 1e9)) // порядок из поля sort
    .map((g) => {
      const caption = g.caption?.trim() || "";
      // alt: явный alt → подпись → осмысленный фолбэк (не показываем «сырое» имя файла)
      const alt = g.alt?.trim() || caption || `${p.name} — пример работы`;
      return {
        id: `${p.slug}:${g.directus_files_id.id}`,
        title: caption,
        description: null,
        credit: null,
        copyright: null,
        image: {
          url: assetUrl(g.directus_files_id.id)!,
          width: g.directus_files_id.width ?? null,
          height: g.directus_files_id.height ?? null,
          alt,
        },
        products: [product],
        category,
        tags: [],
      };
    });
}

export async function getWorks(
  opts: { product?: string; limit?: number } = {},
): Promise<Work[]> {
  const params = new URLSearchParams();
  params.set("filter[status][_eq]", "published");
  if (opts.product) params.set("filter[slug][_eq]", opts.product);
  params.set("fields", FIELDS);
  params.set("sort", "sort,name");
  params.set("limit", String(opts.limit ?? -1));

  let rows: ProductRow[] = [];
  try {
    const res = await directusFetch<DirectusList<ProductRow>>(
      `/items/products?${params.toString()}`,
    );
    rows = res.data ?? [];
  } catch {
    // Directus недоступен — галерея просто пустая, не падаем.
    return [];
  }

  return rows.flatMap(rowToWorks);
}
