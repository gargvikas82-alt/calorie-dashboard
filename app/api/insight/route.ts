import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { meals, totals } = body;

    if (!meals || !totals) {
      return NextResponse.json(
        { error: "Missing meal data" },
        { status: 400 }
      );
    }

    const mealSummary = `${JSON.stringify(meals, null, 2)}

Daily totals: ${totals.calories} kcal, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fat}g fat.
Calorie goal: 2000 kcal.`;

    const prompt =
      "You are a friendly Indian vegetarian nutrition coach. Look at today's meals and give ONE short, specific, actionable insight in 2 sentences max. Be warm and encouraging. Mention specific Indian foods. Never suggest non-vegetarian items. Today's meals: " +
      mealSummary;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini API error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Gemini API request failed" },
        { status: res.status }
      );
    }

    const insight = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!insight) {
      return NextResponse.json(
        { error: "No insight generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Insight API error:", error);
    return NextResponse.json(
      { error: "Failed to generate insight" },
      { status: 500 }
    );
  }
}
