import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
  }

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "USDA_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${apiKey}`);

    if (!res.ok) {
      throw new Error("Failed to fetch food data");
    }

    const data = await res.json();
    
    // Adapter to map USDA schema to the frontend's expected format
    const items = data.foods ? data.foods.slice(0, 5).map((food: any) => {
      const getNutrient = (name: string) => {
        const nut = food.foodNutrients.find((n: any) => n.nutrientName.toLowerCase().includes(name.toLowerCase()));
        return nut ? nut.value : 0;
      };

      return {
        name: food.description,
        calories: getNutrient("Energy"),
        protein_g: getNutrient("Protein")
      };
    }) : [];

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
