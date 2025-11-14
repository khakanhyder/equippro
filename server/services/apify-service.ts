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
    
    const limited = filtered.slice(0, 8);
    if (filtered.length > 8) {
      console.log('[Apify] Limited to 8 URLs for residential proxy budget (from', filtered.length, 'found)');
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
    const response = await fetch(`https://api.apify.com/v2/acts/apify~playwright-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=300`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: urls.map(url => ({ url })),
        maxRequestsPerCrawl: urls.length,
        maxConcurrency: 3,
        maxRequestRetries: 2,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
          apifyProxyCountry: 'US'
        },
        pageFunction: `
          async function pageFunction({ page, request }) {
            const url = request.url;
            const hostname = new URL(url).hostname;
            
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(2000);
            
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
              
              function normalizePriceText(text) {
                if (!text) return null;
                
                const trimmed = text.trim();
                
                const foreignCurrency = /\\b(CAD|EUR|GBP|AUD|JPY|CNY|NZD|MXN)\\b|CA\\$|C\\$|AU\\$|A\\$|NZ\\$|MX\\$|£|€|¥/i;
                if (foreignCurrency.test(trimmed)) {
                  console.warn('Non-USD currency detected, skipping:', text.substring(0, 50));
                  return null;
                }
                
                const cleanText = trimmed
                  .replace(/US\\s*\\$/gi, '$')
                  .replace(/USD/gi, '$')
                  .replace(/\\$/g, '');
                
                const numericMatch = cleanText.match(/([0-9]+[0-9.,\\p{Zs}]*)/u);
                if (!numericMatch) return null;
                
                let numericPart = numericMatch[1].replace(/[\\p{Zs}]/gu, '');
                
                const lastCommaPos = numericPart.lastIndexOf(',');
                const lastPeriodPos = numericPart.lastIndexOf('.');
                const hasComma = lastCommaPos !== -1;
                const hasPeriod = lastPeriodPos !== -1;
                
                if (hasComma && hasPeriod && lastCommaPos > lastPeriodPos) {
                  numericPart = numericPart.replace(/\\./g, '').replace(',', '.');
                } else if (hasComma && hasPeriod) {
                  numericPart = numericPart.replace(/,/g, '');
                } else if (hasComma && !hasPeriod) {
                  const parts = numericPart.split(',');
                  if (parts[1] && parts[1].length === 2) {
                    numericPart = numericPart.replace(',', '.');
                  } else {
                    numericPart = numericPart.replace(/,/g, '');
                  }
                } else if (!hasComma && hasPeriod) {
                  const periodCount = (numericPart.match(/\\./g) || []).length;
                  if (periodCount > 1) {
                    numericPart = numericPart.replace(/\\./g, '');
                  } else if (periodCount === 1) {
                    const parts = numericPart.split('.');
                    if (parts[1] && parts[1].length === 3) {
                      numericPart = numericPart.replace(/\\./, '');
                    }
                  }
                }
                
                const parsed = parseFloat(numericPart);
                return isNaN(parsed) ? null : parsed;
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

    const listings: MarketplaceListing[] = results
      .filter((r: any) => r.price && r.price > 0)
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
