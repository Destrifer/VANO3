const DIRECTUS_URL = "http://localhost:8055";

export async function directusFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${DIRECTUS_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Directus request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
