const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

interface ApifySearchResult {
  url: string;
  title: string;
  description?: string;
}

interface MarketplaceListing {
  url: string;
  title: string;
  price: number;
  condition: 'new' | 'refurbished' | 'used';
  source: string;
}

export async function searchPDFsAndWeb(brand: string, model: string): Promise<ApifySearchResult[]> {
  if (!APIFY_TOKEN) {
    console.warn('APIFY_API_TOKEN not configured');
    throw new Error('Search service not configured. Please contact support.');
  }

  const query = `"${brand}" "${model}" manual OR datasheet OR specifications`;
  
  console.log('[Apify] Searching for:', query);
  
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: query,
        maxPagesPerQuery: 2,
        resultsPerPage: 30,
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

    const allOrganicResults = results.flatMap((page: any) => page.organicResults || []);
    console.log('[Apify] Total organic results:', allOrganicResults.length);

    const filtered = allOrganicResults
      .filter((r: any) => {
        if (!r.url || !r.title) return false;
        
        const url = r.url.toLowerCase();
        const title = r.title.toLowerCase();
        const description = (r.description || '').toLowerCase();
        const modelLower = model.toLowerCase();
        
        const isSearchPage = url.includes('/search/') || 
                             url.includes('/search?') ||
                             url.includes('?page=') ||
                             url.includes('?q=') ||
                             url.includes('/category/') ||
                             url.includes('/categories/');
        
        if (isSearchPage) {
          console.log('[Apify] Filtered out search/category page:', r.url);
          return false;
        }
        
        const hasModelInTitle = title.includes(modelLower);
        const hasModelInUrl = url.includes(modelLower);
        const hasModelInDescription = description.includes(modelLower);
        
        if (!hasModelInTitle && !hasModelInUrl && !hasModelInDescription) {
          console.log('[Apify] Filtered out - model not found in content:', r.url);
          return false;
        }
        
        return true;
      })
      .map((r: any) => ({
        url: r.url,
        title: r.title,
        description: r.description || '',
      }))
      .slice(0, 15);

    console.log('[Apify] Filtered results count:', filtered.length);
    
    if (filtered.length === 0) {
      return [{
        url: `https://www.google.com/search?q=${encodeURIComponent(brand + ' ' + model + ' manual pdf')}`,
        title: `Search Google for ${brand} ${model} manuals`,
        description: 'No direct links found. Click to search Google manually.',
      }];
    }

    return filtered;
  } catch (error: any) {
    console.error('[Apify] Search error:', error.message);
    throw new Error(`External search failed: ${error.message}`);
  }
}

export async function searchMarketplaceListings(brand: string, model: string): Promise<ApifySearchResult[]> {
  if (!APIFY_TOKEN) {
    console.warn('APIFY_API_TOKEN not configured');
    throw new Error('Search service not configured. Please contact support.');
  }

  const query = `"${brand}" "${model}" buy OR price OR "for sale"`;
  
  console.log('[Apify] Searching marketplace for:', query);
  
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: query,
        maxPagesPerQuery: 3,
        resultsPerPage: 40,
        languageCode: 'en',
        countryCode: 'us',
        mobileResults: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Apify] Marketplace search API Error:', response.status, errorText);
      throw new Error(`Apify API returned ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const results = await response.json();
    console.log('[Apify] Marketplace raw results count:', results?.length || 0);
    
    if (!Array.isArray(results)) {
      console.error('[Apify] Unexpected marketplace response format:', results);
      throw new Error('Unexpected response format from search service');
    }

    const allOrganicResults = results.flatMap((page: any) => page.organicResults || []);
    console.log('[Apify] Total marketplace organic results:', allOrganicResults.length);

    const filtered = allOrganicResults
      .filter((r: any) => {
        if (!r.url || !r.title) {
          return false;
        }
        
        const url = r.url.toLowerCase();
        const title = r.title.toLowerCase();
        const description = (r.description || '').toLowerCase();
        const modelLower = model.toLowerCase();
        
        const isSearchPage = url.includes('/search/') || 
                             url.includes('/search?') ||
                             url.includes('?page=') ||
                             url.includes('?q=') ||
                             url.includes('/category/') ||
                             url.includes('/categories/');
        
        if (isSearchPage) {
          console.log('[Apify] Filtered out search/category page:', r.url);
          return false;
        }
        
        const hasModelInTitle = title.includes(modelLower);
        const hasModelInUrl = url.includes(modelLower);
        const hasModelInDescription = description.includes(modelLower);
        
        if (!hasModelInTitle && !hasModelInUrl && !hasModelInDescription) {
          console.log('[Apify] Filtered out - model not found:', r.title);
          return false;
        }
        
        const isMarketplace = url.includes('ebay.com/itm/') || 
                              url.includes('labx.com/item/') || 
                              url.includes('biocompare.com') ||
                              url.includes('thomasnet.com') ||
                              url.includes('labwrench.com') ||
                              url.includes('equipnet.com') ||
                              url.includes('reuzeit.com/product/') ||
                              url.includes('questpair.com/marketplace/') ||
                              url.includes('ssllc.com/catalog/') ||
                              url.includes('banebio.com/product/') ||
                              url.includes('machinio.com') ||
                              url.includes('radwell.com') ||
                              url.includes('picclick.com');
        
        const hasPriceIndicator = title.includes('price') || 
                                  title.includes('$') || 
                                  title.includes('buy') ||
                                  title.includes('sale') ||
                                  title.includes('usd');
        
        return isMarketplace || hasPriceIndicator;
      })
      .map((r: any) => ({
        url: r.url,
        title: r.title,
        description: r.description || '',
      }));

    console.log('[Apify] Marketplace filtered results count:', filtered.length);
    
    return filtered.slice(0, 20);
  } catch (error: any) {
    console.error('[Apify] Marketplace search error:', error.message);
    throw new Error(`Marketplace search failed: ${error.message}`);
  }
}

export async function scrapePricesFromURLs(urls: string[]): Promise<MarketplaceListing[]> {
  if (!APIFY_TOKEN) {
    console.warn('APIFY_API_TOKEN not configured');
    throw new Error('Search service not configured. Please contact support.');
  }

  if (urls.length === 0) {
    return [];
  }

  console.log('[Apify] Scraping prices from', urls.length, 'URLs');
  
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: urls.map(url => ({ url })),
        maxPagesPerCrawl: urls.length,
        maxConcurrency: 5,
        pageFunction: `
          async function pageFunction(context) {
            const { $, request } = context;
            
            // Try to extract price from common selectors
            const pricePatterns = [
              '.price', '.Price', '[class*="price"]', '[class*="Price"]',
              '[data-price]', '#price', '.sale-price', '.current-price',
              '[itemprop="price"]', '.product-price', '.listing-price'
            ];
            
            let priceText = '';
            for (const selector of pricePatterns) {
              const element = $(selector).first();
              if (element.length > 0) {
                priceText = element.text();
                break;
              }
            }
            
            // Extract numeric price
            const priceMatch = priceText.match(/\\$?([0-9,]+\\.?[0-9]*)/);
            const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;
            
            // Detect condition from title/description with word boundaries
            const pageText = $('body').text().toLowerCase();
            const title = $('title').text().toLowerCase();
            const combinedText = title + ' ' + pageText;
            
            // Use regex with word boundaries for accurate detection
            let condition = 'used'; // Default
            
            // Check for refurbished first (higher priority than used)
            if (/\\b(refurbished|refurb|certified\\s+refurbished|factory\\s+refurbished)\\b/i.test(combinedText)) {
              condition = 'refurbished';
            }
            // Check for new (highest priority)
            else if (/\\b(brand\\s+new|new\\s+in\\s+box|factory\\s+new|unused|nib)\\b/i.test(combinedText)) {
              condition = 'new';
            }
            // Check for explicit used indicators
            else if (/\\b(used|pre-owned|preowned|second\\s+hand|as-is)\\b/i.test(combinedText)) {
              condition = 'used';
            }
            
            return {
              url: request.url,
              title: $('title').text() || $('h1').first().text(),
              price: price,
              condition: condition,
              source: new URL(request.url).hostname
            };
          }
        `
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Apify] Price scraping API Error:', response.status, errorText);
      throw new Error(`Apify API returned ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const results = await response.json();
    console.log('[Apify] Price scraping raw results count:', results?.length || 0);
    
    if (!Array.isArray(results)) {
      console.error('[Apify] Unexpected price scraping response format:', results);
      throw new Error('Unexpected response format from scraping service');
    }

    const listings: MarketplaceListing[] = results
      .filter((r: any) => r.price && r.price > 0)
      .map((r: any) => ({
        url: r.url,
        title: r.title,
        price: r.price,
        condition: r.condition as 'new' | 'refurbished' | 'used',
        source: r.source
      }));

    console.log('[Apify] Valid price listings found:', listings.length);
    
    return listings;
  } catch (error: any) {
    console.error('[Apify] Price scraping error:', error.message);
    throw new Error(`Price scraping failed: ${error.message}`);
  }
}
