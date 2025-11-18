import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Search, ExternalLink, Edit } from "lucide-react";
import type { WishlistItem } from "@shared/schema";

interface WishlistItemCardProps {
  item: WishlistItem;
  onFindMatches?: (itemId: number) => void;
  onEdit?: (itemId: number) => void;
}

export function WishlistItemCard({ item, onFindMatches, onEdit }: WishlistItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const externalSources: any[] = [];

  return (
    <Card 
      className="hover-elevate cursor-pointer" 
      onClick={() => setIsExpanded(!isExpanded)}
      data-testid={`item-card-${item.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg truncate">
                {item.brand} {item.model}
              </h3>
              {item.priority && (
                <Badge className={getPriorityColor(item.priority)} variant="outline">
                  {item.priority} priority
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{item.category}</p>
            
            {!isExpanded && item.maxBudget && (
              <p className="text-sm mt-2">
                <span className="text-muted-foreground">Budget: </span>
                <span className="font-medium">${parseFloat(item.maxBudget).toLocaleString()}</span>
              </p>
            )}
          </div>

          <div className="flex items-start gap-2">
            {item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0 && (
              <img 
                src={item.imageUrls[0]} 
                alt={`${item.brand} ${item.model}`}
                className="w-20 h-20 object-cover rounded"
              />
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              data-testid={`button-expand-${item.id}`}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-6 space-y-6" onClick={(e) => e.stopPropagation()}>
            {item.notes && (
              <div>
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground">{item.notes}</p>
              </div>
            )}

            {prices && (
              <div>
                <p className="text-sm font-medium mb-3">Market Price Range</p>
                <div className="grid grid-cols-3 gap-2">
                  {prices.used && (
                    <div className="text-center">
                      <div className="h-2 bg-green-500 rounded-t" />
                      <div className="mt-2">
                        <p className="text-xs font-medium text-green-700">Used</p>
                        <p className="text-sm font-semibold mt-1">${prices.used.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {prices.refurbished && (
                    <div className="text-center">
                      <div className="h-2 bg-yellow-500 rounded-t" />
                      <div className="mt-2">
                        <p className="text-xs font-medium text-yellow-700">Refurbished</p>
                        <p className="text-sm font-semibold mt-1">${prices.refurbished.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {prices.new && (
                    <div className="text-center">
                      <div className="h-2 bg-red-500 rounded-t" />
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-700">New</p>
                        <p className="text-sm font-semibold mt-1">${prices.new.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {item.maxBudget && (
              <div className="flex items-center justify-between py-3 border-t">
                <span className="text-sm text-muted-foreground">Your Budget</span>
                <span className="text-sm font-semibold">${parseFloat(item.maxBudget).toLocaleString()}</span>
              </div>
            )}

            {item.requiredSpecs && typeof item.requiredSpecs === 'object' && item.requiredSpecs !== null && (
              <div>
                <p className="text-sm font-medium mb-2">Required Specifications</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  {Object.entries(item.requiredSpecs as Record<string, unknown>).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {externalSources.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">External Sources</p>
                <div className="space-y-2">
                  {externalSources.map((source: any, index: number) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid={`link-external-${item.id}-${index}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate">{source.title || source.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              {onFindMatches && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFindMatches(item.id);
                  }}
                  data-testid={`button-find-matches-${item.id}`}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Find Equipment Matches
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
                  data-testid={`button-edit-${item.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
