const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

interface ApifySearchResult {
  url: string;
  title: string;
  description?: string;
  _queryName?: string; // Tracks which search query found this result for condition hints
}

interface MarketplaceListing {
  url: string;
  title: string;
  price: number;
  condition: 'new' | 'refurbished' | 'used';
  source: string;
}

/**
 * Normalizes brand/model strings for consistent search queries
 * Removes extra spaces, standardizes punctuation, converts to lowercase
 * Example: "Perkin Elmer" and "PerkinElmer" both become "perkin elmer"
 */
export function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
    .replace(/\s+/g, ' ')    // Collapse multiple spaces to single space
    .trim();
}

export async function searchPDFsAndWeb(brand: string, model: string): Promise<ApifySearchResult[]> {
  if (!APIFY_TOKEN) {
    console.warn('APIFY_API_TOKEN not configured');
    throw new Error('Search service not configured. Please contact support.');
  }

  // Normalize brand and model for consistent search results
  const normalizedBrand = normalizeSearchTerm(brand);
  const normalizedModel = normalizeSearchTerm(model);

  const query = `"${normalizedBrand}" "${normalizedModel}" manual OR datasheet OR specifications`;
  
  console.log('[Apify] Searching for (normalized):', query);
  
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
        
        // Use normalized model for comparison
        const hasModelInTitle = title.includes(normalizedModel);
        const hasModelInUrl = url.includes(normalizedModel);
        const hasModelInDescription = description.includes(normalizedModel);
        
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

// Comprehensive list of known lab equipment marketplaces worldwide
const KNOWN_MARKETPLACES = [
  // US Marketplaces
  'ebay.com', 'labx.com', 'biocompare.com', 'thomasnet.com', 'labwrench.com',
  'equipnet.com', 'machinio.com', 'radwell.com', 'picclick.com', 'dotmed.com',
  'usascientific.com', 'fishersci.com', 'sigmaaldrich.com', 'thelabworldgroup.com',
  'americanlaboratorytrading.com', 'newlifescientific.com', 'scientific-equipment.com',
  'reuzeit.com', 'questpair.com', 'ssllc.com', 'banebio.com', 'alibaba.com',
  // German/European Marketplaces
  'fishersci.de', 'neolab.de', 'carlroth.de', 'vwr.de', 'merckmillipore.de',
  'labmarket.de', 'omnilab.de', 'labexchange.de', 'laborhandel.de',
  'fishersci.co.uk', 'vwr.com', 'agilent.com', 'thermofisher.com',
  // UK Marketplaces
  'ebay.co.uk', 'fishersci.co.uk', 'scientificlabs.co.uk', 'wolflabs.co.uk',
  // French Marketplaces
  'fishersci.fr', 'vwr.fr', 'labbox.com', 'dutscher.com',
  // Italian Marketplaces
  'fishersci.it', 'vwr.it', 'carlroth.it',
  // Japanese Marketplaces
  'as-1.co.jp', 'monotaro.com', 'fishersci.jp', 'labchem-wako.co.jp',
  // Australian Marketplaces
  'fishersci.com.au', 'thermofisher.com.au', 'sigmaaldrich.com.au',
  // Canadian Marketplaces
  'fishersci.ca', 'vwr.ca', 'sigmaaldrich.ca',
  // Global eBay
  'ebay.de', 'ebay.co.uk', 'ebay.ca', 'ebay.com.au', 'ebay.fr', 'ebay.it', 'ebay.co.jp',
  // China/Global
  'alibaba.com', 'made-in-china.com', 'globalsources.com',
];

export async function searchMarketplaceListings(brand: string, model: string): Promise<ApifySearchResult[]> {
  if (!APIFY_TOKEN) {
    console.warn('APIFY_API_TOKEN not configured');
    throw new Error('Search service not configured. Please contact support.');
  }

  // Normalize brand and model for consistent marketplace search
  const normalizedBrand = normalizeSearchTerm(brand);
  const normalizedModel = normalizeSearchTerm(model);

  // Run parallel searches across ALL major global markets with condition-specific queries
  const globalQueries = [
    // General marketplace searches - broad coverage
    { query: `"${normalizedBrand}" "${normalizedModel}" buy price "for sale"`, lang: 'en', country: 'us', name: 'US' },
    { query: `"${normalizedBrand}" "${normalizedModel}" buy price shop`, lang: 'en', country: 'gb', name: 'UK' },
    { query: `"${normalizedBrand}" "${normalizedModel}" kaufen preis`, lang: 'de', country: 'de', name: 'DE' },
    { query: `"${normalizedBrand}" "${normalizedModel}" buy price`, lang: 'en', country: 'ca', name: 'CA' },
    
    // NEW equipment - target official distributors and new sellers
    { query: `"${normalizedBrand}" "${normalizedModel}" site:fishersci.com OR site:thermofisher.com OR site:vwr.com`, lang: 'en', country: 'us', name: 'US-Official' },
    { query: `"${normalizedBrand}" "${normalizedModel}" "brand new" OR "factory sealed" price`, lang: 'en', country: 'us', name: 'US-New' },
    { query: `"${normalizedBrand}" "${normalizedModel}" new "in stock" buy`, lang: 'en', country: 'us', name: 'US-NewStock' },
    
    // REFURBISHED equipment - target quality resellers
    { query: `"${normalizedBrand}" "${normalizedModel}" refurbished OR reconditioned price`, lang: 'en', country: 'us', name: 'US-Refurb1' },
    { query: `"${normalizedBrand}" "${normalizedModel}" certified pre-owned OR renewed`, lang: 'en', country: 'us', name: 'US-Refurb2' },
    { query: `"${normalizedBrand}" "${normalizedModel}" site:questpair.com OR site:thelabworldgroup.com OR site:banebio.com`, lang: 'en', country: 'us', name: 'US-RefurbSites' },
    
    // USED equipment - target secondary marketplaces
    { query: `"${normalizedBrand}" "${normalizedModel}" used "for sale" price`, lang: 'en', country: 'us', name: 'US-Used1' },
    { query: `"${normalizedBrand}" "${normalizedModel}" site:ebay.com price`, lang: 'en', country: 'us', name: 'US-eBay' },
    { query: `"${normalizedBrand}" "${normalizedModel}" site:labx.com OR site:dotmed.com OR site:biosurplus.com`, lang: 'en', country: 'us', name: 'US-UsedSites' },
    
    // Additional eBay coverage (different regions for more listings)
    { query: `"${normalizedBrand}" "${normalizedModel}" site:ebay.com`, lang: 'en', country: 'gb', name: 'UK-eBay' },
    { query: `"${normalizedBrand}" "${normalizedModel}" site:ebay.de`, lang: 'de', country: 'de', name: 'DE-eBay' },
  ];
  
  console.log('[Apify] Searching', globalQueries.length, 'global markets for:', normalizedBrand, normalizedModel);
  
  try {
    // Parallel search across ALL global markets
    const searchPromises = globalQueries.map(({ query, lang, country, name }) =>
      fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: query,
          maxPagesPerQuery: 2,
          resultsPerPage: 30,
          languageCode: lang,
          countryCode: country,
          mobileResults: false,
        }),
      }).then(async (res) => ({ name, response: res }))
        .catch((err) => ({ name, error: err.message }))
    );

    const responses = await Promise.all(searchPromises);

    // Process ALL global results - tag each result with its source query for condition hints
    let allOrganicResults: any[] = [];
    
    for (const result of responses) {
      if ('error' in result) {
        console.error(`[Apify] ${result.name} search failed:`, result.error);
        continue;
      }
      
      const { name, response } = result;
      if (response.ok) {
        try {
          const data = await response.json();
          if (Array.isArray(data)) {
            const organic = data.flatMap((page: any) => page.organicResults || []);
            console.log(`[Apify] ${name} organic results:`, organic.length);
            // Tag each result with the query name for condition hinting
            const taggedOrganic = organic.map((r: any) => ({ ...r, _queryName: name }));
            allOrganicResults.push(...taggedOrganic);
          }
        } catch (e) {
          console.error(`[Apify] ${name} parse error:`, e);
        }
      } else {
        console.error(`[Apify] ${name} search failed:`, response.status);
      }
    }
    
    console.log('[Apify] Total global marketplace results:', allOrganicResults.length);

    const filtered = allOrganicResults
      .filter((r: any) => {
        if (!r.url || !r.title) {
          return false;
        }
        
        const url = r.url.toLowerCase();
        const title = r.title.toLowerCase();
        const description = (r.description || '').toLowerCase();
        
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
        
        // Create flexible model variations for matching
        // "Centrifuge 5810 R" -> ["centrifuge 5810 r", "5810 r", "5810r", "5810"]
        const modelVariations = [
          normalizedModel,                                    // "centrifuge 5810 r"
          normalizedModel.replace(/\s+/g, ''),                // "centrifuge5810r"
          normalizedModel.split(' ').slice(-2).join(' '),     // "5810 r"
          normalizedModel.split(' ').slice(-2).join(''),      // "5810r"
          normalizedModel.split(' ').pop() || '',             // "r" (just letter)
          normalizedModel.replace(/[^0-9]/g, ''),             // "5810" (just numbers)
        ].filter(v => v.length >= 3); // Only use variations with 3+ chars
        
        // Also extract model numbers like "5810" from the normalized model
        const modelNumber = normalizedModel.match(/\d{3,}/)?.[0] || '';
        if (modelNumber.length >= 3) {
          modelVariations.push(modelNumber);
        }
        
        // Check if any model variation is in title/url/description
        const hasModelInTitle = modelVariations.some(v => title.includes(v));
        const hasModelInUrl = modelVariations.some(v => url.includes(v));
        const hasModelInDescription = modelVariations.some(v => description.includes(v));
        
        if (!hasModelInTitle && !hasModelInUrl && !hasModelInDescription) {
          // Only log if there's something interesting (not generic titles)
          if (title.length > 10) {
            console.log('[Apify] Filtered out - model not found:', r.title.substring(0, 60));
          }
          return false;
        }
        
        // Also check for brand presence for better relevance
        const hasBrandInTitle = title.includes(normalizedBrand);
        const hasBrandInUrl = url.includes(normalizedBrand);
        const hasBrandInDescription = description.includes(normalizedBrand);
        
        const hasBrand = hasBrandInTitle || hasBrandInUrl || hasBrandInDescription;
        
        // Check if URL is from any known marketplace (prioritized)
        const isKnownMarketplace = KNOWN_MARKETPLACES.some(domain => url.includes(domain));
        
        const hasPriceIndicator = title.includes('price') || 
                                  title.includes('$') || 
                                  title.includes('€') ||
                                  title.includes('buy') ||
                                  title.includes('sale') ||
                                  title.includes('shop') ||
                                  title.includes('kaufen') ||  // German: buy
                                  title.includes('preis') ||   // German: price
                                  title.includes('bestellen') || // German: order
                                  title.includes('usd') ||
                                  title.includes('eur') ||
                                  description.includes('price') ||
                                  description.includes('$') ||
                                  description.includes('€');
        
        // Exclude non-commercial pages (manuals, PDFs, forums, Wikipedia, etc.)
        const isNonCommercial = url.includes('.pdf') ||
                                 url.includes('manual') ||
                                 url.includes('datasheet') ||
                                 url.includes('wikipedia') ||
                                 url.includes('researchgate') ||
                                 url.includes('youtube.com') ||
                                 url.includes('reddit.com') ||
                                 url.includes('forum');
        
        if (isNonCommercial) {
          console.log('[Apify] Skipping non-commercial page:', url);
          return false;
        }
        
        // BROAD SEARCH: Accept ANY page with price indicators or from known marketplaces
        // This captures all Google results that could have pricing
        const isRelevant = isKnownMarketplace || hasPriceIndicator || hasBrand;
        
        return isRelevant;
      })
      .map((r: any) => ({
        url: r.url,
        title: r.title,
        description: r.description || '',
        _queryName: r._queryName || '', // Preserve query name for condition hints
      }));

    console.log('[Apify] Marketplace filtered results count:', filtered.length);
    
    // Deduplicate URLs (same page might appear in both US and DE searches)
    const seenUrls = new Set<string>();
    const deduped = filtered.filter((r: any) => {
      const urlBase = r.url.split('?')[0].toLowerCase(); // Ignore query params for dedup
      if (seenUrls.has(urlBase)) return false;
      seenUrls.add(urlBase);
      return true;
    });
    
    // Prioritize official NEW sellers
    const officialNewSellers = ['thermofisher', 'fishersci', 'sigmaaldrich', 'vwr', 'agilent', 
      'bio-rad', 'biorad', 'carlroth', 'merck', 'beckman', 'perkinelmer', 'waters', 'shimadzu',
      'sartorius', 'mettler-toledo', 'hach', 'illumina', 'roche', 'pipette.com', 'usascientific', 
      'coleparmer', 'grainger', 'millipore', 'eppendorf', 'tecan'];
    
    // Also prioritize refurbished/used marketplaces to ensure condition variety
    const refurbishedMarketplaces = ['questpair', 'thelabworldgroup', 'banebio', 'labx', 
      'biosurplus', 'biomart', 'dotmed', 'labequip', 'machinio', 'labexchange'];
    
    // Separate results by source type
    const officialUrls = deduped.filter((r: any) => 
      officialNewSellers.some(seller => r.url.toLowerCase().includes(seller))
    );
    const refurbUrls = deduped.filter((r: any) => 
      refurbishedMarketplaces.some(site => r.url.toLowerCase().includes(site)) &&
      !officialNewSellers.some(seller => r.url.toLowerCase().includes(seller))
    );
    const otherUrls = deduped.filter((r: any) => 
      !officialNewSellers.some(seller => r.url.toLowerCase().includes(seller)) &&
      !refurbishedMarketplaces.some(site => r.url.toLowerCase().includes(site))
    );
    
    // Balanced selection: 8 official (new), 8 refurbished/used, 9 other
    const prioritized = [
      ...officialUrls.slice(0, 8),
      ...refurbUrls.slice(0, 8),
      ...otherUrls
    ].slice(0, 25);
    
    console.log(`[Apify] URL balance: ${officialUrls.length} official, ${refurbUrls.length} refurb sites, ${otherUrls.length} other`);
    
    if (officialUrls.length > 0) {
      console.log('[Apify] Found', officialUrls.length, 'official seller URLs, prioritizing', Math.min(8, officialUrls.length));
    }
    
    // Limit to 25 URLs for more data per condition while staying within timeout
    const limited = prioritized;
    if (deduped.length > 25) {
      console.log('[Apify] Limited to 25 URLs for price data (from', deduped.length, 'unique found)');
    }
    
    return limited;
  } catch (error: any) {
    console.error('[Apify] Marketplace search error:', error.message);
    throw new Error(`Marketplace search failed: ${error.message}`);
  }
}

// Map to track condition hints by normalized URL
let conditionHintsByUrl: Map<string, string> = new Map();

// Normalize URL for consistent matching (handles canonical URL changes by Apify)
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Use origin + pathname, lowercase, strip trailing slash
    return (parsed.origin + parsed.pathname).toLowerCase().replace(/\/+$/, '');
  } catch {
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

export async function scrapePricesFromURLs(urls: string[] | ApifySearchResult[]): Promise<MarketplaceListing[]> {
  if (!APIFY_TOKEN) {
    console.warn('APIFY_API_TOKEN not configured');
    throw new Error('Search service not configured. Please contact support.');
  }

  if (urls.length === 0) {
    return [];
  }

  // Handle both string[] and ApifySearchResult[] inputs
  let urlStrings: string[];
  if (typeof urls[0] === 'string') {
    urlStrings = urls as string[];
  } else {
    const searchResults = urls as ApifySearchResult[];
    urlStrings = searchResults.map(r => r.url);
    // Build condition hints map from query names using normalized URLs
    conditionHintsByUrl = new Map();
    // Known refurbished/used marketplace domains
    const refurbishedDomains = ['questpair', 'thelabworldgroup', 'banebio', 'labx', 
      'biosurplus', 'biomart', 'dotmed', 'labequip', 'machinio', 'labexchange'];
    const usedDomains = ['ebay'];
    
    searchResults.forEach(r => {
      // Determine condition hint from query name OR URL domain
      let hint = '';
      const urlLower = r.url.toLowerCase();
      
      // First, check query name
      if (r._queryName) {
        if (r._queryName.includes('Refurb')) {
          hint = 'refurbished';
        } else if (r._queryName.includes('New') || r._queryName.includes('Official')) {
          hint = 'new';
        } else if (r._queryName.includes('Used') || r._queryName.includes('eBay')) {
          hint = 'used';
        }
      }
      
      // Second, use URL domain as hint (overrides if query didn't set a specific hint)
      // Refurbished marketplaces should hint 'refurbished' unless query says 'new'
      if (hint !== 'new') {
        if (refurbishedDomains.some(d => urlLower.includes(d))) {
          hint = 'refurbished';
        } else if (usedDomains.some(d => urlLower.includes(d))) {
          hint = 'used';
        }
      }
      
      if (hint) {
        const normalizedUrl = normalizeUrl(r.url);
        conditionHintsByUrl.set(normalizedUrl, hint);
        console.log(`[Apify] Hint '${hint}' for: ${normalizedUrl.substring(0, 60)}`);
      }
    });
    console.log('[Apify] Condition hints built for', conditionHintsByUrl.size, 'URLs');
    // Debug: Show all hints
    conditionHintsByUrl.forEach((hint, url) => {
      console.log(`[Apify] Hint stored: ${hint} => ${url.substring(0, 80)}`);
    });
  }

  console.log('[Apify] Fast scraping', urlStrings.length, 'URLs using Cheerio');
  
  try {
    // Use Cheerio scraper for faster HTML parsing (no JavaScript rendering)
    const response = await fetch(`https://api.apify.com/v2/acts/apify~cheerio-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: urlStrings.map(url => ({ url })),
        maxRequestsPerCrawl: urlStrings.length,
        maxConcurrency: 25, // High concurrency for Cheerio (parallel scraping)
        maxRequestRetries: 1,
        requestTimeoutSecs: 12,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
          apifyProxyCountry: 'US'
        },
        pageFunction: `
          async function pageFunction(context) {
            const { $, request } = context;
            const url = request.url;
            const hostname = new URL(url).hostname;
            
            let priceText = '';
            let title = '';
            
            try {
              // Find price using various selectors
              const priceSelectors = [
                '[itemprop="price"]',
                '.price:first', '.Price:first',
                '[class*="price"]:first', '[class*="Price"]:first',
                '[data-price]', '#price',
                '.sale-price:first', '.current-price:first',
                '.product-price:first', '.listing-price:first'
              ];
              
              for (const selector of priceSelectors) {
                const el = $(selector);
                if (el.length > 0) {
                  priceText = el.first().text().trim();
                  if (priceText && /[0-9]/.test(priceText)) break;
                }
              }
              
              // Get title
              title = $('h1:first').text().trim() || $('title').text().trim();
              
              // Currency conversion rates
              const CURRENCY_TO_USD = {
                'EUR': 1.08, 'GBP': 1.26, 'CAD': 0.74,
                'AUD': 0.65, 'CHF': 1.12, 'JPY': 0.0067, 'CNY': 0.14
              };
              
              function normalizePriceText(text) {
                if (!text) return null;
                const trimmed = text.trim();
                
                let conversionRate = 1.0;
                let currency = 'USD';
                
                if (/€|EUR/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['EUR']; currency = 'EUR';
                } else if (/£|GBP/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['GBP']; currency = 'GBP';
                } else if (/CA\\$|C\\$|CAD/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['CAD']; currency = 'CAD';
                } else if (/AU\\$|A\\$|AUD/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['AUD']; currency = 'AUD';
                } else if (/CHF/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['CHF']; currency = 'CHF';
                } else if (/¥|JPY|円/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['JPY']; currency = 'JPY';
                }
                
                const cleanText = trimmed
                  .replace(/US\\s*\\$/gi, '')
                  .replace(/USD|EUR|GBP|CAD|AUD|CHF|JPY|CNY|RMB/gi, '')
                  .replace(/[€£$¥円元]/g, '')
                  .replace(/CA\\$|C\\$|AU\\$|A\\$/gi, '');
                
                const numericMatch = cleanText.match(/([0-9][0-9,. ]*)/);
                if (!numericMatch) return null;
                
                let numericPart = numericMatch[1].replace(/\\s/g, '');
                
                const lastCommaPos = numericPart.lastIndexOf(',');
                const lastPeriodPos = numericPart.lastIndexOf('.');
                
                if (lastCommaPos > -1 && lastPeriodPos > -1 && lastCommaPos > lastPeriodPos) {
                  numericPart = numericPart.replace(/\\./g, '').replace(',', '.');
                } else if (lastCommaPos > -1 && lastPeriodPos > -1) {
                  numericPart = numericPart.replace(/,/g, '');
                } else if (lastCommaPos > -1) {
                  const parts = numericPart.split(',');
                  if (parts[1] && parts[1].length === 2) {
                    numericPart = numericPart.replace(',', '.');
                  } else {
                    numericPart = numericPart.replace(/,/g, '');
                  }
                }
                
                const parsed = parseFloat(numericPart);
                if (isNaN(parsed)) return null;
                return parsed * conversionRate;
              }
              
              const price = normalizePriceText(priceText);
              const titleLower = title.toLowerCase();
              const hostname = new URL(url).hostname.toLowerCase();
              
              // Get product-specific text (title + meta description + product area only)
              const productText = (title + ' ' + ($('meta[name="description"]').attr('content') || '') + ' ' + 
                ($('.product-condition, .item-condition, [class*="condition"]').text() || '')).toLowerCase();
              
              // eBay-specific condition extraction
              const ebayCondition = ($('.x-item-condition-text .ux-textspans').text() || 
                $('.vim-condition-text').text() || 
                $('[data-testid="x-item-condition"]').text() ||
                $('.ux-labels-values--condition .ux-textspans--SECONDARY').text() || '').toLowerCase();
              
              // Official manufacturers/distributors sell NEW by default
              const officialSellers = ['thermofisher', 'fishersci', 'sigmaaldrich', 'vwr', 'agilent', 'eppendorf', 
                'bio-rad', 'biorad', 'carlroth', 'merck', 'tecan', 'beckman', 'perkinelmer', 'waters', 'shimadzu',
                'sartorius', 'mettler-toledo', 'mettlertoledo', 'hach', 'illumina', 'roche', 'pipette.com',
                'usascientific', 'usscientific', 'coleparmer', 'thomassci', 'grainger', 'wwgroupinc', 'millipore',
                'watson-marlow', 'watsonmarlow', 'newark', 'digikey', 'mouser', 'mcmaster', 'mcmaster-carr'];
              const isOfficialSeller = officialSellers.some(seller => hostname.includes(seller));
              
              // NEW equipment resellers (sell primarily new equipment)
              const newEquipmentSellers = ['questpair', 'thelabworldgroup', 'banebio', 'thermobid', 'genlab', 
                'biocompare', 'labwrench', 'directindustry', 'medwow', 'promed', 'blockscientific'];
              const isNewEquipmentReseller = newEquipmentSellers.some(seller => hostname.includes(seller));
              
              // Condition indicators - check TITLE and productText
              const refurbPatterns = /refurbished|refurb|certified pre-owned|reconditioned|renewed|professionally restored|factory refurb/i;
              const usedPatterns = /\\bused\\b|pre-owned|preowned|second.?hand|previously owned|as-is|for parts/i;
              const newPatterns = /\\bbrand new\\b|new in box|factory new|factory sealed|\\bunused\\b|\\bnib\\b|\\bnew\\b(?!\\s*listing)|unopened|sealed box/i;
              
              const refurbTitleMatch = refurbPatterns.test(titleLower);
              const usedTitleMatch = usedPatterns.test(titleLower);
              const newTitleMatch = newPatterns.test(titleLower);
              
              // Check eBay condition field specifically
              const ebayIsNew = /\\bnew\\b|brand new|factory sealed/i.test(ebayCondition);
              const ebayIsRefurb = /refurbished|certified|seller refurb|manufacturer refurb/i.test(ebayCondition);
              const ebayIsUsed = /\\bused\\b|pre-owned|open box/i.test(ebayCondition);
              
              // Marketplace-specific condition detection
              const isEbay = hostname.includes('ebay');
              const isLabx = hostname.includes('labx');
              const isDotmed = hostname.includes('dotmed');
              const isBimedis = hostname.includes('bimedis');
              const isUsedEquipmentMarketplace = isLabx || isDotmed || isBimedis || 
                hostname.includes('biosurplus') || hostname.includes('machinio') || hostname.includes('used-line');
              
              // Default to 'new' for sellers without explicit condition indicators
              // Only used equipment marketplaces and eBay default to 'used'
              let condition = 'new';
              
              // Priority 1: eBay-specific condition field (most reliable for eBay)
              if (isEbay) {
                if (ebayIsNew) condition = 'new';
                else if (ebayIsRefurb) condition = 'refurbished';
                else if (ebayIsUsed) condition = 'used';
                else if (newTitleMatch) condition = 'new';
                else if (refurbTitleMatch) condition = 'refurbished';
                else if (usedTitleMatch) condition = 'used';
                else condition = 'used'; // eBay is primarily a used marketplace
              }
              // Priority 2: Used equipment marketplaces default to used
              else if (isUsedEquipmentMarketplace) {
                if (newTitleMatch || newPatterns.test(productText)) {
                  condition = 'new';
                } else if (refurbTitleMatch || refurbPatterns.test(productText)) {
                  condition = 'refurbished';
                } else if (usedTitleMatch) {
                  condition = 'used';
                } else {
                  condition = 'used'; // Used equipment marketplaces default to used
                }
              }
              // Priority 3: Check title for explicit condition (most reliable)
              else if (refurbTitleMatch) {
                condition = 'refurbished';
              } else if (usedTitleMatch) {
                condition = 'used';
              } else if (newTitleMatch) {
                condition = 'new';
              }
              // Priority 4: Official sellers default to NEW
              else if (isOfficialSeller) {
                condition = 'new';
              }
              // Priority 5: New equipment resellers - check text, default to new
              else if (isNewEquipmentReseller) {
                if (refurbPatterns.test(productText)) {
                  condition = 'refurbished';
                } else if (usedPatterns.test(productText)) {
                  condition = 'used';
                } else {
                  condition = 'new'; // Quality resellers default to new unless marked otherwise
                }
              }
              // Priority 6: Other sellers - check productText for condition indicators
              else if (refurbPatterns.test(productText)) {
                condition = 'refurbished';
              } else if (usedPatterns.test(productText)) {
                condition = 'used';
              }
              // If no indicators found, keeps default 'new' from initialization
              
              return {
                url: url,
                title: title,
                price: price,
                condition: condition,
                source: hostname
              };
            } catch (err) {
              return {
                url: url,
                title: '',
                price: null,
                condition: 'new', // Default to new for unknown cases
                source: hostname
              };
            }
          }
        `
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Apify] Cheerio scraping API Error:', response.status, errorText);
      throw new Error(`Cheerio scraping failed: ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const results = await response.json();
    console.log('[Apify] Cheerio scraping results count:', results?.length || 0);
    
    if (!Array.isArray(results)) {
      console.error('[Apify] Unexpected playwright response format:', results);
      throw new Error('Unexpected response format from scraping service');
    }

    if (results.length > 0) {
      console.log('[Apify] Sample Playwright result:', JSON.stringify(results[0], null, 2));
    }

    const MIN_REASONABLE_PRICE = 50;      // No lab equipment costs less than $50
    const MAX_REASONABLE_PRICE = 500000;  // No single lab equipment item costs more than $500k
    
    const listings: MarketplaceListing[] = results
      .filter((r: any) => {
        if (!r.price || r.price <= 0) return false;
        
        // Sanity check: filter out unreasonable prices (parsing errors)
        if (r.price < MIN_REASONABLE_PRICE || r.price > MAX_REASONABLE_PRICE) {
          console.log('[Apify] Filtered out unreasonable price:', r.price, 'from', r.url);
          return false;
        }
        
        return true;
      })
      .map((r: any) => {
        let condition = r.condition as 'new' | 'refurbished' | 'used';
        
        // Apply condition hint from search query if page detection defaulted to 'new'
        // This helps properly classify results from refurbished/used search queries
        // Use normalized URL for matching since Apify may return canonical URLs
        const normalizedResultUrl = normalizeUrl(r.url);
        console.log(`[Apify] Checking result: condition=${condition}, normalized=${normalizedResultUrl.substring(0, 60)}, hints=${conditionHintsByUrl.size}`);
        if (condition === 'new' && conditionHintsByUrl.has(normalizedResultUrl)) {
          const hint = conditionHintsByUrl.get(normalizedResultUrl);
          if (hint === 'refurbished' || hint === 'used') {
            console.log(`[Apify] Applying condition hint '${hint}' to ${r.url.substring(0, 60)}`);
            condition = hint as 'new' | 'refurbished' | 'used';
          }
        } else if (condition === 'new' && conditionHintsByUrl.size > 0) {
          console.log(`[Apify] No hint match for: ${normalizedResultUrl.substring(0, 60)}`);
        }
        
        return {
          url: r.url,
          title: r.title,
          price: r.price,
          condition,
          source: r.source
        };
      });

    console.log('[Apify] Valid Playwright price listings found:', listings.length);
    
    if (listings.length === 0 && results.length > 0) {
      console.log('[Apify] No valid prices extracted. Sample results:');
      results.slice(0, 3).forEach((r: any, i: number) => {
        console.log(`[Apify] Result ${i + 1}:`, {
          url: r.url,
          title: r.title?.substring(0, 60),
          price: r.price,
          condition: r.condition
        });
      });
    }
    
    return listings;
  } catch (error: any) {
    console.error('[Apify] Playwright scraping error:', error.message);
    throw new Error(`Playwright scraping failed: ${error.message}`);
  }
}
