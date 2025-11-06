import { Card, CardContent } from "@/components/ui/card";

interface PriceBarProps {
  usedMin: number;
  usedMax: number;
  refurbishedMax: number;
  newMax: number;
  askingPrice: number;
}

export function PriceBar({ usedMin, usedMax, refurbishedMax, newMax, askingPrice }: PriceBarProps) {
  const total = newMax - usedMin;
  const usedWidth = ((usedMax - usedMin) / total) * 100;
  const refurbishedWidth = ((refurbishedMax - usedMax) / total) * 100;
  const newWidth = ((newMax - refurbishedMax) / total) * 100;
  const markerPosition = ((askingPrice - usedMin) / total) * 100;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-card-foreground">Market Price Distribution</h4>
          
          <div className="relative h-12 rounded-lg overflow-hidden flex">
            <div 
              className="bg-emerald-500/30 flex items-center justify-center text-xs font-medium text-emerald-900 dark:text-emerald-100"
              style={{ width: `${usedWidth}%` }}
            >
              {usedWidth > 15 && 'Used'}
            </div>
            <div 
              className="bg-amber-500/30 flex items-center justify-center text-xs font-medium text-amber-900 dark:text-amber-100"
              style={{ width: `${refurbishedWidth}%` }}
            >
              {refurbishedWidth > 15 && 'Refurb'}
            </div>
            <div 
              className="bg-red-500/30 flex items-center justify-center text-xs font-medium text-red-900 dark:text-red-100"
              style={{ width: `${newWidth}%` }}
            >
              {newWidth > 15 && 'New'}
            </div>
            
            <div 
              className="absolute top-0 bottom-0 w-1 bg-destructive"
              style={{ left: `${Math.min(Math.max(markerPosition, 0), 100)}%` }}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-destructive"></div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-destructive">
                Asking: ${askingPrice.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground pt-4">
            <div>
              <div className="font-medium">Used</div>
              <div>${usedMin.toLocaleString()} - ${usedMax.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">Refurbished</div>
              <div>${usedMax.toLocaleString()} - ${refurbishedMax.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">New</div>
              <div>${refurbishedMax.toLocaleString()} - ${newMax.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
