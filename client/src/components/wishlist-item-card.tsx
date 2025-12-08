import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Edit, Trash2, DollarSign, Building2, Globe, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import type { WishlistItem } from "@shared/schema";

interface WishlistItemCardProps {
  item: WishlistItem;
  onFindMatches?: (itemId: number) => void;
  onEdit?: (itemId: number) => void;
  onDelete?: (itemId: number) => void;
}

interface InternalMatch {
  id: number;
  brand: string;
  model: string;
  condition: string;
  askingPrice: string;
  location: string;
  savedAt?: string;
}

interface MarketplaceListing {
  url: string;
  title: string;
  price?: string;
  condition?: string;
  source?: string;
  savedAt?: string;
}

export function WishlistItemCard({ item, onFindMatches, onEdit, onDelete }: WishlistItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const parseMarketPrices = () => {
    if (!item.marketPriceRange) return null;
    try {
      let priceData: any;
      if (typeof item.marketPriceRange === 'string') {
        priceData = JSON.parse(item.marketPriceRange);
      } else if (typeof item.marketPriceRange === 'object') {
        priceData = item.marketPriceRange;
      } else {
        return null;
      }
      return {
        used_min: priceData.used_min ?? null,
        used_max: priceData.used_max ?? null,
        refurbished_min: priceData.refurbished_min ?? null,
        refurbished_max: priceData.refurbished_max ?? null,
        new_min: priceData.new_min ?? null,
        new_max: priceData.new_max ?? null,
      };
    } catch {
      return null;
    }
  };

  const parseSavedInternalMatches = (): InternalMatch[] => {
    if (!item.savedInternalMatches) return [];
    try {
      if (typeof item.savedInternalMatches === 'string') {
        return JSON.parse(item.savedInternalMatches);
      }
      return Array.isArray(item.savedInternalMatches) ? item.savedInternalMatches : [];
    } catch {
      return [];
    }
  };

  const parseSavedMarketplaceListings = (): MarketplaceListing[] => {
    if (!item.savedMarketplaceListings) return [];
    try {
      if (typeof item.savedMarketplaceListings === 'string') {
        return JSON.parse(item.savedMarketplaceListings);
      }
      return Array.isArray(item.savedMarketplaceListings) ? item.savedMarketplaceListings : [];
    } catch {
      return [];
    }
  };

  const prices = parseMarketPrices();
  const internalMatches = parseSavedInternalMatches();
  const marketplaceListings = parseSavedMarketplaceListings();

  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return null;
    return `€${value.toLocaleString()}`;
  };

  const formatPriceRange = (min: number | null, max: number | null) => {
    const minStr = formatPrice(min);
    const maxStr = formatPrice(max);
    if (minStr && maxStr && minStr !== maxStr) {
      return `${minStr} - ${maxStr}`;
    }
    return minStr || maxStr || null;
  };

  const formatMatchPrice = (price: string | number | null | undefined): string => {
    if (price === null || price === undefined) return 'N/A';
    if (typeof price === 'string') {
      if (price.startsWith('€') || price.startsWith('$')) return price.replace('$', '€');
      const numericValue = parseFloat(price.replace(/[^0-9.-]/g, ''));
      if (!isNaN(numericValue)) {
        return `€${numericValue.toLocaleString()}`;
      }
      return price;
    }
    if (typeof price === 'number' && !isNaN(price)) {
      return `€${price.toLocaleString()}`;
    }
    return 'N/A';
  };

  const hasImage = item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0;
  const hasEnrichedData = prices || internalMatches.length > 0 || marketplaceListings.length > 0;

  return (
    <Card className="hover-elevate flex flex-col h-full" data-testid={`card-wishlist-${item.id}`}>
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate" title={`${item.brand} ${item.model}`}>
              {item.brand} {item.model}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
          </div>
          {item.priority && (
            <Badge className={`${getPriorityColor(item.priority)} text-xs shrink-0`} variant="outline">
              {item.priority}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Budget:</span>
          <span className="font-semibold">{formatMatchPrice(item.maxBudget)}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 pt-0">
        {hasImage && (
          <div className="relative">
            <img 
              src={item.imageUrls![currentImageIndex]} 
              alt={`${item.brand} ${item.model}`}
              className="w-full h-32 object-cover rounded-md border"
            />
            {item.imageUrls!.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev - 1 + item.imageUrls!.length) % item.imageUrls!.length);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev + 1) % item.imageUrls!.length);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Badge variant="secondary" className="absolute bottom-1 right-1 text-xs">
                  {currentImageIndex + 1}/{item.imageUrls!.length}
                </Badge>
              </>
            )}
          </div>
        )}

        {item.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
        )}

        {/* Compact summary chips */}
        <div className="flex flex-wrap gap-1.5">
          {prices && (
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
              <DollarSign className="w-3 h-3 mr-1" />
              {formatPriceRange(prices.used_min, prices.used_max) || 'Prices'}
            </Badge>
          )}
          {internalMatches.length > 0 && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
              <Building2 className="w-3 h-3 mr-1" />
              {internalMatches.length} match{internalMatches.length !== 1 ? 'es' : ''}
            </Badge>
          )}
          {marketplaceListings.length > 0 && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
              <Globe className="w-3 h-3 mr-1" />
              {marketplaceListings.length} source{marketplaceListings.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Expandable details */}
        {hasEnrichedData && (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-7 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              {expanded ? 'Hide details' : 'View details'}
            </Button>

            {expanded && (
              <div className="space-y-2 pt-1">
                {/* Price breakdown */}
                {prices && (
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded text-xs">
                    <div className="flex items-center gap-1 mb-1.5">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">Market Prices</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(prices.used_min !== null || prices.used_max !== null) && (
                        <div>
                          <span className="text-muted-foreground">Used: </span>
                          <span className="font-medium">{formatPriceRange(prices.used_min, prices.used_max)}</span>
                        </div>
                      )}
                      {(prices.refurbished_min !== null || prices.refurbished_max !== null) && (
                        <div>
                          <span className="text-muted-foreground">Refurb: </span>
                          <span className="font-medium">{formatPriceRange(prices.refurbished_min, prices.refurbished_max)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Internal matches */}
                {internalMatches.length > 0 && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded text-xs">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Building2 className="w-3 h-3 text-blue-600" />
                      <span className="font-medium text-blue-700 dark:text-blue-400">Internal Matches</span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {internalMatches.slice(0, 3).map((match, idx) => (
                        <div key={idx} className="flex items-center justify-between py-0.5">
                          <span className="truncate">{match.brand} {match.model}</span>
                          <span className="font-medium text-blue-600 shrink-0 ml-2">{formatMatchPrice(match.askingPrice)}</span>
                        </div>
                      ))}
                      {internalMatches.length > 3 && (
                        <p className="text-muted-foreground">+{internalMatches.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* External sources */}
                {marketplaceListings.length > 0 && (
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded text-xs">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Globe className="w-3 h-3 text-purple-600" />
                      <span className="font-medium text-purple-700 dark:text-purple-400">External Sources</span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {marketplaceListings.slice(0, 3).map((listing, idx) => (
                        <a 
                          key={idx}
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 py-0.5 hover:text-purple-600"
                        >
                          <span className="truncate flex-1">{listing.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                      {marketplaceListings.length > 3 && (
                        <p className="text-muted-foreground">+{marketplaceListings.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      <CardFooter className="pt-2 border-t gap-1">
        {onFindMatches && (
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90"
            onClick={() => onFindMatches(item.id)}
            data-testid={`button-find-matches-${item.id}`}
          >
            <Search className="w-3 h-3 mr-1" />
            Find Matches
          </Button>
        )}
        {onEdit && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onEdit(item.id)}
            data-testid={`button-edit-${item.id}`}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onDelete(item.id)}
            data-testid={`button-delete-${item.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
