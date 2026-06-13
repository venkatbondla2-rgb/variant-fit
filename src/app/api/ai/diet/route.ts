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
  "dayPlans": [
    {
      "dayLabel": "Day A",
      "meals": [
        {
          "mealCategory": "breakfast",
          "items": [
            { "name": "Food item name", "weight": "weight/quantity (e.g. 100g, 2 large eggs, 1 scoop)", "calories": <number>, "protein_g": <number>, "carbs_g": <number>, "fat_g": <number> }
          ]
        },
        { "mealCategory": "lunch", "items": [...] },
        { "mealCategory": "mid-snack", "items": [...] },
        { "mealCategory": "dinner", "items": [...] }
      ]
    },
    { "dayLabel": "Day B", "meals": [...] },
    { "dayLabel": "Day C", "meals": [...] },
    { "dayLabel": "Day D", "meals": [...] }
  ]
}

CRITICAL RULES:
- Generate exactly 4 different day plans (Day A, B, C, D)
- Each day must have DIFFERENT food items but similar macro totals
- Use creative variety: different proteins, grains, vegetables across days
- Always include exactly 4 meal categories per day: breakfast, lunch, mid-snack, dinner
- Each meal should have 2-4 food items, and each item MUST specify a realistic weight/quantity in the 'weight' field (e.g., '100g', '150g cooked', '2 large')
- All macro numbers should be realistic integers
- The dailyTotals should be the target for each day
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
        temperature: 0.6,
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

    let structuredPlan = null;
    let recommendation = "";
    let parsedMacros = null;

    try {
      structuredPlan = JSON.parse(rawContent);
      
      recommendation = `${structuredPlan.summary || "Your Custom Diet Plan"}\n\n`;
      recommendation += `Daily Totals: ${structuredPlan.dailyTotals?.calories || 0} cal, ${structuredPlan.dailyTotals?.protein_g || 0}g protein, ${structuredPlan.dailyTotals?.carbs_g || 0}g carbs, ${structuredPlan.dailyTotals?.fat_g || 0}g fat\n\n`;

      // Support both old (meals) and new (dayPlans) format
      const dayPlans = structuredPlan.dayPlans || (structuredPlan.meals ? [{ dayLabel: "Day A", meals: structuredPlan.meals }] : []);
      
      for (const day of dayPlans) {
        recommendation += `=== ${day.dayLabel} ===\n`;
        if (day.meals) {
          for (const meal of day.meals) {
            const catLabel = meal.mealCategory.charAt(0).toUpperCase() + meal.mealCategory.slice(1).replace("-", " ");
            recommendation += `  --- ${catLabel} ---\n`;
            if (meal.items) {
              for (const item of meal.items) {
                recommendation += `    ${item.name} ${item.weight ? `(${item.weight})` : ""} — ${item.calories} cal | ${item.protein_g}g P | ${item.carbs_g}g C | ${item.fat_g}g F\n`;
              }
            }
          }
        }
        recommendation += "\n";
      }

      if (structuredPlan.dailyTotals) {
        parsedMacros = {
          dailyCalories: structuredPlan.dailyTotals.calories,
          dailyProtein: structuredPlan.dailyTotals.protein_g,
          dailyCarbs: structuredPlan.dailyTotals.carbs_g,
          dailyFat: structuredPlan.dailyTotals.fat_g,
        };
      }
    } catch (parseErr) {
      console.error("Failed to parse structured AI response:", parseErr);
      recommendation = rawContent;
    }

    return NextResponse.json({ recommendation, parsedMacros, structuredPlan });
  } catch (error: any) {
    console.error("AI Diet Error:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to generate diet plan" }, { status: 500 });
  }
}
