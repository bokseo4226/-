export interface Ingredient {
  name: string;
  category: string;
  quantity?: string;
  isAvailable: boolean;
}

export interface RecipeStep {
  number: number;
  text: string;
  tip?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  prepTime: string;
  calories: number;
  dietaryTags: string[];
  ingredients: {
    name: string;
    amount: string;
    isAvailable: boolean; // whether user has it in fridge
  }[];
  steps: RecipeStep[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  recipeName?: string;
  bought: boolean;
}
