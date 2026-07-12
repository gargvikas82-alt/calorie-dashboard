"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MEAL_TYPES,
  MEAL_TYPE_COLORS,
  type MealType,
  mockParseMeal,
  saveMeal,
  type FoodItem,
} from "@/lib/meals";

function SuccessOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
      <div className="animate-success-pop w-full max-w-xs rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#166534]">
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: 0,
                animation: "success-check 0.4s ease-out 0.2s both",
              }}
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Meal logged!</h2>
        <p className="mt-1 text-sm text-gray-500">
          Saved to today&apos;s dashboard
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/"
            className="rounded-xl bg-[#166534] py-2.5 text-sm font-semibold text-white"
          >
            View dashboard
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
          >
            Log another
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LogMealPage() {
  const [mealInput, setMealInput] = useState("");
  const [mealType, setMealType] = useState<MealType>("Lunch");
  const [results, setResults] = useState<Omit<FoodItem, "id">[] | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mealInput.trim()) return;

    const parsed = mockParseMeal(mealInput);
    if (parsed.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      await saveMeal(mealType, parsed);
      setResults(parsed);
      setShowSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message === "Not signed in") {
        setError("Please sign in first to log a meal.");
      } else {
        setError("Something went wrong saving your meal. Try again.");
        console.error("Save meal failed:", err);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleLogAnother() {
    setShowSuccess(false);
    setResults(null);
    setMealInput("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f0fdf4]">
      {showSuccess && <SuccessOverlay onDismiss={handleLogAnother} />}

      <div className="mx-auto w-full max-w-[375px] px-4 py-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-[#166534]">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Log meal</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="meal"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              What did you eat?
            </label>
            <input
              id="meal"
              type="text"
              value={mealInput}
              onChange={(e) => setMealInput(e.target.value)}
              placeholder='e.g. "2 roti, dal, sabzi"'
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 shadow-sm outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Meal type</p>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((type) => {
                const colors = MEAL_TYPE_COLORS[type];
                const isActive = mealType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMealType(type)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? `${colors.activeBg} border-transparent text-white shadow-md`
                        : `${colors.bg} ${colors.text} ${colors.border} border`
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#166534] py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Submit"}
          </button>
        </form>

        {results && (
          <section className="animate-fade-slide-up mt-8">
            <h2 className="mb-1 text-base font-semibold text-gray-900">
              Results
            </h2>
            <p className="mb-3 text-xs text-gray-500">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-white ${MEAL_TYPE_COLORS[mealType].activeBg}`}
              >
                {mealType}
              </span>{" "}
              · mock nutrition estimate
            </p>
            <ul className="space-y-2">
              {results.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm"
                >
                  <span className="text-sm text-gray-800">{item.name}</span>
                  <div className="text-right text-xs text-gray-500">
                    <p className="font-medium text-gray-700">
                      {item.calories} kcal
                    </p>
                    <p>{item.protein}g protein</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-medium text-gray-700">
              Total: {results.reduce((s, r) => s + r.calories, 0)} kcal ·{" "}
              {results.reduce((s, r) => s + r.protein, 0)}g protein
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
