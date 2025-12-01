interface AiAnalysisResult {
  brand?: string;
  model?: string;
  category?: string;
  description?: string;
  specifications?: Array<{ name: string; value: string; unit?: string }>;
  confidence?: number;
}

export async function analyzeEquipmentImages(imageUrls: string[], brand?: string, model?: string): Promise<AiAnalysisResult> {
  const response = await fetch('/api/analyze/complete-flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_urls: imageUrls, brand, model }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Analysis failed' }));
    throw new Error(error.message || 'Analysis failed');
  }
  
  const result = await response.json();
  return result.final_result || {};
}

export async function searchExternalSources(brand: string, model: string) {
  const response = await fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, model, search_pdfs: true }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Search failed' }));
    throw new Error(error.message || 'Search failed');
  }
  return response.json();
}

// Search internal marketplace for matching equipment
export async function searchInternalMarketplace(brand: string, model: string, category?: string, excludeId?: number) {
  const response = await fetch('/api/equipment/search-internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, model, category, excludeId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Internal search failed' }));
    throw new Error(error.message || 'Internal search failed');
  }
  return response.json();
}

// Combined search - internal first, then external
export async function searchAllSources(brand: string, model: string, category?: string, excludeId?: number) {
  // Run both searches in parallel
  const [internalResult, externalResult] = await Promise.allSettled([
    searchInternalMarketplace(brand, model, category, excludeId),
    searchExternalSources(brand, model)
  ]);

  return {
    internal_matches: internalResult.status === 'fulfilled' ? internalResult.value.internal_matches : [],
    external_matches: externalResult.status === 'fulfilled' ? externalResult.value.external_matches : [],
    internal_error: internalResult.status === 'rejected' ? internalResult.reason?.message : null,
    external_error: externalResult.status === 'rejected' ? externalResult.reason?.message : null
  };
}
