import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";
import type { PriceEstimate } from "@/hooks/use-ai-analysis";

interface ExtendedPriceEstimate extends PriceEstimate {
  totalListingsFound?: number;
}

interface PriceContextDisplayProps {
  priceData: ExtendedPriceEstimate;
  isPollingScrape?: boolean;
  testIdPrefix?: string;
}

interface ConditionData {
  key: 'new' | 'refurbished' | 'used';
  label: string;
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export function PriceContextDisplay({ priceData, isPollingScrape = false, testIdPrefix = '' }: PriceContextDisplayProps) {
  // Round to whole euros for cleaner display
  const formatEuro = (value: number) => `€${Math.round(value).toLocaleString('de-DE')}`;

  // Build condition data array
  const conditions: ConditionData[] = [
    {
      key: 'new',
      label: 'New',
      min: priceData.new_min,
      max: priceData.new_max,
      avg: priceData.new_avg ?? null,
      count: priceData.new_count ?? 0,
      color: '#22c55e',
      bgClass: 'bg-emerald-500',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      borderClass: 'border-emerald-300 dark:border-emerald-700',
    },
    {
      key: 'refurbished',
      label: 'Refurbished',
      min: priceData.refurbished_min,
      max: priceData.refurbished_max,
      avg: priceData.refurbished_avg ?? null,
      count: priceData.refurbished_count ?? 0,
      color: '#f59e0b',
      bgClass: 'bg-amber-500',
      textClass: 'text-amber-700 dark:text-amber-400',
      borderClass: 'border-amber-300 dark:border-amber-700',
    },
    {
      key: 'used',
      label: 'Used',
      min: priceData.used_min,
      max: priceData.used_max,
      avg: priceData.used_avg ?? null,
      count: priceData.used_count ?? 0,
      color: '#64748b',
      bgClass: 'bg-slate-500',
      textClass: 'text-slate-700 dark:text-slate-400',
      borderClass: 'border-slate-300 dark:border-slate-700',
    },
  ];

  // Filter to only conditions with data
  const activeConditions = conditions.filter(c => c.min !== null && c.max !== null);

  // Calculate global min/max across all conditions
  const allPrices = activeConditions.flatMap(c => [c.min, c.max]).filter((p): p is number => p !== null);
  const globalMin = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const globalMax = allPrices.length > 0 ? Math.max(...allPrices) : 1;
  const priceRange = globalMax - globalMin;

  // Helper to calculate percentage position
  const getPercent = (value: number) => {
    if (priceRange === 0) return 50;
    return ((value - globalMin) / priceRange) * 100;
  };

  const getListingsForCondition = (condition: string) => {
    return priceData.marketplace_listings?.filter(l => l.condition === condition) || [];
  };

  // Get all listings sorted by price
  const allListings = priceData.marketplace_listings?.slice().sort((a, b) => {
    const priceA = a.price ?? 0;
    const priceB = b.price ?? 0;
    return priceA - priceB;
  }) || [];

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/30" data-testid={`${testIdPrefix}price-context`}>
      {/* Data Source Badge and Info */}
      <div className="flex flex-wrap items-center gap-2">
        {priceData.has_marketplace_data ? (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">Real Marketplace Data</Badge>
        ) : (
          <Badge variant="secondary">AI Estimate</Badge>
        )}
        {priceData.totalListingsFound && priceData.totalListingsFound > 0 && (
          <span className="text-xs text-muted-foreground">
            {priceData.totalListingsFound} listings found
          </span>
        )}
      </div>
      
      {/* Live Scraping Progress Indicator */}
      {(priceData.scraping_in_background || isPollingScrape) && !priceData.has_marketplace_data && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2" data-testid={`${testIdPrefix}scraping-progress`}>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Searching Global Marketplaces...
            </span>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <p>Scanning eBay, LabX, Fisher Scientific, BioSurplus and more</p>
            <p className="opacity-75">This may take up to 3 minutes for comprehensive results</p>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}

      {activeConditions.length > 0 && (
        <div className="space-y-3">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {activeConditions.map(condition => (
              <div key={condition.key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${condition.bgClass}`} />
                <span className={condition.textClass}>
                  {condition.label} ({condition.count})
                </span>
              </div>
            ))}
          </div>

          {/* Unified Price Bar */}
          <div className="relative" data-testid={`${testIdPrefix}unified-price-bar`}>
            {/* Min/Max labels above bar */}
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{formatEuro(globalMin)}</span>
              <span>{formatEuro(globalMax)}</span>
            </div>

            {/* Bar container */}
            <div className="relative h-8 bg-muted rounded-md overflow-visible">
              {/* Render condition segments */}
              {activeConditions.map(condition => {
                if (condition.min === null || condition.max === null) return null;
                const leftPct = getPercent(condition.min);
                const rightPct = getPercent(condition.max);
                const widthPct = Math.max(rightPct - leftPct, 2); // Minimum 2% width for visibility

                return (
                  <div
                    key={condition.key}
                    className={`absolute h-full ${condition.bgClass} opacity-50 rounded-sm`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                    title={`${condition.label}: ${formatEuro(condition.min)} - ${formatEuro(condition.max)}`}
                  />
                );
              })}

              {/* Average markers */}
              {activeConditions.map(condition => {
                if (condition.avg === null) return null;
                const avgPct = getPercent(condition.avg);
                
                return (
                  <div
                    key={`avg-${condition.key}`}
                    className="absolute top-0 h-full flex flex-col items-center"
                    style={{ left: `${avgPct}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* Marker line */}
                    <div 
                      className={`w-0.5 h-full ${condition.bgClass}`}
                      style={{ opacity: 0.9 }}
                    />
                    {/* Label above */}
                    <div 
                      className={`absolute -top-5 text-[9px] font-medium whitespace-nowrap ${condition.textClass}`}
                    >
                      {formatEuro(condition.avg)}
                    </div>
                    {/* Dot marker */}
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${condition.bgClass}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Condition range labels below bar */}
            <div className="flex flex-wrap justify-between gap-2 mt-2 text-[10px]">
              {activeConditions.map(condition => (
                <div key={`range-${condition.key}`} className={`flex items-center gap-1 ${condition.textClass}`}>
                  <span className="font-medium">{condition.label}:</span>
                  <span>
                    {condition.min !== null && condition.max !== null 
                      ? `${formatEuro(condition.min)} - ${formatEuro(condition.max)}`
                      : 'N/A'
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Listings Grid */}
          {allListings.length > 0 && (
            <div className="space-y-3 pt-2 border-t" data-testid={`${testIdPrefix}listings-section`}>
              <p className="text-xs font-medium text-muted-foreground">
                Marketplace Listings ({allListings.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {allListings.map((listing, idx) => {
                  const condition = conditions.find(c => c.key === listing.condition);
                  return (
                    <a
                      key={idx}
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start justify-between gap-2 p-2 rounded-md border bg-background hover-elevate text-xs"
                      data-testid={`${testIdPrefix}listing-${idx}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div 
                            className={`w-2 h-2 rounded-full shrink-0 ${condition?.bgClass || 'bg-gray-400'}`}
                          />
                          <span className="truncate text-foreground">
                            {listing.title || listing.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{listing.source}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-semibold ${condition?.textClass || 'text-foreground'}`}>
                          {listing.price ? formatEuro(listing.price) : 'N/A'}
                        </div>
                        <div className="text-[9px] text-muted-foreground capitalize">
                          {listing.condition}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {priceData.breakdown && (
        <p className="text-xs text-muted-foreground pt-2 border-t" data-testid={`${testIdPrefix}price-breakdown`}>
          {priceData.breakdown}
        </p>
      )}
    </div>
  );
}
