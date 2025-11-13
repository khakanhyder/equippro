const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

interface ApifySearchResult {
  url: string;
  title: string;
  description?: string;
}

export async function searchPDFsAndWeb(brand: string, model: string): Promise<ApifySearchResult[]> {
  if (!APIFY_TOKEN) {
    console.warn('APIFY_API_TOKEN not configured');
    throw new Error('Search service not configured. Please contact support.');
  }

  const query = `"${brand}" "${model}" (manual OR datasheet OR specifications OR "user guide") filetype:pdf`;
  
  console.log('[Apify] Searching for:', query);
  
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: query,
        maxPagesPerQuery: 1,
        resultsPerPage: 20,
        languageCode: 'en',
        countryCode: 'us',
        mobileResults: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Apify] API Error:', response.status, errorText);
      throw new Error(`Apify API returned ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const results = await response.json();
    console.log('[Apify] Raw results count:', results?.length || 0);
    
    if (!Array.isArray(results)) {
      console.error('[Apify] Unexpected response format:', results);
      throw new Error('Unexpected response format from search service');
    }

    const filtered = results
      .filter((r: any) => r.url && r.title)
      .map((r: any) => ({
        url: r.url,
        title: r.title,
        description: r.description || r.snippet || '',
      }))
      .slice(0, 10);

    console.log('[Apify] Filtered results count:', filtered.length);
    
    if (filtered.length === 0) {
      return [{
        url: `https://www.google.com/search?q=${encodeURIComponent(brand + ' ' + model + ' manual pdf')}`,
        title: `Search Google for ${brand} ${model} manuals`,
        description: 'No direct PDF links found. Click to search Google manually.',
      }];
    }

    return filtered;
  } catch (error: any) {
    console.error('[Apify] Search error:', error.message);
    throw new Error(`External search failed: ${error.message}`);
  }
}
