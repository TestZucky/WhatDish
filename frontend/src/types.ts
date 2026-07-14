export type Screen =
  | 'landing'
  | 'camera'
  | 'processing'
  | 'menu'
  | 'edit'
  | 'error';

export type ErrorType = 'blurry' | 'nodish' | 'audio';

export type MenuView = 'image' | 'list';

export interface Dish {
  id: number;
  name: string;
  /** Phonetic English pronunciation, e.g. "Broo-SKET-ta". */
  english: string;
  /** Devanagari (Hindi) phonetic pronunciation. */
  hindi: string;
  cuisine: string;
  description: string;
  category: string;
  price: string;
  /** Optional URL to pre-generated pronunciation audio (filled in by the backend). */
  audioUrl?: string;
}

export interface MenuItem {
  name: string;
  price: string;
  /** The enriched dish, or null when it hasn't been recognized/enriched. */
  dish: Dish | null;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export interface Restaurant {
  name: string;
  tagline: string;
  established?: string;
}

/** The full result of scanning a menu — the shape the backend should return. */
export interface RestaurantMenu {
  restaurant: Restaurant;
  dishCount: number;
  dishes: Dish[];
  sections: MenuSection[];
}
