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

  // Run parallel searches across ALL major global markets
  const globalQueries = [
    { query: `"${normalizedBrand}" "${normalizedModel}" buy price "for sale"`, lang: 'en', country: 'us', name: 'US' },
    { query: `"${normalizedBrand}" "${normalizedModel}" buy price shop`, lang: 'en', country: 'gb', name: 'UK' },
    { query: `"${normalizedBrand}" "${normalizedModel}" kaufen preis`, lang: 'de', country: 'de', name: 'DE' },
    { query: `"${normalizedBrand}" "${normalizedModel}" acheter prix`, lang: 'fr', country: 'fr', name: 'FR' },
    { query: `"${normalizedBrand}" "${normalizedModel}" buy price`, lang: 'en', country: 'au', name: 'AU' },
    { query: `"${normalizedBrand}" "${normalizedModel}" buy price`, lang: 'en', country: 'ca', name: 'CA' },
    { query: `"${normalizedBrand}" "${normalizedModel}" 購入 価格`, lang: 'ja', country: 'jp', name: 'JP' },
    { query: `"${normalizedBrand}" "${normalizedModel}" comprare prezzo`, lang: 'it', country: 'it', name: 'IT' },
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

    // Process ALL global results
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
            allOrganicResults.push(...organic);
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
    
    // Limit to 5 URLs to avoid Apify timeout
    const limited = deduped.slice(0, 5);
    if (deduped.length > 5) {
      console.log('[Apify] Limited to 5 URLs for price data (from', deduped.length, 'unique found)');
    }
    
    return limited;
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

  console.log('[Apify] Scraping prices from', urls.length, 'URLs using Playwright with residential proxies');
  
  try {
    // Timeout increased to 90s for 10 URLs
    const response = await fetch(`https://api.apify.com/v2/acts/apify~playwright-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=90`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: urls.map(url => ({ url })),
        maxRequestsPerCrawl: urls.length,
        maxConcurrency: 5, // Parallel scraping
        maxRequestRetries: 1, // Quick retries only
        navigationTimeoutSecs: 15, // Fast page load timeout
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
          apifyProxyCountry: 'US'
        },
        pageFunction: `
          async function pageFunction({ page, request }) {
            const url = request.url;
            const hostname = new URL(url).hostname;
            
            // Fast scraping - minimal wait time
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(500);
            
            let priceText = '';
            let title = '';
            
            try {
              if (hostname.includes('ebay.com')) {
                const priceSelectors = [
                  '[data-testid="x-price-primary"] .ux-textspans',
                  '.x-price-primary .ux-textspans',
                  '[itemprop="price"]',
                  '.notranslate.vi-VR-cvipPrice'
                ];
                for (const selector of priceSelectors) {
                  const element = await page.locator(selector).first();
                  if (await element.count() > 0) {
                    priceText = await element.textContent() || '';
                    if (priceText) break;
                  }
                }
                title = await page.locator('h1.x-item-title__mainTitle, h1[itemprop="name"]').first().textContent() || '';
              } else if (hostname.includes('labx.com')) {
                priceText = await page.locator('.price, [class*="price"]').first().textContent() || '';
                title = await page.locator('h1, .product-title').first().textContent() || '';
              } else {
                const priceSelectors = [
                  '[itemprop="price"]',
                  '.price', '.Price',
                  '[class*="price"]', '[class*="Price"]',
                  '[data-price]', '#price',
                  '.sale-price', '.current-price',
                  '.product-price', '.listing-price'
                ];
                
                for (const selector of priceSelectors) {
                  const element = await page.locator(selector).first();
                  if (await element.count() > 0) {
                    priceText = await element.textContent() || '';
                    if (priceText) break;
                  }
                }
                
                title = await page.locator('h1').first().textContent() || '';
              }
              
              if (!title) {
                title = await page.title();
              }
              
              // Approximate currency conversion rates (updated periodically)
              const CURRENCY_TO_USD = {
                'EUR': 1.08,  // Euro to USD
                'GBP': 1.26,  // British Pound to USD
                'CAD': 0.74,  // Canadian Dollar to USD
                'AUD': 0.65,  // Australian Dollar to USD
                'CHF': 1.12,  // Swiss Franc to USD
                'JPY': 0.0067, // Japanese Yen to USD
                'CNY': 0.14,  // Chinese Yuan to USD
              };
              
              function normalizePriceText(text) {
                if (!text) return null;
                
                const trimmed = text.trim();
                
                // Detect currency and get conversion rate
                let conversionRate = 1.0;
                let currency = 'USD';
                
                if (/€|EUR/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['EUR'];
                  currency = 'EUR';
                } else if (/£|GBP/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['GBP'];
                  currency = 'GBP';
                } else if (/CA\\$|C\\$|CAD/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['CAD'];
                  currency = 'CAD';
                } else if (/AU\\$|A\\$|AUD/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['AUD'];
                  currency = 'AUD';
                } else if (/CHF/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['CHF'];
                  currency = 'CHF';
                } else if (/¥|JPY|円/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['JPY'];
                  currency = 'JPY';
                } else if (/CNY|RMB|元/i.test(trimmed)) {
                  conversionRate = CURRENCY_TO_USD['CNY'];
                  currency = 'CNY';
                }
                
                // Remove currency symbols
                const cleanText = trimmed
                  .replace(/US\\s*\\$/gi, '')
                  .replace(/USD|EUR|GBP|CAD|AUD|CHF|JPY|CNY|RMB/gi, '')
                  .replace(/[€£$¥円元]/g, '')
                  .replace(/CA\\$|C\\$|AU\\$|A\\$/gi, '');
                
                const numericMatch = cleanText.match(/([0-9]+[0-9.,\\p{Zs}]*)/u);
                if (!numericMatch) return null;
                
                let numericPart = numericMatch[1].replace(/[\\p{Zs}]/gu, '');
                
                const lastCommaPos = numericPart.lastIndexOf(',');
                const lastPeriodPos = numericPart.lastIndexOf('.');
                const hasComma = lastCommaPos !== -1;
                const hasPeriod = lastPeriodPos !== -1;
                
                // Handle European number format (1.234,56) vs US format (1,234.56)
                if (hasComma && hasPeriod && lastCommaPos > lastPeriodPos) {
                  // European format: 1.234,56 -> 1234.56
                  numericPart = numericPart.replace(/\\./g, '').replace(',', '.');
                } else if (hasComma && hasPeriod) {
                  // US format: 1,234.56 -> 1234.56
                  numericPart = numericPart.replace(/,/g, '');
                } else if (hasComma && !hasPeriod) {
                  const parts = numericPart.split(',');
                  if (parts[1] && parts[1].length === 2) {
                    // European decimal: 1234,56 -> 1234.56
                    numericPart = numericPart.replace(',', '.');
                  } else {
                    // Thousands separator: 1,234 -> 1234
                    numericPart = numericPart.replace(/,/g, '');
                  }
                } else if (!hasComma && hasPeriod) {
                  const periodCount = (numericPart.match(/\\./g) || []).length;
                  if (periodCount > 1) {
                    // European thousands: 1.234.567 -> 1234567
                    numericPart = numericPart.replace(/\\./g, '');
                  } else if (periodCount === 1) {
                    const parts = numericPart.split('.');
                    if (parts[1] && parts[1].length === 3) {
                      // European thousands: 1.234 -> 1234
                      numericPart = numericPart.replace(/\\./, '');
                    }
                  }
                }
                
                const parsed = parseFloat(numericPart);
                if (isNaN(parsed)) return null;
                
                // Convert to USD
                const usdPrice = parsed * conversionRate;
                if (currency !== 'USD') {
                  console.log('Currency conversion:', parsed, currency, '->', usdPrice.toFixed(2), 'USD');
                }
                
                return usdPrice;
              }
              
              const price = normalizePriceText(priceText);
              
              const finalUrl = page.url();
              const finalHostname = new URL(finalUrl).hostname;
              
              const bodyText = await page.locator('body').textContent() || '';
              const pageTitle = await page.title();
              const combinedText = (pageTitle + ' ' + bodyText).toLowerCase();
              
              let condition = 'used';
              
              if (/\\b(refurbished|refurb|certified\\s+refurbished|factory\\s+refurbished)\\b/i.test(combinedText)) {
                condition = 'refurbished';
              } else if (/\\b(brand\\s+new|new\\s+in\\s+box|factory\\s+new|unused|nib)\\b/i.test(combinedText)) {
                condition = 'new';
              } else if (/\\b(used|pre-owned|preowned|second\\s+hand|as-is)\\b/i.test(combinedText)) {
                condition = 'used';
              }
              
              return {
                url: finalUrl,
                title: title.trim(),
                price: price,
                condition: condition,
                source: finalHostname
              };
            } catch (err) {
              console.error('Page function error:', err);
              return {
                url: request.url,
                title: '',
                price: null,
                condition: 'used',
                source: hostname
              };
            }
          }
        `
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Apify] Playwright scraping API Error:', response.status, errorText);
      throw new Error(`Apify API returned ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const results = await response.json();
    console.log('[Apify] Playwright scraping results count:', results?.length || 0);
    
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
      .map((r: any) => ({
        url: r.url,
        title: r.title,
        price: r.price,
        condition: r.condition as 'new' | 'refurbished' | 'used',
        source: r.source
      }));

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
