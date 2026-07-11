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
