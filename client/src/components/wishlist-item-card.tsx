import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Search, ExternalLink, Edit, Trash2, DollarSign, Building2, Globe, FileText } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
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
  const [showDetails, setShowDetails] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const parseMarketPrices = () => {
    if (!item.marketPriceRange) {
      return null;
    }

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
  
  const hasEnrichedData = prices || internalMatches.length > 0 || marketplaceListings.length > 0 || 
    (item.requiredSpecs && typeof item.requiredSpecs === 'object' && item.requiredSpecs !== null);

  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return null;
    return `$${value.toLocaleString()}`;
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
    
    // If already formatted with $ symbol, return as-is
    if (typeof price === 'string') {
      if (price.startsWith('$')) return price;
      // Try to parse as number
      const numericValue = parseFloat(price.replace(/[^0-9.-]/g, ''));
      if (!isNaN(numericValue)) {
        return `$${numericValue.toLocaleString()}`;
      }
      return price;
    }
    
    // If number, format it
    if (typeof price === 'number' && !isNaN(price)) {
      return `$${price.toLocaleString()}`;
    }
    
    return 'N/A';
  };

  return (
    <Card className="hover-elevate" data-testid={`card-wishlist-${item.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-lg">
                {item.brand} {item.model}
              </h3>
              {item.priority && (
                <Badge className={getPriorityColor(item.priority)} variant="outline">
                  {item.priority} priority
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{item.category}</p>
          </div>
          
          <div className="text-right">
            <p className="text-2xl font-bold">{formatMatchPrice(item.maxBudget)}</p>
            <p className="text-xs text-muted-foreground mt-1">Max Budget</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0 && (
          <div>
            {item.imageUrls.length === 1 ? (
              <img 
                src={item.imageUrls[0]} 
                alt={`${item.brand} ${item.model}`}
                className="w-full h-48 object-cover rounded-lg border"
              />
            ) : (
              <Carousel className="w-full">
                <CarouselContent>
                  {item.imageUrls.map((imageUrl, idx) => (
                    <CarouselItem key={idx}>
                      <img 
                        src={imageUrl} 
                        alt={`${item.brand} ${item.model} - Image ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            )}
          </div>
        )}

        {item.notes && (
          <div>
            <p className="text-sm text-muted-foreground">{item.notes}</p>
          </div>
        )}

        {/* Always-visible Price Summary */}
        {prices && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Market Price Range</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {(prices.used_min !== null || prices.used_max !== null) && (
                <div className="p-2 bg-background rounded border">
                  <p className="text-xs text-muted-foreground mb-1">Used</p>
                  <p className="text-sm font-semibold">{formatPriceRange(prices.used_min, prices.used_max)}</p>
                </div>
              )}
              {(prices.refurbished_min !== null || prices.refurbished_max !== null) && (
                <div className="p-2 bg-background rounded border">
                  <p className="text-xs text-muted-foreground mb-1">Refurbished</p>
                  <p className="text-sm font-semibold">{formatPriceRange(prices.refurbished_min, prices.refurbished_max)}</p>
                </div>
              )}
              {(prices.new_min !== null || prices.new_max !== null) && (
                <div className="p-2 bg-background rounded border">
                  <p className="text-xs text-muted-foreground mb-1">New</p>
                  <p className="text-sm font-semibold">{formatPriceRange(prices.new_min, prices.new_max)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Always-visible Internal Matches */}
        {internalMatches.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {internalMatches.length} Internal Match{internalMatches.length !== 1 ? 'es' : ''} Saved
              </span>
            </div>
            <div className="space-y-2">
              {internalMatches.slice(0, 3).map((match, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                  <div>
                    <span className="font-medium">{match.brand} {match.model}</span>
                    <span className="text-muted-foreground ml-2">· {match.condition}</span>
                  </div>
                  <Badge variant="outline" className="text-blue-600">
                    {formatMatchPrice(match.askingPrice)}
                  </Badge>
                </div>
              ))}
              {internalMatches.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{internalMatches.length - 3} more matches
                </p>
              )}
            </div>
          </div>
        )}

        {/* Always-visible External Sources */}
        {marketplaceListings.length > 0 && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                {marketplaceListings.length} External Source{marketplaceListings.length !== 1 ? 's' : ''} Saved
              </span>
            </div>
            <div className="space-y-2">
              {marketplaceListings.slice(0, 3).map((listing, idx) => (
                <a 
                  key={idx} 
                  href={listing.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-background rounded border text-sm hover-elevate"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{listing.title}</span>
                    {listing.source && (
                      <span className="text-xs text-muted-foreground">{listing.source}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {listing.price && (
                      <Badge variant="outline" className="text-purple-600">{listing.price}</Badge>
                    )}
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </div>
                </a>
              ))}
              {marketplaceListings.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{marketplaceListings.length - 3} more sources
                </p>
              )}
            </div>
          </div>
        )}

        {/* Show More Toggle for Specs */}
        {item.requiredSpecs && typeof item.requiredSpecs === 'object' && item.requiredSpecs !== null && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full"
              data-testid={`button-toggle-details-${item.id}`}
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show specifications
                </>
              )}
            </Button>

            {showDetails && (
              <div className="space-y-4 pt-2 border-t">
                <div>
                  <p className="text-sm font-medium mb-2">Required Specifications</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {Object.entries(item.requiredSpecs as Record<string, string>).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium">{key}:</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-4 border-t">
        {onFindMatches && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onFindMatches(item.id)}
            data-testid={`button-find-matches-${item.id}`}
          >
            <Search className="w-4 h-4 mr-2" />
            Find Matches
          </Button>
        )}
        {onEdit && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(item.id)}
            data-testid={`button-edit-${item.id}`}
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(item.id)}
            data-testid={`button-delete-${item.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
