import { searchMarketplaceListings, scrapePricesFromURLs } from './apify-service';

interface MarketplaceListing {
  url: string;
  title: string;
  price: number;
  condition: 'new' | 'refurbished' | 'used';
  source: string;
}

interface ConditionPricing {
  min: number;
  max: number;
  average: number;
  count: number;
  sources: Array<{ url: string; price: number; source: string }>;
}

interface MarketPriceResult {
  new: ConditionPricing | null;
  refurbished: ConditionPricing | null;
  used: ConditionPricing | null;
  totalListingsFound: number;
  source: string;
  breakdown: string;
}

function calculateConditionPricing(listings: MarketplaceListing[]): ConditionPricing | null {
  if (listings.length === 0) {
    return null;
  }

  const prices = listings.map(l => l.price).sort((a, b) => a - b);
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    average: Math.round(average),
    count: listings.length,
    sources: listings.map(l => ({
      url: l.url,
      price: l.price,
      source: l.source
    }))
  };
}

export async function calculateMarketPrice(brand: string, model: string): Promise<MarketPriceResult> {
  console.log('[PriceCalc] Starting market price calculation for', brand, model);
  
  const searchResults = await searchMarketplaceListings(brand, model);
  console.log('[PriceCalc] Found', searchResults.length, 'marketplace listings to scrape');
  
  if (searchResults.length === 0) {
    throw new Error('No marketplace listings found. Try checking eBay or LabX manually.');
  }

  const urls = searchResults.map(r => r.url).slice(0, 9);
  const scrapedListings = await scrapePricesFromURLs(urls);
  
  console.log('[PriceCalc] Scraped', scrapedListings.length, 'listings with valid prices');
  
  if (scrapedListings.length === 0) {
    throw new Error('Could not extract prices from marketplace listings. Please verify pricing manually.');
  }

  const newListings = scrapedListings.filter(l => l.condition === 'new');
  const refurbishedListings = scrapedListings.filter(l => l.condition === 'refurbished');
  const usedListings = scrapedListings.filter(l => l.condition === 'used');

  const newPricing = calculateConditionPricing(newListings.slice(0, 3));
  const refurbishedPricing = calculateConditionPricing(refurbishedListings.slice(0, 3));
  const usedPricing = calculateConditionPricing(usedListings.slice(0, 3));

  console.log('[PriceCalc] Price breakdown:', {
    new: newPricing?.count || 0,
    refurbished: refurbishedPricing?.count || 0,
    used: usedPricing?.count || 0
  });

  const sourceSummary = [
    newPricing && `${newPricing.count} new listing(s)`,
    refurbishedPricing && `${refurbishedPricing.count} refurbished listing(s)`,
    usedPricing && `${usedPricing.count} used listing(s)`
  ].filter(Boolean).join(', ');

  const breakdownText = [
    newPricing && `New: Average of ${newPricing.count} listings from ${newPricing.sources.map(s => s.source).join(', ')}`,
    refurbishedPricing && `Refurbished: Average of ${refurbishedPricing.count} listings from ${refurbishedPricing.sources.map(s => s.source).join(', ')}`,
    usedPricing && `Used: Average of ${usedPricing.count} listings from ${usedPricing.sources.map(s => s.source).join(', ')}`
  ].filter(Boolean).join('. ');

  return {
    new: newPricing,
    refurbished: refurbishedPricing,
    used: usedPricing,
    totalListingsFound: scrapedListings.length,
    source: `Market data from ${sourceSummary}`,
    breakdown: breakdownText
  };
}

export function formatPriceForAPI(result: MarketPriceResult) {
  return {
    new_min: result.new?.min ?? null,
    new_max: result.new?.max ?? null,
    refurbished_min: result.refurbished?.min ?? null,
    refurbished_max: result.refurbished?.max ?? null,
    used_min: result.used?.min ?? null,
    used_max: result.used?.max ?? null,
    source: result.source,
    breakdown: result.breakdown,
    totalListingsFound: result.totalListingsFound
  };
}
