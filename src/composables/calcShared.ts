import type { InjectionKey } from "vue";
import type { PriceResult, Sides } from "../lib/pricing/engine";
import type { ProductPricing } from "../lib/pricing/data";
import type { SpecInput } from "../lib/pricing/spec";
import type { Preflight } from "../lib/preflight";

// Общий контракт калькулятора для компонентов, не зависящих от стратегии
// (плашка заказа, загрузка макета). Каждый конфигуратор (листовой /
// многостраничный) кладёт свой объект под sharedKey, а специфичные поля берут
// своё состояние через собственный типизированный ключ (calcKey / mpCalcKey).
export type DetailRow = { label: string; value: string };

export interface SharedCalc {
  product: ProductPricing;
  dims: { w: number; h: number };
  sides: Sides; // для preflight загрузки макета (стороны печати)
  totalQty: number;
  result: PriceResult | null;
  money: (n: number) => string;
  details: () => DetailRow[]; // строки параметров для корзины/плашки
  currentSpec: () => SpecInput; // спек без productSlug (его добавит плашка)
  artworkId: string | null;
  artworkName: string | null;
  artworkPreflight: Preflight | null;
  setThumbProvider: (fn: () => string | null) => void;
  captureThumb: () => string | null;
}

export const sharedKey: InjectionKey<SharedCalc> = Symbol("sharedCalc");
