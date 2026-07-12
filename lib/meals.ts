import { supabase } from "./supabase-client";

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export type FoodItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type LoggedMeal = {
  id: string;
  type: MealType;
  items: FoodItem[];
  date: string;
};

export const CALORIE_GOAL = 2000;

export const MACRO_GOALS = {
  protein: 80,
  carbs: 250,
  fat: 65,
} as const;

export const MEAL_TYPES: MealType[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
];

export const MEAL_TYPE_COLORS: Record<
  MealType,
  { bg: string; text: string; border: string; activeBg: string }
> = {
  Breakfast: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-400",
    activeBg: "bg-orange-500",
  },
  Lunch: {
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-600",
    activeBg: "bg-[#166534]",
  },
  Dinner: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-500",
    activeBg: "bg-purple-600",
  },
  Snack: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-500",
    activeBg: "bg-blue-500",
  },
};

const MOCK_FOOD_DB: Record<
  string,
  { calories: number; protein: number; carbs: number; fat: number }
> = {
  roti: { calories: 100, protein: 3, carbs: 18, fat: 2 },
  dal: { calories: 180, protein: 10, carbs: 24, fat: 4 },
  sabzi: { calories: 150, protein: 4, carbs: 12, fat: 8 },
  rice: { calories: 210, protein: 4, carbs: 45, fat: 1 },
  poha: { calories: 280, protein: 8, carbs: 42, fat: 9 },
  paneer: { calories: 320, protein: 22, carbs: 8, fat: 24 },
  idli: { calories: 120, protein: 4, carbs: 24, fat: 1 },
  dosa: { calories: 250, protein: 6, carbs: 38, fat: 8 },
  chai: { calories: 80, protein: 2, carbs: 12, fat: 3 },
  naan: { calories: 260, protein: 8, carbs: 42, fat: 6 },
  samosa: { calories: 140, protein: 3, carbs: 16, fat: 8 },
  lassi: { calories: 150, protein: 5, carbs: 22, fat: 4 },
};

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

type DbRow = {
  id: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_date: string;
};

function rowToFoodItem(row: DbRow): FoodItem {
  return {
    id: row.id,
    name: row.food_name,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
  };
}

function groupRowsIntoMeals(rows: DbRow[], date: string): LoggedMeal[] {
  const byType: Record<MealType, FoodItem[]> = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snack: [],
  };
  for (const row of rows) {
    byType[row.meal_type].push(rowToFoodItem(row));
  }
  return MEAL_TYPES.filter((type) => byType[type].length > 0).map((type) => ({
    id: `${type}-${date}`,
    type,
    items: byType[type],
    date,
  }));
}

export async function loadTodayMeals(): Promise<LoggedMeal[]> {
  const userId = await getUserId();
  const today = getTodayDate();
  const { data, error } = await supabase
    .from("logged_meals")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_date", today)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return groupRowsIntoMeals((data ?? []) as DbRow[], today);
}

export async function saveMeal(
  type: MealType,
  items: Omit<FoodItem, "id">[]
): Promise<LoggedMeal> {
  const userId = await getUserId();
  const today = getTodayDate();

  const rows = items.map((item) => ({
    user_id: userId,
    meal_type: type,
    food_name: item.name,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    logged_date: today,
  }));

  const { data, error } = await supabase
    .from("logged_meals")
    .insert(rows)
    .select();

  if (error) throw error;

  window.dispatchEvent(new Event("meals-updated"));

  return {
    id: `${type}-${today}`,
    type,
    items: (data as DbRow[]).map(rowToFoodItem),
    date: today,
  };
}

export async function clearTodayMeals(): Promise<void> {
  const userId = await getUserId();
  const today = getTodayDate();

  const { error } = await supabase
    .from("logged_meals")
    .delete()
    .eq("user_id", userId)
    .eq("logged_date", today);

  if (error) throw error;
  window.dispatchEvent(new Event("meals-updated"));
}

export async function deleteFoodItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from("logged_meals")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
  window.dispatchEvent(new Event("meals-updated"));
}

export async function updateFoodItem(
  itemId: string,
  updates: { name: string; calories: number }
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("logged_meals")
    .select("*")
    .eq("id", itemId)
    .single();

  if (fetchError) throw fetchError;

  const row = existing as DbRow;
  const oldCalories = Number(row.calories);
  const ratio = oldCalories > 0 ? updates.calories / oldCalories : 1;

  const { error: updateError } = await supabase
    .from("logged_meals")
    .update({
      food_name: updates.name,
      calories: updates.calories,
      protein: Math.round(Number(row.protein) * ratio * 10) / 10,
      carbs: Math.round(Number(row.carbs) * ratio * 10) / 10,
      fat: Math.round(Number(row.fat) * ratio * 10) / 10,
    })
    .eq("id", itemId);

  if (updateError) throw updateError;
  window.dispatchEvent(new Event("meals-updated"));
}

export function buildMealSummary(meals: LoggedMeal[]) {
  const totals = computeTotals(meals);
  const grouped = groupMealsByType(meals);
  return {
    totals,
    meals: MEAL_TYPES.filter((type) => grouped[type].length > 0).map(
      (type) => ({
        type,
        items: grouped[type].map((item) => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        })),
      })
    ),
  };
}

export function mockParseMeal(input: string): Omit<FoodItem, "id">[] {
  const parts = input
    .toLowerCase()
    .split(/[,+&]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return [];

  return parts.map((part) => {
    const match = Object.keys(MOCK_FOOD_DB).find((key) => part.includes(key));
    const qtyMatch = part.match(/(\d+)/);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    if (match) {
      const base = MOCK_FOOD_DB[match];
      return {
        name: part.charAt(0).toUpperCase() + part.slice(1),
        calories: base.calories * qty,
        protein: base.protein * qty,
        carbs: base.carbs * qty,
        fat: base.fat * qty,
      };
    }

    return { name: part, calories: 120, protein: 3, carbs: 15, fat: 4 };
  });
}

export function computeTotals(meals: LoggedMeal[]) {
  return meals
    .flatMap((m) => m.items)
    .reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
}

export function groupMealsByType(
  meals: LoggedMeal[]
): Record<MealType, FoodItem[]> {
  const groups: Record<MealType, FoodItem[]> = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snack: [],
  };
  for (const meal of meals) {
    groups[meal.type].push(...meal.items);
  }
  return groups;
}

export function getAllFoodItems(meals: LoggedMeal[]): FoodItem[] {
  return meals.flatMap((m) => m.items);
}

export function getMacroTrafficColor(consumed: number, goal: number): string {
  const ratio = consumed / goal;
  if (ratio > 1) return "#ef4444";
  if (ratio >= 0.8) return "#f59e0b";
  return "#22c55e";
}

export function getRingGradientId(progressRatio: number): string {
  const pct = progressRatio * 100;
  if (pct >= 90) return "ring-gradient-red";
  if (pct >= 70) return "ring-gradient-orange";
  return "ring-gradient-green";
}

export function getFoodEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("dal") || n.includes("lentil")) return "🍲";
  if (
    n.includes("roti") ||
    n.includes("naan") ||
    n.includes("bread") ||
    n.includes("dosa") ||
    n.includes("idli")
  )
    return "🫓";
  if (n.includes("rice") || n.includes("poha")) return "🍚";
  if (
    n.includes("sabzi") ||
    n.includes("gobi") ||
    n.includes("vegetable") ||
    n.includes("salad") ||
    n.includes("aloo")
  )
    return "🥗";
  if (
    n.includes("paneer") ||
    n.includes("raita") ||
    n.includes("dairy") ||
    n.includes("lassi") ||
    n.includes("curd")
  )
    return "🧀";
  if (
    n.includes("chai") ||
    n.includes("tea") ||
    n.includes("coffee") ||
    n.includes("beverage")
  )
    return "☕";
  if (n.includes("samosa") || n.includes("snack") || n.includes("pakora"))
    return "🥟";
  if (
    n.includes("sweet") ||
    n.includes("kheer") ||
    n.includes("halwa") ||
    n.includes("jalebi") ||
    n.includes("gulab")
  )
    return "🍮";
  return "🥗";
}
