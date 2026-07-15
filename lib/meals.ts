import { supabase } from "./supabase-client";

export type FoodItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isEstimated: boolean;
};

export type LoggedMeal = {
  id: string;
  type: string;
  time: string;
  items: FoodItem[];
  date: string;
};

export type DayTotal = {
  date: string;
  dayLabel: string;
  calories: number;
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

export const TIME_WINDOWS: string[] = Object.keys(WINDOW_COLORS);

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

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type FoodMacros = { calories: number; protein: number; carbs: number; fat: number };

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

const COMBO_DISHES: Record<string, string[]> = {
  "chole bhature": ["chickpeas curry", "bhatura"],
  "chana bhatura": ["chickpeas curry", "bhatura"],
  "chole chawal": ["chickpeas curry", "steamed rice"],
  "chana chawal": ["chickpeas curry", "steamed rice"],
  "rajma chawal": ["rajma", "steamed rice"],
  "dal chawal": ["dal tadka", "steamed rice"],
  "dal rice": ["dal tadka", "steamed rice"],
  "kadhi chawal": ["kadhi", "steamed rice"],
  "poha jalebi": ["poha", "jalebi"],
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

function findLibraryRow(library: FoodLibraryRow[], searchTerm: string): FoodLibraryRow | undefined {
  return library.find((r) => r.name.toLowerCase().includes(searchTerm));
}

export function getTodayDate(): string {
  return toLocalDateString(new Date());
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
  is_estimated: boolean;
};

function rowToFoodItem(row: DbRow): FoodItem {
  return {
    id: row.id,
    name: row.food_name,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    isEstimated: Boolean(row.is_estimated),
  };
}

function groupRowsIntoMeals(rows: DbRow[], date: string): LoggedMeal[] {
  const groups = new Map<string, DbRow[]>();
  for (const row of rows) {
    const key = row.created_at;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const meals: LoggedMeal[] = Array.from(groups.entries()).map(([createdAt, groupRows]) => {
    const time = new Date(createdAt);
    return {
      id: createdAt,
      type: groupRows[0].meal_type,
      time: formatClockTime(time),
      items: groupRows.map(rowToFoodItem),
      date,
    };
  });

  meals.sort((a, b) => (a.id < b.id ? -1 : 1));
  return meals;
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
  items: Omit<FoodItem, "id">[],
  windowOverride?: string
): Promise<LoggedMeal> {
  const userId = await getUserId();
  const today = getTodayDate();
  const now = new Date();
  const windowLabel = windowOverride ?? getTimeWindowLabel(now);

  const rows = items.map((item) => ({
    user_id: userId,
    meal_type: windowLabel,
    food_name: item.name,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    logged_date: today,
    is_estimated: item.isEstimated,
  }));

  const { data, error } = await supabase.from("logged_meals").insert(rows).select();

  if (error) throw error;

  window.dispatchEvent(new Event("meals-updated"));

  const inserted = data as DbRow[];
  const createdAt = inserted[0]?.created_at ?? now.toISOString();

  return {
    id: createdAt,
    type: windowLabel,
    time: formatClockTime(new Date(createdAt)),
    items: inserted.map(rowToFoodItem),
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
  const { error } = await supabase.from("logged_meals").delete().eq("id", itemId);

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

export async function getStreak(): Promise<number> {
  const userId = await getUserId();
  const { data, error } = await supabase.from("logged_meals").select("logged_date").eq("user_id", userId);

  if (error) throw error;

  const dateSet = new Set((data ?? []).map((r) => r.logged_date as string));
  if (dateSet.size === 0) return 0;

  const todayStr = getTodayDate();
  const cursor = new Date();
  if (!dateSet.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = toLocalDateString(cursor);
    if (dateSet.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export async function getLast7DaysTotals(): Promise<DayTotal[]> {
  const userId = await getUserId();

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 6);
  const startStr = toLocalDateString(startDate);

  const { data, error } = await supabase
    .from("logged_meals")
    .select("logged_date, calories")
    .eq("user_id", userId)
    .gte("logged_date", startStr);

  if (error) throw error;

  const totalsByDate = new Map<string, number>();
  for (const row of (data ?? []) as { logged_date: string; calories: number }[]) {
    const prev = totalsByDate.get(row.logged_date) ?? 0;
    totalsByDate.set(row.logged_date, prev + Number(row.calories));
  }

  const days: DayTotal[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateString(d);
    days.push({
      date: dateStr,
      dayLabel: d.toLocaleDateString([], { weekday: "short" }),
      calories: Math.round(totalsByDate.get(dateStr) ?? 0),
    });
  }

  return days;
}

export function buildMealSummary(meals: LoggedMeal[]) {
  const totals = computeTotals(meals);
  return {
    totals,
    meals: meals.map((meal) => ({
      type: meal.type,
      time: meal.time,
      items: meal.items.map((item) => ({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    })),
  };
}

export async function parseMeal(input: string): Promise<Omit<FoodItem, "id">[]> {
  const parts = input
    .toLowerCase()
    .split(/[,+&]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return [];

  const library = await getFoodLibrary();

  const sortedComboKeys = Object.keys(COMBO_DISHES).sort((a, b) => b.length - a.length);
  const sortedAliasKeys = Object.keys(LIBRARY_ALIASES).sort((a, b) => b.length - a.length);

  return parts.map((part) => {
    const qtyMatch = part.match(/(\d+)/);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
    const displayName = part.charAt(0).toUpperCase() + part.slice(1);

    const comboKey = sortedComboKeys.find((key) => part.includes(key));
    if (comboKey) {
      const componentTerms = COMBO_DISHES[comboKey];
      const componentRows = componentTerms.map((term) => findLibraryRow(library, term));
      if (componentRows.every((r) => r !== undefined)) {
        const combined = componentRows.reduce(
          (acc, row) => {
            const m = libraryRowToMacros(row!);
            return {
              calories: acc.calories + m.calories,
              protein: acc.protein + m.protein,
              carbs: acc.carbs + m.carbs,
              fat: acc.fat + m.fat,
            };
          },
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        return {
          name: displayName,
          calories: combined.calories * qty,
          protein: combined.protein * qty,
          carbs: combined.carbs * qty,
          fat: combined.fat * qty,
          isEstimated: false,
        };
      }
    }

    const aliasKey = sortedAliasKeys.find((key) => part.includes(key));

    if (aliasKey) {
      const targetName = LIBRARY_ALIASES[aliasKey];
      const row = library.find((r) => r.name === targetName);
      if (row) {
        const base = libraryRowToMacros(row);
        return {
          name: displayName,
          calories: base.calories * qty,
          protein: base.protein * qty,
          carbs: base.carbs * qty,
          fat: base.fat * qty,
          isEstimated: false,
        };
      }

      const mockKey = Object.keys(MOCK_FOOD_DB).find((key) => part.includes(key));
      if (mockKey) {
        const base = MOCK_FOOD_DB[mockKey];
        return {
          name: displayName,
          calories: base.calories * qty,
          protein: base.protein * qty,
          carbs: base.carbs * qty,
          fat: base.fat * qty,
          isEstimated: true,
        };
      }

      return { name: displayName, calories: 120, protein: 3, carbs: 15, fat: 4, isEstimated: true };
    }

    const directMatch = library.find((r) => part.includes(r.name.split(" (")[0].toLowerCase()));
    if (directMatch) {
      const base = libraryRowToMacros(directMatch);
      return {
        name: displayName,
        calories: base.calories * qty,
        protein: base.protein * qty,
        carbs: base.carbs * qty,
        fat: base.fat * qty,
        isEstimated: false,
      };
    }

    const mockKey = Object.keys(MOCK_FOOD_DB).find((key) => part.includes(key));
    if (mockKey) {
      const base = MOCK_FOOD_DB[mockKey];
      return {
        name: displayName,
        calories: base.calories * qty,
        protein: base.protein * qty,
        carbs: base.carbs * qty,
        fat: base.fat * qty,
        isEstimated: true,
      };
    }

    return { name: displayName, calories: 120, protein: 3, carbs: 15, fat: 4, isEstimated: true };
  });
}

export function computeTotals(meals: LoggedMeal[]) {
  const raw = meals.flatMap((m) => m.items).reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  return {
    calories: Math.round(raw.calories),
    protein: Math.round(raw.protein * 10) / 10,
    carbs: Math.round(raw.carbs * 10) / 10,
    fat: Math.round(raw.fat * 10) / 10,
  };
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
  if (n.includes("roti") || n.includes("naan") || n.includes("bread") || n.includes("dosa") || n.includes("idli"))
    return "🫓";
  if (n.includes("rice") || n.includes("poha")) return "🍚";
  if (n.includes("sabzi") || n.includes("gobi") || n.includes("vegetable") || n.includes("salad") || n.includes("aloo"))
    return "🥗";
  if (n.includes("paneer") || n.includes("raita") || n.includes("dairy") || n.includes("lassi") || n.includes("curd"))
    return "🧀";
  if (n.includes("chai") || n.includes("tea") || n.includes("coffee") || n.includes("beverage")) return "☕";
  if (n.includes("samosa") || n.includes("snack") || n.includes("pakora")) return "🥟";
  if (n.includes("sweet") || n.includes("kheer") || n.includes("halwa") || n.includes("jalebi") || n.includes("gulab"))
    return "🍮";
  return "🥗";
}

// Deterministic, zero-cost insight generated purely from today's actual
// numbers vs goals — no external AI call, no quota, no staleness. Always
// instant, always matches the real logged data.
export function generateInsight(totals: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): string {
  const calorieRatio = totals.calories / CALORIE_GOAL;
  const proteinRatio = totals.protein / MACRO_GOALS.protein;
  const carbRatio = totals.carbs / MACRO_GOALS.carbs;
  const fatRatio = totals.fat / MACRO_GOALS.fat;
  const remainingCalories = Math.max(Math.round(CALORIE_GOAL - totals.calories), 0);
  const remainingProtein = Math.max(Math.round((MACRO_GOALS.protein - totals.protein) * 10) / 10, 0);

  if (calorieRatio > 1.15) {
    return `Namaste! You're at ${totals.calories} kcal today, a bit over your ${CALORIE_GOAL} kcal goal. Try keeping the next meal lighter and protein-focused — dal, paneer, or sprouts work well.`;
  }
  if (fatRatio > 1.3 && calorieRatio < 1.15) {
    return `Namaste! Today's fat (${totals.fat}g) is well above your ${MACRO_GOALS.fat}g target. Your next meal could go easy on fried and oily items.`;
  }
  if (proteinRatio < 0.5 && calorieRatio > 0.3) {
    return `Namaste! Protein is trailing a bit — ${totals.protein}g so far against a ${MACRO_GOALS.protein}g goal. A bowl of dal, paneer, curd, or sprouted moong would help close that gap.`;
  }
  if (carbRatio > 1.2 && proteinRatio < 0.7) {
    return `Namaste! Carbs (${totals.carbs}g) are ahead of protein today. Pairing your next roti or rice with a solid dal or paneer dish would balance things out.`;
  }
  if (calorieRatio < 0.15) {
    return `Namaste! Light start to the day so far. Keep logging as you eat — the picture will fill in nicely by evening.`;
  }
  if (proteinRatio >= 0.9 && calorieRatio <= 1.05) {
    return `Namaste! Great balance today — protein (${totals.protein}g) is right on track and calories are well within goal. Keep this rhythm going!`;
  }
  return `Namaste! You're at ${totals.calories} kcal and ${totals.protein}g protein so far (goal: ${CALORIE_GOAL} kcal, ${MACRO_GOALS.protein}g protein). About ${remainingCalories} kcal and ${remainingProtein}g protein left — aim to keep the next meal balanced.`;
}
