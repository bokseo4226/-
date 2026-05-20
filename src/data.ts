export interface PresetFridge {
  id: string;
  name: string;
  description: string;
  keywords: string;
  dietaryRecommendation: string;
  emoji: string;
  colorTheme: string;
  ingredients: string[];
}

export const PRESET_FRIDGES: PresetFridge[] = [
  {
    id: "veggie",
    name: "Green Harvest Fridge",
    description: "Packed with crisp organic produce, sourdough bread, eggs, and healthy fats.",
    keywords: "Avocados, Spinach, Organic Eggs, Sourdough Bread, Tomatoes, Butter, Cheddar, Garlic",
    dietaryRecommendation: "Vegetarian / Whole Food",
    emoji: "🥑",
    colorTheme: "border-emerald-200 bg-emerald-50 text-emerald-800",
    ingredients: ["Avocado", "Organic Eggs", "Spinach", "Tomatoes", "Sourdough bread", "Butter", "Cheddar Cheese", "Garlic"]
  },
  {
    id: "meat",
    name: "Fisherman's Wharf Fridge",
    description: "Rich in high-quality salmon, crispy bacon, dairy, and low-carb vegetables.",
    keywords: "Salmon Fillets, Crisp Bacon, Butter, Broccoli, Cream, Eggs, Garlic, Lemon, Olive Oil",
    dietaryRecommendation: "Keto / Low-Carb / Gluten-Free",
    emoji: "🥩",
    colorTheme: "border-amber-200 bg-amber-50 text-amber-800",
    ingredients: ["Salmon Fillets", "Bacon strips", "Butter", "Cream", "Broccoli", "Eggs", "Garlic", "Olive oil", "Lemon"]
  },
  {
    id: "pantry",
    name: "Pantry Essentials Stock",
    description: "Classic comforting ingredients, dry noodles, robust tomato sauce, and aromatics.",
    keywords: "Penne Pasta, Tomato Sauce, Garlic Cloves, Olive Oil, Canned Chickpeas, Oregano",
    dietaryRecommendation: "Vegan / Comfort / Low Cost",
    emoji: "🍝",
    colorTheme: "border-sky-200 bg-sky-50 text-sky-800",
    ingredients: ["Penne Pasta", "Tomato Puree", "Garlic Cloves", "Olive Oil", "Canned Chickpeas", "Basil", "Oregano"]
  }
];
