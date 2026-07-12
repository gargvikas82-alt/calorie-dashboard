"use client";

import Link from "next/link";
import { useState } from "react";
import {
  parseMeal,
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

    setSaving(true);
    setError(null);

    try {
      const parsed = await parseMeal(text);
      if (parsed.length === 0) {
