"use client";

import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CALORIE_GOAL,
  MEAL_TYPES,
  MEAL_TYPE_COLORS,
  MACRO_GOALS,
  type MealType,
  type FoodItem,
  buildMealSummary,
  clearTodayMeals,
  computeTotals,
  deleteFoodItem,
  getAllFoodItems,
  getFoodEmoji,
  getMacroTrafficColor,
  getRingGradientId,
  groupMealsByType,
  loadTodayMeals,
  updateFoodItem,
  type LoggedMeal,
} from "@/lib/meals";

type MacroKey = "protein" | "carbs" | "fat";

const MACRO_CONFIG: {
  key: MacroKey;
  label: string;
  icon: string;
  goal: number;
  stagger: number;
}[] = [
  { key: "protein", label: "Protein", icon: "💪", goal: MACRO_GOALS.protein, stagger: 0 },
  { key: "carbs", label: "Carbs", icon: "⚡", goal: MACRO_GOALS.carbs, stagger: 150 },
  { key: "fat", label: "Fat", icon: "💧", goal: MACRO_GOALS.fat, stagger: 300 },
];

const CONFETTI_COLORS = [
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#16a34a",
  "#ea580c",
];

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    let frame: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.6}s`,
        duration: `${1.8 + Math.random() * 1.2}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 5 + Math.random() * 7,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="animate-confetti-fall absolute top-0 rounded-full"
          style={
            {
              left: p.left,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              "--fall-delay": p.delay,
              "--fall-duration": p.duration,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function CalorieRing({
  consumed,
  goal,
  animate,
}: {
  consumed: number;
  goal: number;
  animate: boolean;
}) {
  const size = 200;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = consumed / goal;
  const displayProgress = Math.min(progressRatio, 1);
  const targetOffset = circumference * (1 - displayProgress);
  const gradientId = getRingGradientId(progressRatio);

  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    if (!animate) {
      setOffset(targetOffset);
      return;
    }
    setOffset(circumference);
    const timer = setTimeout(() => setOffset(targetOffset), 80);
    return () => clearTimeout(timer);
  }, [animate, targetOffset, circumference]);

  const displayCalories = useCountUp(consumed, 1500);

  return (
    <div className="relative mx-auto flex h-[200px] w-[200px] items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-gradient-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="ring-gradient-orange" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="ring-gradient-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-gray-900">{displayCalories}</p>
        <p className="text-sm text-gray-500">/ {goal} kcal</p>
      </div>
    </div>
  );
}

function MacroBar({
  macroKey,
  label,
  icon,
  consumed,
  goal,
  animate,
  stagger,
  items,
  expanded,
  onToggle,
}: {
  macroKey: MacroKey;
  label: string;
  icon: string;
  consumed: number;
  goal: number;
  animate: boolean;
  stagger: number;
  items: FoodItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const ratio = consumed / goal;
  const barPct = Math.min(ratio * 100, 100);
  const color = getMacroTrafficColor(consumed, goal);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!animate) {
      setVisible(true);
      setWidth(barPct);
      return;
    }
    setVisible(false);
    setWidth(0);
    const showTimer = setTimeout(() => setVisible(true), stagger + 50);
    const widthTimer = setTimeout(() => setWidth(barPct), stagger + 200);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(widthTimer);
    };
  }, [animate, barPct, stagger]);

  const contributors = items
    .filter((item) => item[macroKey] > 0)
    .sort((a, b) => b[macroKey] - a[macroKey]);

  return (
    <div
      className={`animate-macro-slide-in rounded-xl bg-white/50 ${visible ? "opacity-100" : ""}`}
      style={{ animationDelay: `${stagger}ms` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium text-gray-700">
            {icon} {label}
          </span>
          <span className="text-gray-500">
            {consumed}g / {goal}g
            <span className="ml-1 text-xs text-gray-400">
              {expanded ? "▲" : "▼"}
            </span>
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full"
            style={{
              width: `${width}%`,
              backgroundColor: color,
              transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </button>

      <div className={`macro-expand ${expanded ? "open" : ""}`}>
        <div className="macro-expand-inner">
          <ul className="space-y-1.5 pt-2">
            {contributors.length === 0 ? (
              <li className="text-xs text-gray-400">No contributions yet</li>
            ) : (
              contributors.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between rounded-lg bg-green-50/80 px-2.5 py-1.5 text-xs"
                >
                  <span className="text-gray-700">
                    {getFoodEmoji(item.name)} {item.name}
                  </span>
                  <span className="font-medium text-gray-600">
                    {item[macroKey]}g
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MacroDoughnut({
  protein,
  carbs,
  fat,
  animate,
}: {
  protein: number;
  carbs: number;
  fat: number;
  animate: boolean;
}) {
  const size = 128;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;

  const segments = [
    { value: protein, color: "#3b82f6", label: "Protein" },
    { value: carbs, color: "#f59e0b", label: "Carbs" },
    { value: fat, color: "#ef4444", label: "Fat" },
  ];

  if (total === 0) {
    return (
      <div className="flex flex-col items-center py-2">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border-[18px] border-gray-100">
          <span className="text-xs text-gray-400">No data</span>
        </div>
      </div>
    );
  }

  let cumulativeAngle = -90;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={stroke}
          />
          {segments.map((seg) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const rotation = cumulativeAngle;
            cumulativeAngle += pct * 360;

            return (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${animate ? dash : 0} ${circumference}`}
                strokeLinecap="butt"
                transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                style={{
                  transition:
                    "stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{total}g</span>
          <span className="text-[10px] text-gray-400">total macros</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            {seg.label}{" "}
            <span className="font-medium">{Math.round((seg.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MealLogItem({
  item,
  onChanged,
}: {
  item: FoodItem;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editCalories, setEditCalories] = useState(String(item.calories));
  const [swipeX, setSwipeX] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);

  const ACTION_WIDTH = 88;

  function handleDelete() {
    setDeleting(true);
    setTimeout(() => {
      deleteFoodItem(item.id);
      onChanged();
    }, 350);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    const calories = parseInt(editCalories, 10);
    if (!editName.trim() || isNaN(calories) || calories <= 0) return;
    updateFoodItem(item.id, { name: editName.trim(), calories });
    setEditing(false);
    onChanged();
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - touchStartX;
    setSwipeX(Math.max(Math.min(delta, 0), -ACTION_WIDTH));
  }

  function handleTouchEnd() {
    if (swipeX < -ACTION_WIDTH * 0.6) {
      handleDelete();
    } else {
      setSwipeX(0);
    }
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-[#166534]/30 bg-white p-3 shadow-md">
        <form onSubmit={handleSaveEdit} className="space-y-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-[#166534]"
            placeholder="Food name"
          />
          <input
            type="number"
            value={editCalories}
            onChange={(e) => setEditCalories(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-[#166534]"
            placeholder="Calories"
            min={1}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#166534] py-2 text-xs font-semibold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditName(item.name);
                setEditCalories(String(item.calories));
              }}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className={`relative overflow-hidden rounded-xl ${deleting ? "animate-fade-out-delete" : ""}`}
    >
      <div className="absolute right-0 top-0 flex h-full">
        <button
          type="button"
          onClick={() => {
            setSwipeX(0);
            setEditing(true);
          }}
          className="flex w-11 items-center justify-center bg-amber-500 text-white"
          aria-label="Edit item"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="flex w-11 items-center justify-center bg-red-500 text-white"
          aria-label="Delete item"
        >
          🗑️
        </button>
      </div>

      <div
        className="relative flex items-center justify-between rounded-xl border border-gray-100/80 bg-white px-3 py-2.5 shadow-md transition-transform duration-200"
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <span className="pr-2 text-sm text-gray-800">
          {getFoodEmoji(item.name)} {item.name}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <div className="text-right text-xs text-gray-500">
            <p className="font-medium text-gray-700">{item.calories} kcal</p>
            <p>{item.protein}g protein</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-1 rounded p-1 text-sm opacity-60 hover:opacity-100"
            aria-label="Edit"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded p-1 text-sm opacity-60 hover:opacity-100"
            aria-label="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </li>
  );
}

function TodaysInsight({
  meals,
  hasMeals,
}: {
  meals: LoggedMeal[];
  hasMeals: boolean;
}) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchInsight = useCallback(async () => {
    if (!hasMeals) return;
    setLoading(true);
    setError(null);

    try {
      const summary = buildMealSummary(meals);
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch insight");
      setInsight(data.insight);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [meals, hasMeals]);

  useEffect(() => {
    if (!hasMeals) {
      hasFetched.current = false;
      setInsight(null);
      setError(null);
      return;
    }
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchInsight();
    }
  }, [hasMeals, fetchInsight]);

  if (!hasMeals) return null;

  return (
    <section className="mb-6 rounded-2xl border border-green-200/60 bg-gradient-to-br from-green-50 to-emerald-50/80 p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          🤖 Today&apos;s Insight
        </h2>
        <button
          type="button"
          onClick={fetchInsight}
          disabled={loading}
          className="rounded-lg border border-green-200 bg-white px-2.5 py-1 text-xs font-medium text-[#166534] shadow-sm transition-colors hover:bg-green-50 disabled:opacity-50"
        >
          Refresh insight
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-4">
          <div className="animate-spin-slow h-5 w-5 rounded-full border-2 border-green-200 border-t-[#166534]" />
          <p className="text-sm text-gray-500">AI is thinking...</p>
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && insight && !error && (
        <p className="animate-fade-slide-up text-sm leading-relaxed text-gray-700">
          {insight}
        </p>
      )}
    </section>
  );
}

export default function Dashboard() {
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [mounted, setMounted] = useState(false);
  const [expandedMacro, setExpandedMacro] = useState<MacroKey | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const refresh = useCallback(() => {
    setMeals(loadTodayMeals());
  }, []);

  useEffect(() => {
    refresh();
    setMounted(true);

    const onUpdate = () => refresh();
    window.addEventListener("meals-updated", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("meals-updated", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [refresh]);

  const totals = computeTotals(meals);
  const grouped = groupMealsByType(meals);
  const allItems = getAllFoodItems(meals);
  const hasMeals = meals.length > 0;
  const calorieProgress = totals.calories / CALORIE_GOAL;
  const nearGoal = calorieProgress >= 0.9;

  useEffect(() => {
    if (mounted && nearGoal) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [mounted, nearGoal]);

  function handleClearToday() {
    if (confirm("Clear all meals logged today?")) {
      clearTodayMeals();
      refresh();
      setExpandedMacro(null);
    }
  }

  function toggleMacro(key: MacroKey) {
    setExpandedMacro((prev) => (prev === key ? null : key));
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white to-[#f0fdf4] pb-24">
      {showConfetti && <ConfettiBurst />}

      <div className="mx-auto w-full max-w-[375px] px-4 py-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Today</h1>
            <p className="text-sm text-gray-500">Indian vegetarian meals</p>
          </div>
          <div className="flex items-center gap-2">
            <AuthButton />
            {hasMeals && (
              <button
                type="button"
                onClick={handleClearToday}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:border-red-200 hover:text-red-600"
              >
                Clear today
              </button>
            )}
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-green-100/60 bg-gradient-to-br from-white to-green-50 p-6 shadow-lg">
          <CalorieRing
            consumed={totals.calories}
            goal={CALORIE_GOAL}
            animate={mounted}
          />
          {nearGoal && (
            <p className="animate-fade-slide-up mt-3 text-center text-sm font-semibold text-orange-600">
              🎉 Goal almost reached!
            </p>
          )}
          <p className="mt-3 text-center text-sm text-gray-500">
            {CALORIE_GOAL - totals.calories > 0
              ? `${CALORIE_GOAL - totals.calories} kcal remaining`
              : totals.calories > 0
                ? "Goal reached"
                : "Log a meal to get started"}
          </p>
        </section>

        <section className="mb-6 space-y-4 rounded-2xl border border-green-100/60 bg-gradient-to-br from-white to-green-50 p-5 shadow-lg">
          <h2 className="text-base font-semibold text-gray-900">Macros</h2>
          {MACRO_CONFIG.map((macro) => (
            <MacroBar
              key={macro.key}
              macroKey={macro.key}
              label={macro.label}
              icon={macro.icon}
              consumed={totals[macro.key]}
              goal={macro.goal}
              animate={mounted}
              stagger={macro.stagger}
              items={allItems}
              expanded={expandedMacro === macro.key}
              onToggle={() => toggleMacro(macro.key)}
            />
          ))}

          <div className="border-t border-green-100/80 pt-4">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-gray-400">
              Macro split
            </p>
            <MacroDoughnut
              protein={totals.protein}
              carbs={totals.carbs}
              fat={totals.fat}
              animate={mounted}
            />
          </div>
        </section>

        <TodaysInsight meals={meals} hasMeals={hasMeals} />

        <section className="space-y-6">
          <h2 className="text-base font-semibold text-gray-900">Meal log</h2>
          {!hasMeals && (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-white to-green-50 px-4 py-8 text-center text-sm text-gray-500 shadow-lg">
              No meals logged yet. Tap + to add your first meal.
            </p>
          )}
          {MEAL_TYPES.map((type) => {
            const items = grouped[type];
            if (items.length === 0) return null;
            const colors = MEAL_TYPE_COLORS[type];

            return (
              <div
                key={type}
                className="rounded-2xl border border-green-100/60 bg-gradient-to-br from-white to-green-50 p-4 shadow-lg"
              >
                <span
                  className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${colors.activeBg}`}
                >
                  {type}
                </span>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <MealLogItem
                      key={item.id}
                      item={item}
                      onChanged={refresh}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      </div>

      <Link
        href="/log"
        aria-label="Log a meal"
        className="animate-gentle-pulse fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#166534] text-3xl font-light text-white shadow-lg"
      >
        +
      </Link>
    </div>
  );
}
