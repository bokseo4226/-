import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser configuration with size limit for base64 images
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Default preset recipes to return if API key is missing or model fails
const DEFAULT_RECIPES = [
  {
    id: "rec_1",
    name: "Crispy Avocado Egg Toast",
    description: "A fast, delicious, and energy-boosting toast topped with creamy avocado, perfectly seasoned fried egg, and a drizzle of hot chili oil.",
    difficulty: "Easy" as const,
    prepTime: "10 mins",
    calories: 380,
    dietaryTags: ["Vegetarian"],
    ingredients: [
      { name: "Avocado", amount: "1 ripe", isAvailable: true },
      { name: "Eggs", amount: "2 large", isAvailable: true },
      { name: "Sourdough Bread", amount: "2 slices", isAvailable: true },
      { name: "Cherry Tomatoes", amount: "5-6 halved", isAvailable: false },
      { name: "Chili Flakes / Hot Oil", amount: "1 tsp", isAvailable: true },
      { name: "Lemon", amount: "1/2 squeeze", isAvailable: false }
    ],
    steps: [
      { number: 1, text: "Toast two sliced pieces of rustic sourdough bread to a gorgeous golden-crisp state.", tip: "Drizzle a drop of olive oil before toasting for maximum golden color!" },
      { number: 2, text: "Slice and pit the ripe avocado. Mesh it gently with salt, black pepper, and if available, a pinch of lemon juice in a small container until creamy.", tip: "Keep some chunks for a richer texture." },
      { number: 3, text: "Heat a non-stick skillet over medium-high heat with a little butter or oil. Crack the eggs in. Fry until edges are perfectly crispy but yolk remains runny.", tip: "Cover the pan for 30 seconds if you prefer a set yolk." },
      { number: 4, text: "Spread the mashed seasoned avocado evenly over the warm toasted sourdough slices. Garnish with halved cherry tomatoes if available.", tip: "Tomatoes add a beautiful acidity to cut through avocado creaminess." },
      { number: 5, text: "Carefully slide one fried egg onto each slice. Spark with chili flakes, salt, and black pepper. Drizzle with a thin line of hot chili oil for that professional finish." }
    ]
  },
  {
    id: "rec_2",
    name: "Low-Carb Garlic Butter Salmon with Greens",
    description: "Elegant, buttery, pan-seared salmon served with garlic-sautéed spinach or green veggies. Extremely quick and naturally keto-friendly.",
    difficulty: "Medium" as const,
    prepTime: "18 mins",
    calories: 450,
    dietaryTags: ["Keto", "Gluten-Free"],
    ingredients: [
      { name: "Salmon Fillets", amount: "2 pieces (150g each)", isAvailable: true },
      { name: "Butter", amount: "2 tbsp", isAvailable: true },
      { name: "Garlic Cloves", amount: "4 cloves, minced", isAvailable: true },
      { name: "Fresh Spinach", amount: "3 cups, packed", isAvailable: true },
      { name: "Lemon Juice", amount: "1 tbsp", isAvailable: false },
      { name: "Dill", amount: "1 tsp, chopped", isAvailable: false }
    ],
    steps: [
      { number: 1, text: "Pat salmon fillets completely dry with a paper towel. Season both sides generously with sea salt and coarse black pepper.", tip: "Drying the skin ensures an incredibly crisp sear!" },
      { number: 2, text: "Heat a medium skillet over medium-high heat. Add 1 tablespoon of butter and a splash of olive oil. Place the salmon skin-side down.", tip: "Press lightly with a spatula to prevent skin curling." },
      { number: 3, text: "Sear salmon undisturbed for 4-5 minutes until skin is crispy. Carefully flip and cook for another 3 minutes until nearly done.", tip: "Aim for medium-rare inside so it remains flaky." },
      { number: 4, text: "Lower the heat. Add remaining butter, minced garlic, and lemon juice. Spoon the melted, bubbling garlic butter continuously over the salmon for 1 minute.", tip: "This is called spoon-basting; it cooks the top evenly and infuses flavor." },
      { number: 5, text: "Transfer the salmon to a clean plate. Toss the fresh spinach into the remaining hot garlic butter in the pan, sautéing for 1-2 minutes until wilted. Garnish with dill and serve immediately." }
    ]
  },
  {
    id: "rec_3",
    name: "Classic Garlic Tomato Penne Pasta",
    description: "Comforting, Mediterranean classic pasta celebrating garlic, robust tomato sauce, high-quality extra virgin olive oil, and fresh herbs.",
    difficulty: "Easy" as const,
    prepTime: "15 mins",
    calories: 520,
    dietaryTags: ["Vegetarian", "Vegan"],
    ingredients: [
      { name: "Penne Pasta", amount: "200g", isAvailable: true },
      { name: "Marinara or Tomato Puree", amount: "1.5 cups", isAvailable: true },
      { name: "Garlic Cloves", amount: "3 cloves, sliced", isAvailable: true },
      { name: "Olive Oil", amount: "3 tbsp", isAvailable: true },
      { name: "Fresh Basil", amount: "A handful", isAvailable: false },
      { name: "Parmesan Cheese", amount: "Grated", isAvailable: false }
    ],
    steps: [
      { number: 1, text: "Bring a deep pot of salted water to a boiling state. Cook penne pasta for about 10-11 minutes, until perfectly 'al dente'.", tip: "Always reserve 1/2 cup of pasta cooking water before draining!" },
      { number: 2, text: "While the pasta cooks, heat olive oil in a wide pan over medium-low heat. Add sliced garlic and cook gently until fragrant and slightly pale golden.", tip: "Do not burn garlic or it will turn bitter." },
      { number: 3, text: "Pour in the tomato puree or marinara. Raise the heat slightly and let simmer for 6-8 minutes until rich and reduced. Season with sea salt and black pepper.", tip: "A tiny pinch of sugar balances tomato acidity." },
      { number: 4, text: "Toss the drained hot penne directly into the bubbling tomato garlic sauce. Add 2-3 tablespoons of reserved pasta water to emulsify.", tip: "This binds the sauce beautifully into the pasta tubes." },
      { number: 5, text: "Turn off the heat. Fold in the fresh basil leaves. Drizzle an extra touch of premium olive oil and sprinkle generously with freshly grated parmesan cheese if desired." }
    ]
  }
];

// Initialize GenAI
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// REST route to analyze fridge image or custom inputs
app.post("/api/recipe-generator", async (req, res) => {
  const { image, selectedPreset, dietaryFilters, manualIngredients } = req.body;

  try {
    // If we don't have the API key or model client is uninitialized, return high-quality mock data
    if (!ai) {
      console.warn("GEMINI_API_KEY is not defined. Returning default rich recipes.");
      return res.json({
        ingredients: [
          { name: "Avocado", category: "Produce", isAvailable: true },
          { name: "Eggs", category: "Dairy & Eggs", isAvailable: true },
          { name: "Sourdough Bread", category: "Bakery", isAvailable: true },
          { name: "Salmon", category: "Seafood", isAvailable: true },
          { name: "Butter", category: "Dairy & Eggs", isAvailable: true },
          { name: "Spinach", category: "Produce", isAvailable: true },
          { name: "Penne Pasta", category: "Pantry", isAvailable: true },
          { name: "Garlic Cloves", category: "Produce", isAvailable: true },
          { name: "Tomato Puree", category: "Pantry", isAvailable: true }
        ],
        recipes: DEFAULT_RECIPES,
        source: "local-preset"
      });
    }

    let contentsParts: any[] = [];
    let systemInstruction = `You are a professional chef and recipe creator.
Your job is to analyze the ingredients identified from the user's fridge (either provided via image or manual inputs) and recommend exactly 3 to 5 realistic, delicious, step-by-step recipes.
Make sure you include ratings/metadata for each recipe:
- A difficulty rating strictly restricted to "Easy", "Medium", or "Hard".
- Estimated preparation time as a string (e.g. "20 mins").
- Estimated calorie count per serving as an integer.
- An array of dietaryTags (which can include "Vegetarian", "Keto", "Gluten-Free", "Vegan", "Dairy-Free" etc.).
- A list of ingredients needed for the recipe, with their name, amount, and boolean "isAvailable" flag (marked true if the user possesses this ingredient in the fridge input, false if they need to purchase it).
- Step-by-step instructions. Each step needs a number, text, and an optional chef's "tip" string.

You must respond in structured JSON format matching the schema below:
{
  "ingredients": [
    { "name": "Ingredient Name", "category": "Produce" | "Meat" | "Dairy" | "Pantry" | "Bakery" | "Other", "isAvailable": true }
  ],
  "recipes": [
    {
      "id": "unique_string_id",
      "name": "Recipe Title",
      "description": "Brief flavorful summary",
      "difficulty": "Easy" | "Medium" | "Hard",
      "prepTime": "15 mins",
      "calories": 450,
      "dietaryTags": ["Vegetarian", "Keto"],
      "ingredients": [
        { "name": "Tomatoes", "amount": "3 raw ones", "isAvailable": true }
      ],
      "steps": [
        { "number": 1, "text": "Slice your tomatoes into crisp circles.", "tip": "Use a serrated knife for tomatoes!" }
      ]
    }
  ]
}
Make sure all strings in the JSON are clean and properly escaped. Ensure that the recipes suggested can mostly be completed with ingredients matching the provided user inputs. Include at least 1-2 missing ingredients across the recipes so the user gets to try out the "Shopping List" add feature in the web app!`;

    if (image && image.startsWith("data:")) {
      // Base64 image uploaded
      const mimeMatch = image.match(/^data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const base64Data = image.replace(/^data:[^;]+;base64,/, "");

      contentsParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
      contentsParts.push({
        text: `Analyze this image of an open fridge. Identify the visible food ingredients (like fruits, vegetables, eggs, milk, beers, protein, bread, condiments, butter, cheese, etc.). Then, using those ingredients, generate recipes. If specified, take these dietary restrictions into account: ${dietaryFilters && dietaryFilters.length > 0 ? dietaryFilters.join(", ") : "None"}. Additional manual ingredient hints: ${manualIngredients || "None"}.`
      });
    } else {
      // Text fallback/preset mode
      let presetText = "";
      if (selectedPreset === "veggie") {
        presetText = "Avocados, organic Free-Range Eggs, Spinach, Tomatoes, Butter, Sourdough bread, Lemons, Cheddar cheese, Garlic.";
      } else if (selectedPreset === "meat") {
        presetText = "Salmon fillets, Bacon strips, Butter, Cream, Broccoli heads, Eggs, Garlic, Olive oil, Lemon, Hot sauce.";
      } else if (selectedPreset === "pantry") {
        presetText = "Penne pasta, Tomato sauce, Garlic cloves, Canned chickpeas, Olive oil, Fresh parsley, Oregano, Salt.";
      } else {
        presetText = manualIngredients || "Eggs, Butter, Bread, Cheddar cheese, Garlic, Spinach.";
      }

      contentsParts.push({
        text: `The user's fridge has these ingredients: ${presetText}. Generate recipes using these ingredients. If specified, prioritize these dietary restrictions: ${dietaryFilters && dietaryFilters.length > 0 ? dietaryFilters.join(", ") : "None"}.`
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: contentsParts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response string from Gemini API.");
    }

    try {
      const parsed = JSON.parse(textOutput.trim());
      return res.json({
        ingredients: parsed.ingredients || [],
        recipes: parsed.recipes || [],
        source: "gemini-ai"
      });
    } catch (parseError) {
      console.error("Failed to parse Gemini output as JSON window:", textOutput);
      throw new Error("Invalid structured JSON returned from AI model.");
    }

  } catch (error: any) {
    console.error("Gemini assistant generation error:", error);
    // Gracefully fallback to DEFAULT_RECIPES
    res.json({
      ingredients: [
        { name: "Avocado", category: "Produce", isAvailable: true },
        { name: "Eggs", category: "Dairy & Eggs", isAvailable: true },
        { name: "Sourdough Bread", category: "Bakery", isAvailable: true },
        { name: "Salmon", category: "Seafood", isAvailable: true },
        { name: "Spinach", category: "Produce", isAvailable: true },
        { name: "Penne Pasta", category: "Pantry", isAvailable: true },
        { name: "Garlic Cloves", category: "Produce", isAvailable: true },
        { name: "Tomato Puree", category: "Pantry", isAvailable: true }
      ],
      recipes: DEFAULT_RECIPES,
      source: "local-preset-fallback",
      error: error.message
    });
  }
});

// Setup dev server with Vite after API routes
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
