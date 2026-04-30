import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured. Add it to .env.local and restart the dev server." }, { status: 500 });
  }

  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const systemMessage = `You are Variant AI, an elite fitness nutritionist and diet planner.

You MUST respond with ONLY valid JSON and no other text. No markdown, no explanation, no code fences.

The JSON must follow this exact schema:
{
  "summary": "Brief 1-2 sentence summary of the plan",
  "dailyTotals": {
    "calories": <number>,
    "protein_g": <number>,
    "carbs_g": <number>,
    "fat_g": <number>
  },
  "meals": [
    {
      "mealCategory": "breakfast",
      "items": [
        {
          "name": "Food item name",
          "calories": <number>,
          "protein_g": <number>,
          "carbs_g": <number>,
          "fat_g": <number>
        }
      ]
    },
    {
      "mealCategory": "lunch",
      "items": [...]
    },
    {
      "mealCategory": "mid-snack",
      "items": [...]
    },
    {
      "mealCategory": "dinner",
      "items": [...]
    }
  ]
}

Rules:
- Always include exactly 4 meal categories: breakfast, lunch, mid-snack, dinner
- Each meal should have 2-4 food items
- All macro numbers should be realistic integers
- The dailyTotals should match the sum of all items
- Tailor the plan to the user's goals, allergies, and preferences
- Respond with ONLY the JSON object, nothing else`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Groq API error response:", errorBody);
      throw new Error(`Groq API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const rawContent = data.choices[0]?.message?.content || "";

    // Parse the structured JSON response
    let structuredPlan = null;
    let recommendation = "";
    let parsedMacros = null;

    try {
      structuredPlan = JSON.parse(rawContent);
      
      // Build a human-readable text version
      recommendation = `${structuredPlan.summary || "Your Custom Diet Plan"}\n\n`;
      recommendation += `Daily Totals: ${structuredPlan.dailyTotals?.calories || 0} cal, ${structuredPlan.dailyTotals?.protein_g || 0}g protein, ${structuredPlan.dailyTotals?.carbs_g || 0}g carbs, ${structuredPlan.dailyTotals?.fat_g || 0}g fat\n\n`;

      if (structuredPlan.meals) {
        for (const meal of structuredPlan.meals) {
          const catLabel = meal.mealCategory.charAt(0).toUpperCase() + meal.mealCategory.slice(1).replace("-", " ");
          recommendation += `--- ${catLabel} ---\n`;
          if (meal.items) {
            for (const item of meal.items) {
              recommendation += `  ${item.name} — ${item.calories} cal | ${item.protein_g}g P | ${item.carbs_g}g C | ${item.fat_g}g F\n`;
            }
          }
          recommendation += "\n";
        }
      }

      // Extract daily totals for macro goals
      if (structuredPlan.dailyTotals) {
        parsedMacros = {
          dailyCalories: structuredPlan.dailyTotals.calories,
          dailyProtein: structuredPlan.dailyTotals.protein_g,
          dailyCarbs: structuredPlan.dailyTotals.carbs_g,
          dailyFat: structuredPlan.dailyTotals.fat_g,
        };
      }
    } catch (parseErr) {
      // If JSON parsing fails, use raw text as fallback
      console.error("Failed to parse structured AI response:", parseErr);
      recommendation = rawContent;
    }

    return NextResponse.json({ 
      recommendation, 
      parsedMacros,
      structuredPlan 
    });
  } catch (error: any) {
    console.error("AI Diet Error:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to generate diet plan" }, { status: 500 });
  }
}
