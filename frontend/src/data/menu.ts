import type { Dish, MenuSection, RestaurantMenu } from '../types';

export const DISHES: Dish[] = [
  { id: 1, name: 'Bruschetta', english: 'Broo-SKET-ta', hindi: 'ब्रू-स्केट-टा', cuisine: 'Italian', description: 'Grilled bread rubbed with garlic, topped with fresh tomatoes and basil.', category: 'Starters', price: '€8' },
  { id: 2, name: 'Bouillabaisse', english: 'BOO-yuh-BAYS', hindi: 'बू-या-बेज़', cuisine: 'French', description: 'Classic Provençal fish stew with saffron, herbs, and rich seafood broth.', category: 'Soups', price: '€16' },
  { id: 3, name: 'Gnocchi al Pesto', english: 'NYOK-ee al PES-toh', hindi: 'न्योक-ई अल पेस्-तो', cuisine: 'Italian', description: 'Pillowy potato dumplings tossed in fresh basil pesto and pine nuts.', category: 'Mains', price: '€18' },
  { id: 4, name: 'Coq au Vin', english: 'KOK oh VAN', hindi: 'कोक ओ वाँ', cuisine: 'French', description: 'Slow-braised chicken in Burgundy wine with mushrooms and pearl onions.', category: 'Mains', price: '€24' },
  { id: 5, name: 'Crème Brûlée', english: 'krem broo-LAY', hindi: 'क्रेम ब्रू-ले', cuisine: 'French', description: 'Silky vanilla custard beneath a perfectly caramelized sugar crust.', category: 'Desserts', price: '€9' },
  { id: 6, name: 'Paella Valenciana', english: 'pah-AY-yah val-en-THEE-ah-nah', hindi: 'पा-एल-या वा-लेन-सी-आ-ना', cuisine: 'Spanish', description: 'Saffron-kissed rice with rabbit, chicken, and vegetables from Valencia.', category: 'Mains', price: '€28' },
  { id: 7, name: 'Gyoza', english: 'gyoh-ZAH', hindi: 'ग्यो-ज़ा', cuisine: 'Japanese', description: 'Crispy pan-fried dumplings filled with pork and napa cabbage.', category: 'Starters', price: '€10' },
];

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Starters',
    items: [
      { name: 'Bruschetta', price: '€8', dish: DISHES[0] },
      { name: 'Caprese Salad', price: '€12', dish: null },
      { name: 'Gyoza', price: '€10', dish: DISHES[6] },
    ],
  },
  {
    title: 'Soups',
    items: [
      { name: 'Bouillabaisse', price: '€16', dish: DISHES[1] },
      { name: 'French Onion Soup', price: '€11', dish: null },
    ],
  },
  {
    title: 'Mains',
    items: [
      { name: 'Gnocchi al Pesto', price: '€18', dish: DISHES[2] },
      { name: 'Coq au Vin', price: '€24', dish: DISHES[3] },
      { name: 'Paella Valenciana', price: '€28', dish: DISHES[5] },
      { name: 'Grilled Atlantic Salmon', price: '€26', dish: null },
    ],
  },
  {
    title: 'Desserts',
    items: [
      { name: 'Crème Brûlée', price: '€9', dish: DISHES[4] },
      { name: 'Tiramisu', price: '€8', dish: null },
    ],
  },
];

/** Mock menu returned by the API layer when no backend is configured. */
export const MOCK_MENU: RestaurantMenu = {
  restaurant: {
    name: 'Café Lumière',
    tagline: 'Fine Mediterranean Cuisine',
    established: '1987',
  },
  dishCount: DISHES.length,
  dishes: DISHES,
  sections: MENU_SECTIONS,
};

export const CATEGORIES = ['All', 'Starters', 'Soups', 'Mains', 'Desserts'];
