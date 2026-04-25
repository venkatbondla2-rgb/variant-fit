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

IMPORTANT: Start your response with a MACRO SUMMARY line in exactly this format:
MACROS: [calories] cal, [protein]g protein, [carbs]g carbs, [fat]g fat

Then provide a clear, structured meal plan organized by:
- Breakfast
- Lunch  
- Mid-Snack
- Dinner

For each meal, list the food items with approximate calories and macros.
Do not use markdown formatting like **bold** or asterisks.
Use clean spacing so it looks good in a raw text box.`;

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
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Groq API error response:", errorBody);
      throw new Error(`Groq API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const recommendation = data.choices[0]?.message?.content || "No recommendation generated.";

    // Try to parse macros from AI response
    let parsedMacros = null;
    const macroMatch = recommendation.match(/MACROS:\s*(\d+)\s*cal.*?(\d+)g\s*protein.*?(\d+)g\s*carbs.*?(\d+)g\s*fat/i);
    if (macroMatch) {
      parsedMacros = {
        dailyCalories: parseInt(macroMatch[1]),
        dailyProtein: parseInt(macroMatch[2]),
        dailyCarbs: parseInt(macroMatch[3]),
        dailyFat: parseInt(macroMatch[4]),
      };
    }

    return NextResponse.json({ recommendation, parsedMacros });
  } catch (error: any) {
    console.error("AI Diet Error:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to generate diet plan" }, { status: 500 });
  }
}
