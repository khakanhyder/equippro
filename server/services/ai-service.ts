import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeEquipmentFromImages(imageUrls: string[]) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze these equipment images and extract:
- Brand name
- Model number
- Category (analytical/processing/testing/other)
- Technical specifications (name, value, unit)

Return JSON: { "brand": "...", "model": "...", "category": "...", "specifications": [{"name": "...", "value": "...", "unit": "..."}] }`
          },
          ...imageUrls.map(url => ({ type: "image_url" as const, image_url: { url } }))
        ]
      }
    ],
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

export async function estimatePrice(brand: string, model: string, category: string, condition: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Estimate market price ranges for: ${brand} ${model} (${category}, ${condition} condition).
Return JSON: { "new_min": 0, "new_max": 0, "refurbished_min": 0, "refurbished_max": 0, "used_min": 0, "used_max": 0, "source": "...", "breakdown": "..." }`
      }
    ],
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}
