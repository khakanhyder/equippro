import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, MapPin, Trash2 } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { Equipment } from "@shared/schema";

interface SurplusItemCardProps {
  item: Equipment;
  isDraft?: boolean;
  onPublish?: (itemId: number) => void;
  onUnpublish?: (itemId: number) => void;
  onEdit?: (itemId: number) => void;
  onMarkAsSold?: (itemId: number) => void;
  onDelete?: (itemId: number) => void;
}

const conditionColors: Record<string, string> = {
  new: "bg-emerald-100 text-emerald-800 border-emerald-200",
  refurbished: "bg-yellow-100 text-yellow-800 border-yellow-200",
  used: "bg-slate-100 text-slate-800 border-slate-200",
};

export function SurplusItemCard({ item, isDraft = false, onPublish, onUnpublish, onEdit, onMarkAsSold, onDelete }: SurplusItemCardProps) {
  const [showDetails, setShowDetails] = useState(false);

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
        used_min: priceData.used_min || null,
        used_max: priceData.used_max || null,
        refurbished_min: priceData.refurbished_min || null,
        refurbished_max: priceData.refurbished_max || null,
        new_min: priceData.new_min || null,
        new_max: priceData.new_max || null,
      };
    } catch {
      return null;
    }
  };

  const prices = parseMarketPrices();

  const formatPriceRange = (min: number | null, max: number | null) => {
    const minNum = min !== null ? (typeof min === 'number' ? min : parseFloat(String(min))) : null;
    const maxNum = max !== null ? (typeof max === 'number' ? max : parseFloat(String(max))) : null;
    
    if (minNum === null && maxNum === null) return 'N/A';
    if (isNaN(minNum as number) && isNaN(maxNum as number)) return 'N/A';
    if (minNum === null || isNaN(minNum)) return `Up to $${maxNum?.toLocaleString()}`;
    if (maxNum === null || isNaN(maxNum)) return `From $${minNum?.toLocaleString()}`;
    if (minNum === maxNum) return `$${minNum?.toLocaleString()}`;
    return `$${minNum?.toLocaleString()} - $${maxNum?.toLocaleString()}`;
  };

  return (
    <Card className="hover-elevate" data-testid={`card-surplus-${item.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-lg">
                {item.brand} {item.model}
              </h3>
              <Badge 
                className={conditionColors[item.condition] || "bg-slate-100 text-slate-800 border-slate-200"} 
                variant="outline"
              >
                {item.condition}
              </Badge>
              {isDraft && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Draft
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{item.category}</p>
          </div>
          
          <div className="text-right">
            <p className="text-2xl font-bold">${parseFloat(item.askingPrice).toLocaleString()}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3 h-3" />
              <span>{item.location}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image Carousel */}
        {item.images && Array.isArray(item.images) && item.images.length > 0 && (
          <div>
            {item.images.length === 1 ? (
              <img 
                src={item.images[0]} 
                alt={`${item.brand} ${item.model}`}
                className="w-full h-48 object-cover rounded-lg border"
              />
            ) : (
              <Carousel className="w-full">
                <CarouselContent>
                  {item.images.map((imageUrl, idx) => (
                    <CarouselItem key={idx}>
                      <img 
                        src={imageUrl} 
                        alt={`${item.brand} ${item.model} - Image ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            )}
          </div>
        )}

        {/* Quick Info */}
        {!isDraft && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="w-4 h-4" />
            {item.viewsCount || 0} views
          </div>
        )}

        {/* Description */}
        {item.description && (
          <div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
            {item.description.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setShowDetails(!showDetails)}
                data-testid={`button-toggle-details-${item.id}`}
              >
                {showDetails ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
        )}

        {/* Expandable Details */}
        {showDetails && (
          <div className="space-y-4 pt-2 border-t">
            {item.description && (
              <div>
                <p className="text-sm font-medium mb-1">Full Description</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            )}

            {prices && (
              <div>
                <p className="text-sm font-medium mb-2">Market Price Context</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Used</p>
                    <p className="font-semibold text-xs">{formatPriceRange(prices.used_min, prices.used_max)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Refurbished</p>
                    <p className="font-semibold text-xs">{formatPriceRange(prices.refurbished_min, prices.refurbished_max)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">New</p>
                    <p className="font-semibold text-xs">{formatPriceRange(prices.new_min, prices.new_max)}</p>
                  </div>
                </div>
              </div>
            )}

            {item.specifications && typeof item.specifications === 'object' && Object.keys(item.specifications).length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-2">Specifications</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(item.specifications).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium text-muted-foreground text-xs">{key}:</span>
                      <span className="text-xs">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>

      {/* Action Buttons - Always Visible */}
      <CardFooter className="flex gap-2 border-t pt-4">
        {isDraft ? (
          <>
            <Button
              className="flex-1"
              onClick={() => onPublish?.(item.id)}
              data-testid={`button-publish-${item.id}`}
            >
              Publish
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit?.(item.id)}
              data-testid={`button-edit-surplus-${item.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete?.(item.id)}
              data-testid={`button-delete-${item.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => onUnpublish?.(item.id)}
              data-testid={`button-unpublish-${item.id}`}
            >
              Unpublish
            </Button>
            <Button
              variant="outline"
              onClick={() => onMarkAsSold?.(item.id)}
              data-testid={`button-mark-sold-${item.id}`}
            >
              Mark as Sold
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit?.(item.id)}
              data-testid={`button-edit-surplus-${item.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete?.(item.id)}
              data-testid={`button-delete-${item.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
