import { directusFetch } from "./directus";

export type Category = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
};

type DirectusListResponse<T> = {
  data: T[];
};

export async function getCategories(): Promise<Category[]> {
  const response = await directusFetch<DirectusListResponse<Category>>(
    "/items/categories" +
      "?filter[status][_eq]=published" + // только опубликованные
      "&sort=sort,name" + // сначала ручной порядок, затем по имени как запасной
      "&fields=id,name,slug,icon", // тянем только нужное, не весь объект
  );

  return response.data;
}

export type MenuProduct = {
  name: string;
  slug: string;
  icon: string | null;
};

export type MenuCategory = Category & {
  products: MenuProduct[];
};

type MenuProductRow = MenuProduct & {
  category: number; // M2O возвращает id связанной категории
};

// Категории + их курированные продукты (show_in_menu) — для выпадашек в шапке.
export async function getMenu(): Promise<MenuCategory[]> {
  const categories = await getCategories();

  const response = await directusFetch<DirectusListResponse<MenuProductRow>>(
    "/items/products" +
      "?filter[status][_eq]=published" +
      "&filter[show_in_menu][_eq]=true" + // только курированные пункты
      "&fields=name,slug,icon,category" +
      "&sort=sort,name" +
      "&limit=-1", // без лимита по умолчанию
  );

  // группируем строки продуктов по id категории
  const rowsByCategory = new Map<number, MenuProductRow[]>();
  for (const row of response.data) {
    const list = rowsByCategory.get(row.category) ?? [];
    list.push(row);
    rowsByCategory.set(row.category, list);
  }

  return categories.map((category) => ({
    ...category,
    products: (rowsByCategory.get(category.id) ?? []).map((row) => ({
      name: row.name,
      slug: row.slug,
      icon: row.icon ?? category.icon, // фолбэк: иконка продукта → иконка категории
    })),
  }));
}
