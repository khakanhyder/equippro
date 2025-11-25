import { searchMarketplaceListings, scrapePricesFromURLs } from './apify-service';
import { estimatePrice } from './ai-service';

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
  sources: Array<{ url: string; price: number; source: string; title?: string }>;
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
      source: l.source,
      title: l.title
    }))
  };
}

async function useAIFallback(brand: string, model: string, category?: string): Promise<MarketPriceResult> {
  console.log('[PriceCalc] Using AI estimation for', brand, model, category || 'Unknown category');
  
  if (!category) {
    console.warn('[PriceCalc] No category provided for AI estimation - results may be less accurate');
  }
  
  const aiEstimate = await estimatePrice(brand, model, category || 'Industrial Equipment', 'used');
  
  return {
    new: (aiEstimate.new_min && aiEstimate.new_max) ? {
      min: aiEstimate.new_min,
      max: aiEstimate.new_max,
      average: Math.round((aiEstimate.new_min + aiEstimate.new_max) / 2),
      count: 0,
      sources: []
    } : null,
    refurbished: (aiEstimate.refurbished_min && aiEstimate.refurbished_max) ? {
      min: aiEstimate.refurbished_min,
      max: aiEstimate.refurbished_max,
      average: Math.round((aiEstimate.refurbished_min + aiEstimate.refurbished_max) / 2),
      count: 0,
      sources: []
    } : null,
    used: (aiEstimate.used_min && aiEstimate.used_max) ? {
      min: aiEstimate.used_min,
      max: aiEstimate.used_max,
      average: Math.round((aiEstimate.used_min + aiEstimate.used_max) / 2),
      count: 0,
      sources: []
    } : null,
    totalListingsFound: 0,
    source: aiEstimate.source || 'AI-estimated market prices (no marketplace data available)',
    breakdown: aiEstimate.breakdown || 'Estimated based on AI analysis of similar equipment'
  };
}

export async function calculateMarketPrice(brand: string, model: string, category?: string): Promise<MarketPriceResult> {
  console.log('[PriceCalc] Starting market price calculation for', brand, model);
  
  try {
    const searchResults = await searchMarketplaceListings(brand, model);
    console.log('[PriceCalc] Found', searchResults.length, 'marketplace listings to scrape');
    
    if (searchResults.length === 0) {
      console.log('[PriceCalc] No marketplace listings found, using AI estimation as fallback');
      return await useAIFallback(brand, model, category);
    }

    const urls = searchResults.map(r => r.url);
    const scrapedListings = await scrapePricesFromURLs(urls);
    
    console.log('[PriceCalc] Scraped', scrapedListings.length, 'listings with valid prices');
    
    // Filter out listings that don't actually match the product
    const normalizedBrand = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
    const modelNumber = model.replace(/[^0-9]/g, '');
    
    const validatedListings = scrapedListings.filter(listing => {
      if (!listing.title || listing.title.length < 5) return false;
      
      const normalizedTitle = listing.title.toLowerCase();
      
      // Must contain brand name
      const hasBrand = normalizedTitle.includes(normalizedBrand);
      
      // Must contain model number (extracted digits like "5810")
      const hasModel = modelNumber.length >= 3 && normalizedTitle.includes(modelNumber.substring(0, 4));
      
      if (!hasBrand && !hasModel) {
        console.log('[PriceCalc] Filtered out wrong product:', listing.title.substring(0, 50));
        return false;
      }
      
      return true;
    });
    
    console.log('[PriceCalc] Validated listings:', validatedListings.length, 'of', scrapedListings.length);
    
    if (validatedListings.length === 0) {
      console.log('[PriceCalc] No valid matched listings, using AI estimation as fallback');
      return await useAIFallback(brand, model, category);
    }

    const newListings = validatedListings.filter(l => l.condition === 'new');
    const refurbishedListings = validatedListings.filter(l => l.condition === 'refurbished');
    const usedListings = validatedListings.filter(l => l.condition === 'used');

    const newPricing = calculateConditionPricing(newListings);
    const refurbishedPricing = calculateConditionPricing(refurbishedListings);
    const usedPricing = calculateConditionPricing(usedListings);

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
      totalListingsFound: validatedListings.length,
      source: `Market data from ${sourceSummary}`,
      breakdown: breakdownText
    };
  } catch (error: any) {
    console.error('[PriceCalc] Marketplace price calculation failed:', error.message);
    console.log('[PriceCalc] Falling back to AI estimation');
    return await useAIFallback(brand, model, category);
  }
}

export function formatPriceForAPI(result: MarketPriceResult) {
  const marketplaceListings: Array<{ url: string; price: number; source: string; condition: string; title?: string }> = [];
  
  if (result.new) {
    result.new.sources.forEach(s => marketplaceListings.push({ ...s, condition: 'new' }));
  }
  if (result.refurbished) {
    result.refurbished.sources.forEach(s => marketplaceListings.push({ ...s, condition: 'refurbished' }));
  }
  if (result.used) {
    result.used.sources.forEach(s => marketplaceListings.push({ ...s, condition: 'used' }));
  }
  
  return {
    new_min: result.new?.min ?? null,
    new_max: result.new?.max ?? null,
    new_avg: result.new?.average ?? null,
    new_count: result.new?.count ?? 0,
    refurbished_min: result.refurbished?.min ?? null,
    refurbished_max: result.refurbished?.max ?? null,
    refurbished_avg: result.refurbished?.average ?? null,
    refurbished_count: result.refurbished?.count ?? 0,
    used_min: result.used?.min ?? null,
    used_max: result.used?.max ?? null,
    used_avg: result.used?.average ?? null,
    used_count: result.used?.count ?? 0,
    source: result.source,
    breakdown: result.breakdown,
    totalListingsFound: result.totalListingsFound,
    marketplace_listings: marketplaceListings
  };
}
