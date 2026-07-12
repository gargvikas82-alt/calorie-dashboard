"use client";

import Link from "next/link";
import { useState } from "react";
import {
  mockParseMeal,
  saveMeal,
  getTimeWindowLabel,
  type FoodItem,
} from "@/lib/meals";

const QUICK_ADDS = [
  "Chai",
  "2 roti, dal, sabzi",
  "Poha",
  "Coffee",
  "Dry fruits",
  "Rice, dal",
  "Dosa, chutney",
  "Namkeen",
];

function SuccessOverlay({
  windowLabel,
  onDismiss,
}: {
  windowLabel: string;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
      <div className="animate-success-pop w-full max-w-xs rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#166534]">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
        <h2 className="text-lg font-bold text-gray-900">Logged!</h2>
        <p className="mt-1 text-sm text-gray-500">Tagged as {windowLabel} · saved to today</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/" className="rounded-xl bg-[#166534] py-2.5 text-sm font-semibold text-white">
            View dashboard
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
          >
            Log something else
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LogMealPage() {
  const [mealInput, setMealInput] = useState("");
  const [results, setResults] = useState<Omit<FoodItem, "id">[] | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedWindow, setLoggedWindow] = useState("");

  const currentWindow = getTimeWindowLabel(new Date());

  async function submitMeal(text: string) {
    if (!text.trim()) return;

    const parsed = mockParseMeal(text);
    if (parsed.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const saved = await saveMeal(parsed);
      setResults(parsed);
      setLoggedWindow(saved.type);
      setShowSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message === "Not signed in") {
        setError("Please sign in first to log something.");
      } else {
        setError("Something went wrong. Try again.");
        console.error("Save meal failed:", err);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMeal(mealInput);
  }

  function handleQuickAdd(text: string) {
    setMealInput(text);
    submitMeal(text);
  }

  function handleLogAnother() {
    setShowSuccess(false);
    setResults(null);
    setMealInput("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f0fdf4]">
      {showSuccess && <SuccessOverlay windowLabel={loggedWindow} onDismiss={handleLogAnother} />}

      <div className="mx-auto w-full max-w-[375px] px-4 py-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-[#166534]">
            ← Back
          </Link>
        </header>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">What did you just have? 🍽️</h1>
          <p className="mt-1 text-sm text-gray-500">
            Type it like you&apos;d text a friend — we&apos;ll tag it as{" "}
            <span className="font-medium text-[#166534]">{currentWindow}</span> automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              id="meal"
              type="text"
              value={mealInput}
              onChange={(e) => setMealInput(e.target.value)}
              placeholder='"2 roti, dal, sabzi" or just "chai"'
              autoFocus
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 shadow-sm outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || !mealInput.trim()}
            className="w-full rounded-2xl bg-[#166534] py-3.5 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Logging..." : "Log it"}
          </button>
        </form>

        <div className="mt-6">
          <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">Quick tap</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ADDS.map((item) => (
              <button
                key={item}
                type="button"
                disabled={saving}
                onClick={() => handleQuickAdd(item)}
                className="rounded-full border border-green-200 bg-white px-3.5 py-2 text-xs font-medium text-[#166534] shadow-sm transition-colors hover:bg-green-50 disabled:opacity-50"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {results && (
          <section className="animate-fade-slide-up mt-8">
            <h2 className="mb-1 text-base font-semibold text-gray-900">Just logged</h2>
            <p className="mb-3 text-xs text-gray-500">mock nutrition estimate</p>
            <ul className="space-y-2">
              {results.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm"
                >
                  <span className="text-sm text-gray-800">{item.name}</span>
                  <div className="text-right text-xs text-gray-500">
                    <p className="font-medium text-gray-700">{item.calories} kcal</p>
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
