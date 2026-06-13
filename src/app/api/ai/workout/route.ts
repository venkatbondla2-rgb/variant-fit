import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured." }, { status: 500 });
  }

  try {
    const { workoutType, daysPerWeek, goal, experience, equipment } = await request.json();

    if (!workoutType || !daysPerWeek) {
      return NextResponse.json({ error: "workoutType and daysPerWeek are required" }, { status: 400 });
    }

    const systemMessage = `You are Variant AI, an elite personal trainer and workout programmer.

You MUST respond with ONLY valid JSON and no other text. No markdown, no explanation, no code fences.

The JSON must follow this exact schema:
{
  "planName": "string - Creative name for the plan",
  "summary": "string - 1-2 sentence summary",
  "split": [
    ["Muscle1", "Muscle2"],
    ["Muscle3", "Muscle4"],
    ...
  ],
  "exercises": {
    "Day 1: Muscle1 + Muscle2": [
      { "name": "Exercise Name", "sets": 3, "reps": 10, "weight": 0, "unit": "reps", "notes": "Brief tip" }
    ],
    "Day 2: Muscle3 + Muscle4": [...]
  },
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

CRITICAL RULES:
- Generate exactly ${daysPerWeek} training days
- The "split" array must have exactly ${daysPerWeek} elements, each is an array of muscle groups for that day
- Valid muscle groups: Chest, Back, Shoulders, Legs, Biceps, Triceps, Arms, Core, Cardio
- Each day should have 4-6 exercises
- The "exercises" object keys must match "Day N: MuscleList" format
- For ${workoutType === 'home' ? 'home workouts: use only bodyweight/household items, NO gym equipment' : workoutType === 'calisthenics' ? 'calisthenics: use only bodyweight/bars/rings, focus on progressive bodyweight' : 'gym: use full gym equipment (barbells, dumbbells, machines, cables)'}
- Weight should be 0 for bodyweight exercises, realistic defaults for weighted
- Unit should be "reps", "sec", or "min"
- Tailor the plan to the user's goal and experience level
- Provide 3 practical tips for the program
- Respond with ONLY the JSON object, nothing else`;

    const userPrompt = `Create a ${daysPerWeek}-day ${workoutType} workout split for someone with the following:
- Goal: ${goal || 'general fitness'}
- Experience: ${experience || 'intermediate'}
- Available equipment: ${equipment || (workoutType === 'gym' ? 'full gym' : workoutType === 'home' ? 'bodyweight only' : 'pull-up bar, dip bars')}

Make it balanced, progressive, and fun.`;

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Groq API error:", errorBody);
      throw new Error(`Groq API Error: ${res.status}`);
    }

    const data = await res.json();
    const rawContent = data.choices[0]?.message?.content || "";

    try {
      const plan = JSON.parse(rawContent);
      return NextResponse.json({ plan });
    } catch (parseErr) {
      console.error("Failed to parse AI workout plan:", parseErr);
      return NextResponse.json({ plan: null, raw: rawContent });
    }
  } catch (error: any) {
    console.error("AI Workout Error:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to generate workout" }, { status: 500 });
  }
}
