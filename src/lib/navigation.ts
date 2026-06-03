import { directusFetch } from "./directus";

type NavigationItem = {
  label: string;
  href: string;
};

type DirectusListResponse<T> = {
  data: T[];
};

type NavigationResponse = DirectusListResponse<NavigationItem>;

export async function getNavigationItems(): Promise<NavigationItem[]> {
  const response = await directusFetch<NavigationResponse>(
    "/items/navigation_items?filter[is_active][_eq]=true",
  );

  return response.data;
}
