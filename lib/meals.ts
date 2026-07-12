import { supabase } from "./supabase-client";

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
  type: string;
  time: string;
  items: FoodItem[];
  date: string;
};

export const CALORIE_GOAL = 2000;

export const MACRO_GOALS = {
  protein: 80,
  carbs: 250,
  fat: 65,
} as const;

type WindowColorSet = { bg: string; text: string; border: string; activeBg: string };

const WINDOW_COLORS: Record<string, WindowColorSet> = {
  "Early Morning": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-400", activeBg: "bg-indigo-500" },
  Breakfast: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-400", activeBg: "bg-orange-500" },
  "Mid-Morning": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-400", activeBg: "bg-amber-500" },
  Lunch: { bg: "bg-green-50", text: "text-green-800", border: "border-green-600", activeBg: "bg-[#166534]" },
  Afternoon: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-400", activeBg: "bg-teal-600" },
  Evening: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-500", activeBg: "bg-blue-500" },
  Dinner: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-500", activeBg: "bg-purple-600" },
  "Late Night": { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-400", activeBg: "bg-slate-600" },
};

export function getWindowColor(label: string): WindowColorSet {
  return WINDOW_COLORS[label] ?? WINDOW_COLORS["Late Night"];
}

export function getTimeWindowLabel(date: Date): string {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 4 && hour < 7) return "Early Morning";
  if (hour >= 7 && hour < 10) return "Breakfast";
  if (hour >= 10 && hour < 12) return "Mid-Morning";
  if (hour >= 12 && hour < 15) return "Lunch";
  if (hour >= 15 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 19) return "Evening";
  if (hour >= 19 && hour < 22) return "Dinner";
  return "Late Night";
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type FoodMacros = { calories: number; protein: number; carbs: number; fat: number };

// Kept as a last-resort fallback if the food_library table is ever unreachable.
const MOCK_FOOD_DB: Record<string, FoodMacros> = {
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

type FoodLibraryRow = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

// Short everyday words -> exact food_library item name.
// Longer/more specific phrases (rajma, chana masala, vada pav) are matched
// directly against the library names further down, no alias needed.
const LIBRARY_ALIASES: Record<string, string> = {
  roti: "Roti (Phulka)",
  dal: "Dal Tadka",
  sabzi: "Mixed Veg",
  rice: "Steamed Rice",
  poha: "Poha",
  paneer: "Paneer Bhurji",
  idli: "Idli",
  dosa: "Dosa (plain)",
  chai: "Chai (with milk)",
  samosa: "Samosa",
  lassi: "Lassi (sweet)",
  coffee: "Black Coffee",
  upma: "Upma",
  khichdi: "Khichdi",
  paratha: "Paratha (Plain)",
  puri: "Puri",
  curd: "Dahi (Curd)",
  dahi: "Dahi (Curd)",
  milk: "Milk (full fat)",
};

let libraryCache: FoodLibraryRow[] | null = null;

async function getFoodLibrary(): Promise<FoodLibraryRow[]> {
  if (libraryCache) return libraryCache;
  const { data, error } = await supabase
    .from("food_library")
    .select("name, calories, protein_g, carbs_g, fat_g");

  if (error || !data) {
    libraryCache = [];
    return libraryCache;
  }

  libraryCache = data as FoodLibraryRow[];
  return libraryCache;
}

function libraryRowToMacros(row: FoodLibraryRow): FoodMacros {
  return {
    calories: Number(row.calories),
    protein: Number(row.protein_g),
    carbs: Number(row.carbs_g),
    fat: Number(row.fat_g),
  };
}

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
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_date: string;
  created_at: string;
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
  const groups = new Map<string, DbRow[]>();
  for (const row of rows) {
    const key = row.created_at;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const meals: LoggedMeal[] =
