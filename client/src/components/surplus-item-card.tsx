import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Edit, Eye, MapPin, Trash2 } from "lucide-react";
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

const conditionColors = {
  new: "bg-emerald-100 text-emerald-800 border-emerald-200",
  refurbished: "bg-yellow-100 text-yellow-800 border-yellow-200",
  used: "bg-slate-100 text-slate-800 border-slate-200",
};

export function SurplusItemCard({ item, isDraft = false, onPublish, onUnpublish, onEdit, onMarkAsSold, onDelete }: SurplusItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
    <Card 
      className="hover-elevate" 
      data-testid={`card-surplus-${item.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          {item.images && Array.isArray(item.images) && item.images.length > 0 && (
            <div className="w-32 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {item.images.length === 1 ? (
                <img 
                  src={item.images[0]} 
                  alt={`${item.brand} ${item.model}`}
                  className="w-full h-32 object-cover rounded border"
                />
              ) : (
                <Carousel className="w-full">
                  <CarouselContent>
                    {item.images.map((imageUrl, idx) => (
                      <CarouselItem key={idx}>
                        <img 
                          src={imageUrl} 
                          alt={`${item.brand} ${item.model} - Image ${idx + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-1" />
                  <CarouselNext className="right-1" />
                </Carousel>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg truncate">
                {item.brand} {item.model}
              </h3>
              <Badge 
                className={conditionColors[item.condition as keyof typeof conditionColors]} 
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
            
            {!isExpanded && (
              <div className="mt-2 space-y-1">
                <p className="text-2xl font-bold">${parseFloat(item.askingPrice).toLocaleString()}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {item.location}
                </div>
                {!isDraft && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    {item.viewsCount || 0} views
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            data-testid={`button-expand-surplus-${item.id}`}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-6 space-y-6" onClick={(e) => e.stopPropagation()}>
            {item.description && (
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Asking Price</p>
                <p className="text-2xl font-bold">${parseFloat(item.askingPrice).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Location</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{item.location}</span>
                </div>
              </div>
            </div>

            {prices && (
              <div>
                <p className="text-sm font-medium mb-3">Market Price Context</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Used</p>
                    <p className="font-semibold">{formatPriceRange(prices.used_min, prices.used_max)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Refurbished</p>
                    <p className="font-semibold">{formatPriceRange(prices.refurbished_min, prices.refurbished_max)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">New</p>
                    <p className="font-semibold">{formatPriceRange(prices.new_min, prices.new_max)}</p>
                  </div>
                </div>
              </div>
            )}

            {item.specifications && typeof item.specifications === 'object' && Object.keys(item.specifications).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Specifications</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(item.specifications as Record<string, string>).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium text-muted-foreground">{key}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isDraft && (
              <div className="flex items-center justify-between py-3 border-t">
                <span className="text-sm text-muted-foreground">Views</span>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{item.viewsCount || 0}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              {isDraft && onPublish && (
                <Button
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPublish(item.id);
                  }}
                  data-testid={`button-publish-${item.id}`}
                >
                  Publish to Marketplace
                </Button>
              )}
              {!isDraft && onUnpublish && (
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpublish(item.id);
                  }}
                  data-testid={`button-unpublish-${item.id}`}
                >
                  Unpublish
                </Button>
              )}
              {!isDraft && onMarkAsSold && (
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsSold(item.id);
                  }}
                  data-testid={`button-mark-sold-${item.id}`}
                >
                  Mark as Sold
                </Button>
              )}
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item.id);
                  }}
                  data-testid={`button-edit-surplus-${item.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  data-testid={`button-delete-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
