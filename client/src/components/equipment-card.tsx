import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Package2 } from "lucide-react";

interface EquipmentCardProps {
  id: string;
  brand: string;
  model: string;
  condition: "new" | "refurbished" | "used";
  price: number;
  location: string;
  category: string;
  imageUrl?: string;
  priceVariance?: number;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onBid?: (id: string) => void;
  onClick?: (id: string) => void;
}

const conditionColors = {
  new: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  refurbished: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  used: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
};

export function EquipmentCard({
  id,
  brand,
  model,
  condition,
  price,
  location,
  category,
  imageUrl,
  priceVariance,
  selected = false,
  onSelect,
  onBid,
  onClick,
}: EquipmentCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate cursor-pointer" onClick={() => onClick?.(id)} data-testid={`card-equipment-${id}`}>
      <div className="relative aspect-video bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={`${brand} ${model}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package2 className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={selected} 
            onCheckedChange={(checked) => onSelect?.(id, checked as boolean)}
            className="bg-background/90 border-border"
            data-testid={`checkbox-select-${id}`}
          />
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className={`${conditionColors[condition]} border font-semibold text-xs`}>
            {condition}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">
              {brand} {model}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Package2 className="w-3 h-3" />
              {category}
            </p>
          </div>
          
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-card-foreground">${price.toLocaleString()}</p>
            {priceVariance !== undefined && (
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  priceVariance > 0 
                    ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" 
                    : priceVariance < 0 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                    : "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20"
                }`}
              >
                {priceVariance > 0 ? '+' : ''}{priceVariance}% vs market
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {location}
          </p>

          <Button 
            className="w-full" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onBid?.(id);
            }}
            data-testid={`button-bid-${id}`}
          >
            Place Bid
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
