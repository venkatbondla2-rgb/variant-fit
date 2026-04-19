import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const systemMessage = `You are Variant AI, an elite fitness nutritionist and diet planner. 
Provide a clear, structured, and easy-to-read meal plan based on the user's prompt. 
Do not use markdown formatting like **bold** or asterisks, just use clean spacing 
so it looks good in a raw text box.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Groq free lightning fast model
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!res.ok) {
      throw new Error(`Groq API Error: ${res.statusText}`);
    }

    const data = await res.json();
    const recommendation = data.choices[0]?.message?.content || "No recommendation generated.";

    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate diet plan" }, { status: 500 });
  }
}
