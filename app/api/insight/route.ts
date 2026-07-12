import { NextResponse } from "next/server";

// Generic, user-facing message — never leak raw provider error text
// (quota strings, internal URLs, etc.) to the client.
const FRIENDLY_UNAVAILABLE_MESSAGE =
  "Insight abhi available nahi hai. Thodi der baad try karein.";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured");
    return NextResponse.json(
      { error: FRIENDLY_UNAVAILABLE_MESSAGE },
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
      // Log the full detail server-side for debugging, but never send
      // raw provider error text (quota strings, doc links, etc.) to
      // the client — it looks broken and confuses the user.
      console.error("Gemini API error:", res.status, data);

      if (res.status === 429) {
        return NextResponse.json(
          { error: "Aaj ke liye insight ki limit khatam ho gayi. Kal phir try karein." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: FRIENDLY_UNAVAILABLE_MESSAGE },
        { status: res.status }
      );
    }

    const insight = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!insight) {
      console.error("No insight text in Gemini response:", data);
      return NextResponse.json(
        { error: FRIENDLY_UNAVAILABLE_MESSAGE },
        { status: 500 }
      );
    }

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Insight API error:", error);
    return NextResponse.json(
      { error: FRIENDLY_UNAVAILABLE_MESSAGE },
      { status: 500 }
    );
  }
}
