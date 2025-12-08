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

interface ConditionBarProps {
  label: string;
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
  color: 'green' | 'amber' | 'gray';
  listings?: Array<{ url: string; title?: string; source?: string; price?: number }>;
  testIdPrefix?: string;
  globalMin: number;
  globalMax: number;
}

function ConditionBar({ 
  label, 
  min, 
  max, 
  avg, 
  count, 
  color, 
  listings,
  testIdPrefix = '',
  globalMin,
  globalMax 
}: ConditionBarProps) {
  if (min === null || max === null) return null;

  const colorClasses = {
    green: {
      bg: 'bg-green-500/30 dark:bg-green-500/20',
      fill: 'bg-green-500',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-300 dark:border-green-700',
    },
    amber: {
      bg: 'bg-amber-500/30 dark:bg-amber-500/20',
      fill: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-300 dark:border-amber-700',
    },
    gray: {
      bg: 'bg-gray-500/30 dark:bg-gray-500/20',
      fill: 'bg-gray-500',
      text: 'text-gray-700 dark:text-gray-400',
      border: 'border-gray-300 dark:border-gray-700',
    },
  };

  const colors = colorClasses[color];
  const range = globalMax - globalMin;
  
  // Calculate bar position and width as percentage of global range
  const leftPercent = range > 0 ? ((min - globalMin) / range) * 100 : 0;
  const widthPercent = range > 0 ? ((max - min) / range) * 100 : 100;
  const avgPercent = avg && range > 0 ? ((avg - globalMin) / range) * 100 : null;

  const formatEuro = (value: number) => `€${value.toLocaleString('de-DE')}`;

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}price-${label.toLowerCase()}`}>
      <div className="flex justify-between text-sm">
        <span className={`font-medium ${colors.text}`}>
          {label} {count > 0 ? `(${count} listings)` : '(AI Estimate)'}
        </span>
        <span className="font-medium">
          {formatEuro(min)} - {formatEuro(max)}
        </span>
      </div>
      
      {/* Visual price bar */}
      <div className="relative h-6 bg-muted rounded-md overflow-hidden">
        {/* Range bar */}
        <div 
          className={`absolute h-full ${colors.fill} opacity-40 rounded-md`}
          style={{ 
            left: `${Math.max(0, leftPercent)}%`, 
            width: `${Math.max(5, widthPercent)}%` 
          }}
        />
        {/* Filled bar for min to avg */}
        {avg && (
          <div 
            className={`absolute h-full ${colors.fill} opacity-70 rounded-l-md`}
            style={{ 
              left: `${Math.max(0, leftPercent)}%`, 
              width: `${Math.max(2, ((avg - min) / range) * 100)}%` 
            }}
          />
        )}
        {/* Average marker */}
        {avgPercent !== null && avg !== null && (
          <div 
            className={`absolute top-0 bottom-0 w-0.5 ${colors.fill}`}
            style={{ left: `${avgPercent}%` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap">
              Avg: {formatEuro(avg)}
            </div>
          </div>
        )}
        {/* Min/Max labels */}
        <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-medium">
          <span className={`${colors.text}`}>{formatEuro(min)}</span>
          <span className={`${colors.text}`}>{formatEuro(max)}</span>
        </div>
      </div>

      {/* Listings */}
      {listings && listings.length > 0 && (
        <div className={`pl-3 border-l-2 ${colors.border} space-y-1`}>
          {listings.map((listing, idx) => (
            <a
              key={idx}
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs hover:underline text-blue-600 dark:text-blue-400"
              data-testid={`${testIdPrefix}link-${label.toLowerCase()}-listing-${idx}`}
            >
              <span className="truncate flex-1 mr-2 flex items-center gap-1">
                <ExternalLink className="w-3 h-3 shrink-0" />
                {listing.title || listing.source}
              </span>
              <span className="font-medium shrink-0">
                {listing.price ? formatEuro(listing.price) : 'N/A'}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function PriceContextDisplay({ priceData, isPollingScrape = false, testIdPrefix = '' }: PriceContextDisplayProps) {
  // Calculate global min/max for consistent bar scaling
  const allPrices = [
    priceData.new_min,
    priceData.new_max,
    priceData.refurbished_min,
    priceData.refurbished_max,
    priceData.used_min,
    priceData.used_max,
  ].filter((p): p is number => p !== null && p !== undefined);

  const globalMin = Math.min(...allPrices, 0);
  const globalMax = Math.max(...allPrices, 1);

  const getListingsForCondition = (condition: string) => {
    return priceData.marketplace_listings?.filter(l => l.condition === condition) || [];
  };

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

      {/* Visual Price Range Overview */}
      <div className="space-y-4">
        {/* New Condition */}
        <ConditionBar
          label="New"
          min={priceData.new_min}
          max={priceData.new_max}
          avg={priceData.new_avg ?? null}
          count={priceData.new_count ?? 0}
          color="green"
          listings={getListingsForCondition('new')}
          testIdPrefix={testIdPrefix}
          globalMin={globalMin}
          globalMax={globalMax}
        />

        {/* Refurbished Condition */}
        <ConditionBar
          label="Refurbished"
          min={priceData.refurbished_min}
          max={priceData.refurbished_max}
          avg={priceData.refurbished_avg ?? null}
          count={priceData.refurbished_count ?? 0}
          color="amber"
          listings={getListingsForCondition('refurbished')}
          testIdPrefix={testIdPrefix}
          globalMin={globalMin}
          globalMax={globalMax}
        />

        {/* Used Condition */}
        <ConditionBar
          label="Used"
          min={priceData.used_min}
          max={priceData.used_max}
          avg={priceData.used_avg ?? null}
          count={priceData.used_count ?? 0}
          color="gray"
          listings={getListingsForCondition('used')}
          testIdPrefix={testIdPrefix}
          globalMin={globalMin}
          globalMax={globalMax}
        />
      </div>
      
      {priceData.breakdown && (
        <p className="text-xs text-muted-foreground pt-2 border-t" data-testid={`${testIdPrefix}price-breakdown`}>
          {priceData.breakdown}
        </p>
      )}
    </div>
  );
}
