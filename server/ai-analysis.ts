import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ImageAnalysisResult {
  brand: string | null;
  model: string | null;
  category: string | null;
  description: string | null;
  specifications: Record<string, string>;
  confidence: number;
}

export interface PriceEstimate {
  new_min: number | null;
  new_max: number | null;
  refurbished_min: number | null;
  refurbished_max: number | null;
  used_min: number | null;
  used_max: number | null;
  source: string;
  breakdown: string;
}

export async function analyzeEquipmentImages(imageUrls: string[]): Promise<ImageAnalysisResult> {
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('At least one image URL is required for analysis');
  }

  const imageContent = imageUrls.slice(0, 5).map(url => ({
    type: 'image_url' as const,
    image_url: { url }
  }));

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze these laboratory/industrial equipment images and extract:
          
1. **Brand**: Manufacturer name (look for logos, brand labels)
2. **Model**: Model number or name (check labels, displays, front panels)
3. **Category**: Equipment type (e.g., "Centrifuge", "Microscope", "HPLC", "Spectrophotometer", "Reactor", "Pump")
4. **Description**: Brief description of the equipment and its condition (2-3 sentences)
5. **Specifications**: Technical specs visible in images (power, voltage, dimensions, capacity, etc.)

Return ONLY a JSON object with this exact structure:
{
  "brand": "string or null",
  "model": "string or null", 
  "category": "string or null",
  "description": "string or null",
  "specifications": {
    "key": "value with units"
  },
  "confidence": 0-100
}

Examples of specifications format:
{
  "Power": "500W",
  "Voltage": "220V AC",
  "Capacity": "10L",
  "Speed Range": "500-5000 RPM"
}

If you cannot determine a field, set it to null. Set confidence based on clarity of visible information.`
        },
        ...imageContent
      ]
    }],
    max_tokens: 1000,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return {
      brand: null,
      model: null,
      category: null,
      description: null,
      specifications: {},
      confidence: 0,
    };
  }

  try {
    const result = JSON.parse(content);
    
    return {
      brand: result.brand || null,
      model: result.model || null,
      category: result.category || null,
      description: result.description || null,
      specifications: result.specifications || {},
      confidence: Math.min(100, Math.max(0, result.confidence || 0)),
    };
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    return {
      brand: null,
      model: null,
      category: null,
      description: null,
      specifications: {},
      confidence: 0,
    };
  }
}

export async function estimateEquipmentPrice(
  brand: string,
  model: string,
  category: string,
  condition: string
): Promise<PriceEstimate> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Estimate market price ranges for this laboratory/industrial equipment:

Brand: ${brand}
Model: ${model}
Category: ${category}
Condition: ${condition}

Provide realistic price estimates in USD based on typical market values. Return ONLY a JSON object:

{
  "new_min": number or null,
  "new_max": number or null,
  "refurbished_min": number or null,
  "refurbished_max": number or null,
  "used_min": number or null,
  "used_max": number or null,
  "source": "ai_estimate",
  "breakdown": "Brief explanation of price reasoning"
}

Guidelines:
- Research equipment: $5K-500K+
- Industrial equipment: $10K-1M+
- Common lab equipment: $1K-50K
- Used equipment: 30-60% of new price
- Refurbished: 50-75% of new price

If you don't have enough information, return null for that price range.`
    }],
    max_tokens: 500,
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return {
      new_min: null,
      new_max: null,
      refurbished_min: null,
      refurbished_max: null,
      used_min: null,
      used_max: null,
      source: 'ai_estimate',
      breakdown: 'Unable to estimate prices',
    };
  }

  try {
    const result = JSON.parse(content);
    
    return {
      new_min: result.new_min || null,
      new_max: result.new_max || null,
      refurbished_min: result.refurbished_min || null,
      refurbished_max: result.refurbished_max || null,
      used_min: result.used_min || null,
      used_max: result.used_max || null,
      source: result.source || 'ai_estimate',
      breakdown: result.breakdown || 'AI-generated price estimate',
    };
  } catch (error) {
    console.error('Failed to parse price estimate:', content);
    return {
      new_min: null,
      new_max: null,
      refurbished_min: null,
      refurbished_max: null,
      used_min: null,
      used_max: null,
      source: 'ai_estimate',
      breakdown: 'Unable to parse price estimate',
    };
  }
}

export interface MatchScore {
  similarity_score: number;
  match_type: 'exact' | 'variant' | 'related' | 'alternative';
  matching_features: string[];
  differences: string[];
  spec_comparison: Record<string, { wishlist: string; equipment: string; match: boolean }>;
}

export async function calculateMatchScore(
  wishlistItem: {
    brand: string;
    model: string;
    category: string;
    requiredSpecs: Record<string, string>;
  },
  equipment: {
    brand: string;
    model: string;
    category: string;
    specifications: Record<string, string>;
  }
): Promise<MatchScore> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Compare these two equipment items and calculate a match score:

**Wishlist Item:**
Brand: ${wishlistItem.brand}
Model: ${wishlistItem.model}
Category: ${wishlistItem.category}
Required Specs: ${JSON.stringify(wishlistItem.requiredSpecs)}

**Available Equipment:**
Brand: ${equipment.brand}
Model: ${equipment.model}
Category: ${equipment.category}
Specifications: ${JSON.stringify(equipment.specifications)}

Analyze and return ONLY a JSON object:

{
  "similarity_score": 0-100,
  "match_type": "exact"|"variant"|"related"|"alternative",
  "matching_features": ["list of matching features"],
  "differences": ["list of differences"],
  "spec_comparison": {
    "spec_name": {
      "wishlist": "required value",
      "equipment": "actual value",
      "match": true/false
    }
  }
}

Match type criteria:
- exact (90-100): Exact same brand/model
- variant (70-89): Same brand, compatible model
- related (50-69): Same category, different brand
- alternative (0-49): Different but could work

Consider:
- Brand/model exact match
- Category compatibility  
- Specification requirements met
- Feature overlap`
    }],
    max_tokens: 1000,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return {
      similarity_score: 0,
      match_type: 'alternative' as const,
      matching_features: [],
      differences: ['Unable to calculate match'],
      spec_comparison: {},
    };
  }

  try {
    const result = JSON.parse(content);
    
    return {
      similarity_score: Math.min(100, Math.max(0, result.similarity_score || 0)),
      match_type: result.match_type || 'alternative',
      matching_features: result.matching_features || [],
      differences: result.differences || [],
      spec_comparison: result.spec_comparison || {},
    };
  } catch (error) {
    console.error('Failed to parse match score:', content);
    return {
      similarity_score: 0,
      match_type: 'alternative' as const,
      matching_features: [],
      differences: ['Failed to parse match result'],
      spec_comparison: {},
    };
  }
}
