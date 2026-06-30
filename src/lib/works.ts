import { directusFetch, DIRECTUS_PUBLIC_URL } from "./directus";
import { slugify } from "./translit";

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
  directus_files_id: {
    id: string;
    width: number | null;
    height: number | null;
    title: string | null;
    filename_download: string | null;
  } | null;
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
  "gallery.directus_files_id.title",
  "gallery.directus_files_id.filename_download",
].join(",");

// URL ассета галереи с человекочитаемым именем-сегментом: Directus отдаёт файл
// по /assets/<id>/<name>, а astro:assets берёт <name> для имени деривата на сборке
// (→ _astro/<slug>.<hash>.avif вместо uuid). На рендер/доступ не влияет.
function galleryUrl(id: string, slug: string): string {
  return `${DIRECTUS_PUBLIC_URL}/assets/${id}/${slug}.jpg`;
}

// Подпись фото: своя (caption/alt) приоритетнее. Авто-заголовок Directus (= имя
// файла словами) считаем мусором и не показываем.
function humanCaption(
  caption: string | null,
  title: string | null,
  filenameDownload: string | null,
): string {
  const c = caption?.trim();
  if (c) return c;
  const t = title?.trim();
  if (!t) return "";
  const st = slugify(t);
  const sf = slugify(filenameDownload || "");
  // заголовок — это просто имя файла (авто) → не подпись
  return st && sf.includes(st) ? "" : t;
}

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
    .map((g, i) => {
      const f = g.directus_files_id;
      const caption = humanCaption(g.caption, f.title, f.filename_download);
      // alt: явный alt → подпись → осмысленный фолбэк (не «сырое» имя файла)
      const alt = g.alt?.trim() || caption || `${p.name} — пример работы`;
      // слаг для имени картинки: из подписи, иначе «<продукт>-N»
      const slug = slugify(caption) || `${p.slug}-${i + 1}`;
      return {
        id: `${p.slug}:${f.id}`,
        title: caption,
        description: null,
        credit: null,
        copyright: null,
        image: {
          url: galleryUrl(f.id, slug),
          width: f.width ?? null,
          height: f.height ?? null,
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
