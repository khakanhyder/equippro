import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Search, ExternalLink, Edit, Trash2, DollarSign } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { WishlistItem } from "@shared/schema";

interface WishlistItemCardProps {
  item: WishlistItem;
  onFindMatches?: (itemId: number) => void;
  onEdit?: (itemId: number) => void;
  onDelete?: (itemId: number) => void;
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
        used: priceData.used || priceData.Used || null,
        refurbished: priceData.refurbished || priceData.Refurbished || null,
        new: priceData.new || priceData.New || null,
      };
    } catch {
      return null;
    }
  };

  const prices = parseMarketPrices();

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
            <p className="text-2xl font-bold">${parseFloat(item.maxBudget).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Max Budget</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image Carousel */}
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

        {/* Description */}
        {item.notes && (
          <div>
            <p className="text-sm text-muted-foreground">{item.notes}</p>
          </div>
        )}

        {/* Show More Toggle */}
        {(prices || (item.requiredSpecs && typeof item.requiredSpecs === 'object' && item.requiredSpecs !== null)) && (
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
                Show more details
              </>
            )}
          </Button>
        )}

        {/* Expandable Details */}
        {showDetails && (
          <div className="space-y-4 pt-2 border-t">
            {prices && (
              <div>
                <p className="text-sm font-medium mb-3">Market Price Range</p>
                <div className="grid grid-cols-3 gap-2">
                  {prices.used && (
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Used</p>
                      <p className="text-sm font-semibold">${prices.used.toLocaleString()}</p>
                    </div>
                  )}
                  {prices.refurbished && (
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Refurbished</p>
                      <p className="text-sm font-semibold">${prices.refurbished.toLocaleString()}</p>
                    </div>
                  )}
                  {prices.new && (
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">New</p>
                      <p className="text-sm font-semibold">${prices.new.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {item.requiredSpecs && typeof item.requiredSpecs === 'object' && item.requiredSpecs !== null && (
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
            )}
          </div>
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
