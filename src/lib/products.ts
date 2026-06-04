import { directusFetch } from "./directus";

export type Product = {
  name: string;
  slug: string;
  icon: string | null;
  category: number; // M2O → id категории
};

type DirectusListResponse<T> = {
  data: T[];
};

// Все опубликованные продукты — для генерации страниц и списков категорий.
export async function getProducts(): Promise<Product[]> {
  const response = await directusFetch<DirectusListResponse<Product>>(
    "/items/products" +
      "?filter[status][_eq]=published" +
      "&fields=name,slug,icon,category" +
      "&sort=sort,name" +
      "&limit=-1",
  );

  return response.data;
}

export type HomeProduct = {
  name: string;
  slug: string;
  icon: string | null;
};

// Продукты для сетки на главной (флаг show_on_home), сгруппированы по категории.
export async function getHomeProducts(): Promise<HomeProduct[]> {
  const response = await directusFetch<DirectusListResponse<HomeProduct>>(
    "/items/products" +
      "?filter[status][_eq]=published" +
      "&filter[show_on_home][_eq]=true" +
      "&fields=name,slug,icon" +
      "&sort=category,name" +
      "&limit=-1",
  );

  return response.data;
}
