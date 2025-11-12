interface AiAnalysisResult {
  brand?: string;
  model?: string;
  category?: string;
  specifications?: Array<{ name: string; value: string; unit?: string }>;
  confidence?: number;
}

export async function analyzeEquipmentImages(imageUrls: string[], brand?: string, model?: string): Promise<AiAnalysisResult> {
  const response = await fetch('/api/analyze/complete-flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_urls: imageUrls, brand, model }),
  });

  if (!response.ok) throw new Error('Analysis failed');
  
  const result = await response.json();
  return result.final_result || {};
}

export async function searchExternalSources(brand: string, model: string) {
  const response = await fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, model, search_pdfs: true }),
  });

  if (!response.ok) throw new Error('Search failed');
  return response.json();
}
