"use client";

import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import { supabase } from "@/lib/supabase-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CALORIE_GOAL,
  MACRO_GOALS,
  type FoodItem,
  buildMealSummary,
  clearTodayMeals,
  computeTotals,
  deleteFoodItem,
  getAllFoodItems,
  getFoodEmoji,
  getMacroTrafficColor,
  getRingGradientId,
  getStreak,
  getWindowColor,
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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
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
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-gray-900">{displayCalories}</p>
        <p className="text-sm text-gray-500">/ {goal} kcal</p>
      </div>
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  return (
    <div className="animate-fade-slide-up flex items-center gap-1.5 rounded-full border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1.5 shadow-sm">
      <span className="text-base">🔥</span>
      <span className="text-sm font-semibold text-orange-700">
        {streak} day{streak > 1 ? "s" : ""}
      </span>
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
      <button type="button" onClick={onToggle} className="w-full text-left" aria-expanded={expanded}>
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium text-gray-700">
            {icon} {label}
          </span>
          <span className="text-gray-500">
            {consumed}g / {goal}g
            <span className="ml-1 text-xs text-gray-400">{expanded ? "▲" : "▼"}</span>
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${width}%`, backgroundColor: color, transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
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
                <li key={item.id} className="flex justify-between rounded-lg bg-green-50/80 px-2.5 py-1.5 text-xs">
                  <span className="text-gray-700">
                    {getFoodEmoji(item.name)} {item.name}
                  </span>
                  <span className="font-medium text-gray-600">{item[macroKey]}g</span>
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
    { value: carbs,
