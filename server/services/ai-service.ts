import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MatchScore {
  similarity_score: number;
  match_type: 'exact' | 'variant' | 'related' | 'alternative';
  matching_features: string[];
  differences: string[];
  spec_comparison: Record<string, { wishlist: string; equipment: string; match: boolean }>;
}

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
- Description (detailed description of the equipment, its purpose, features, condition, and any visible details - 2-3 sentences)
- Technical specifications (name, value, unit)

Return JSON: { "brand": "...", "model": "...", "category": "...", "description": "...", "specifications": [{"name": "...", "value": "...", "unit": "..."}] }`
          },
          ...imageUrls.map(url => ({ type: "image_url" as const, image_url: { url } }))
        ]
      }
    ],
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    
    // Convert specifications array to Record<string, string> format
    const specifications: Record<string, string> = {};
    if (Array.isArray(parsed.specifications)) {
      parsed.specifications.forEach((spec: any) => {
        if (spec.name) {
          // Combine value and unit if both present
          const value = spec.value || '';
          const unit = spec.unit || '';
          specifications[spec.name] = unit ? `${value} ${unit}`.trim() : value;
        }
      });
    }
    
    return {
      brand: parsed.brand || '',
      model: parsed.model || '',
      category: parsed.category || 'other',
      description: parsed.description || '',
      specifications
    };
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    return { brand: '', model: '', category: 'other', description: '', specifications: {} };
  }
}

function parseSingle(value: string): number | null {
  if (!value) return null;
  
  let str = value.trim().toLowerCase();
  str = str.replace(/[$,\s]/g, '');
  
  const multipliers: Record<string, number> = { k: 1000, m: 1000000, b: 1000000000 };
  for (const [suffix, multiplier] of Object.entries(multipliers)) {
    if (str.endsWith(suffix)) {
      str = str.slice(0, -1);
      const num = parseFloat(str);
      return Number.isFinite(num) ? num * multiplier : null;
    }
  }
  
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : null;
}

function normalizeCurrency(value: unknown): number | null {
  if (value == null) return null;
  
  let str = String(value).trim().toLowerCase();
  str = str.replace(/[$,\s]/g, '');
  
  const rangeMatch = str.match(/^([\d.]+[kmb]?)-([\d.]+[kmb]?)$/);
  if (rangeMatch) {
    const min = parseSingle(rangeMatch[1]);
    const max = parseSingle(rangeMatch[2]);
    if (min !== null && max !== null) {
      return (min + max) / 2;
    }
    return null;
  }
  
  return parseSingle(str);
}

export function validatePriceEstimate(estimate: any) {
  return {
    new_min: normalizeCurrency(estimate.new_min),
    new_max: normalizeCurrency(estimate.new_max),
    refurbished_min: normalizeCurrency(estimate.refurbished_min),
    refurbished_max: normalizeCurrency(estimate.refurbished_max),
    used_min: normalizeCurrency(estimate.used_min),
    used_max: normalizeCurrency(estimate.used_max),
    source: String(estimate.source || 'ai_estimate'),
    breakdown: String(estimate.breakdown || 'AI-generated estimate')
  };
}

export function sanitizePriceContext(cached: { priceRanges: any; priceSource: any; priceBreakdown: any } | null) {
  if (!cached || !cached.priceRanges) return null;
  
  try {
    const sanitized = validatePriceEstimate(cached.priceRanges);
    const hasValidData = Object.values(sanitized)
      .filter(v => typeof v === 'number')
      .some(v => v !== null && Number.isFinite(v));
    
    if (!hasValidData) return null;
    
    let marketplaceListings: any[] = [];
    const rawListings = cached.priceRanges.marketplace_listings || cached.priceRanges.marketplaceSources || [];
    if (Array.isArray(rawListings) && rawListings.length > 0) {
      marketplaceListings = rawListings.slice(0, 20).map((listing: any) => ({
        url: String(listing.url || ''),
        price: Number.isFinite(Number(listing.price)) ? Number(listing.price) : 0,
        source: String(listing.source || ''),
        condition: String(listing.condition || 'used'),
        title: listing.title ? String(listing.title).slice(0, 200) : undefined
      })).filter(l => l.url && l.price > 0);
    }
    
    return {
      priceRanges: { ...sanitized, marketplace_listings: marketplaceListings },
      priceSource: String(cached.priceSource || sanitized.source),
      priceBreakdown: String(cached.priceBreakdown || sanitized.breakdown)
    };
  } catch (error) {
    console.error('Failed to sanitize cached price context:', error);
    return null;
  }
}

export async function estimatePrice(brand: string, model: string, category: string, condition: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0, // Consistent results for same input
    messages: [
      {
        role: "user",
        content: `Estimate market price ranges for: ${brand} ${model} (${category}, ${condition} condition).
Return JSON with numeric values only: { "new_min": 0, "new_max": 0, "refurbished_min": 0, "refurbished_max": 0, "used_min": 0, "used_max": 0, "source": "...", "breakdown": "..." }`
      }
    ],
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  
  try {
    const parsed = JSON.parse(content);
    return validatePriceEstimate(parsed);
  } catch (error) {
    console.error('Failed to parse price estimate:', content);
    return validatePriceEstimate({});
  }
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
      match_type: 'alternative',
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
      match_type: 'alternative',
      matching_features: [],
      differences: ['Failed to parse match result'],
      spec_comparison: {},
    };
  }
}
