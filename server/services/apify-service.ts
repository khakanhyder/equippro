const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

export async function searchPDFsAndWeb(brand: string, model: string) {
  if (!APIFY_TOKEN) {
    console.warn('APIFY_API_TOKEN not configured, returning mock data');
    return [
      {
        url: `https://example.com/${brand.toLowerCase()}-${model.toLowerCase()}-manual.pdf`,
        title: `${brand} ${model} User Manual`,
      },
      {
        url: `https://example.com/${brand.toLowerCase()}-${model.toLowerCase()}-datasheet.pdf`,
        title: `${brand} ${model} Technical Datasheet`,
      },
    ];
  }

  const query = `${brand} ${model} specifications manual datasheet`;
  
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: query,
        maxPagesPerQuery: 5,
        resultsPerPage: 10,
      }),
    });

    if (!response.ok) throw new Error('Apify search failed');
    
    const results = await response.json();
    return results.filter((r: any) => 
      r.url?.includes('.pdf') || 
      r.title?.toLowerCase().includes('manual') ||
      r.title?.toLowerCase().includes('datasheet')
    );
  } catch (error) {
    console.error('Apify search error, returning fallback:', error);
    return [
      {
        url: `https://example.com/${brand.toLowerCase()}-${model.toLowerCase()}-manual.pdf`,
        title: `${brand} ${model} User Manual`,
      },
    ];
  }
}
