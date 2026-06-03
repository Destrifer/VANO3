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
