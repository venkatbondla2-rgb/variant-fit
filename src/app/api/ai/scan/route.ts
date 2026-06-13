import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!geminiApiKey && !groqApiKey) {
    return NextResponse.json({ error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured. Add one to your environment." }, { status: 500 });
  }

  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // Strip the data URL prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, "");
    let detectedFood = null;

    if (geminiApiKey) {
      // Use Gemini Vision API (gemini-2.0-flash)
      console.log("Processing image scan using Gemini Vision API...");
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              },
              {
                text: "Identify the main food items in this meal and estimate the total macros. Return ONLY a valid JSON object matching this schema. Do not output markdown, code fences, or explanations. Schema: { \"name\": \"Detected meal name (e.g. Grilled Chicken and Rice)\", \"calories\": <number>, \"protein_g\": <number>, \"carbs_g\": <number>, \"fat_g\": <number> }"
              }
            ]
          }]
        })
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Gemini Vision API error response:", errorBody);
        let errorMsg = `Gemini Vision API Error: ${res.status} ${res.statusText}`;
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.error?.message) {
            errorMsg = `Gemini Vision API Error: ${errorJson.error.message}`;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Clean up markdown fences if present
      let cleanContent = rawContent.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.substring(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.substring(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.substring(0, cleanContent.length - 3);
      }
      cleanContent = cleanContent.trim();

      try {
        detectedFood = JSON.parse(cleanContent);
      } catch (parseErr) {
        console.error("Failed to parse Gemini response:", rawContent);
        throw new Error("Could not parse food details from image. Try another photo.");
      }

    } else {
      // Fallback: Use Groq Vision API
      console.log("Processing image scan using Groq Vision API...");
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Identify the main food items in this meal and estimate the total macros. Return ONLY a valid JSON object matching this schema. Do not output markdown, code fences, or explanations. Schema: { \"name\": \"Detected meal name (e.g. Grilled Chicken and Rice)\", \"calories\": <number>, \"protein_g\": <number>, \"carbs_g\": <number>, \"fat_g\": <number> }"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Groq Vision API error response:", errorBody);
        let errorMsg = `Groq Vision API Error: ${res.status} ${res.statusText}`;
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.error?.message) {
            errorMsg = `Groq Vision API Error: ${errorJson.error.message}`;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const rawContent = data.choices[0]?.message?.content || "";

      try {
        detectedFood = JSON.parse(rawContent);
      } catch (parseErr) {
        console.error("Failed to parse Groq response:", rawContent);
        throw new Error("Could not parse food details from image. Try another photo.");
      }
    }

    return NextResponse.json({ success: true, food: detectedFood });
  } catch (error: any) {
    console.error("Image Scan Error:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to scan image" }, { status: 500 });
  }
}
