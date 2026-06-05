export const DIRECTUS_URL = "http://localhost:8055";

// URL картинки-ассета Directus по id файла (или null).
export function assetUrl(id: string | null | undefined): string | null {
  return id ? `${DIRECTUS_URL}/assets/${id}` : null;
}

export async function directusFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${DIRECTUS_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Directus request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
