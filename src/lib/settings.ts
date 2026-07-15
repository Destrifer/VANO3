import { directusFetch } from "./directus";

export type Settings = {
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  telegram_url: string | null;
  whatsapp_url: string | null;
  map_lat: number | null;
  map_lng: number | null;
  map_zoom: number | null;
  cutoff_hour: number | null; // час отсечки приёма в работу (для «срока готовности»)
  free_delivery_threshold: number | null; // ₽: от этой суммы курьер по Москве бесплатно (0/null → выкл)
};

// Синглтон: /items/settings возвращает ОДИН объект (не массив).
export async function getSettings(): Promise<Settings> {
  const response = await directusFetch<{ data: Settings }>("/items/settings");
  return response.data;
}
