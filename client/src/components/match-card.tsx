import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, X } from "lucide-react";

interface MatchCardProps {
  wishlistItem: string;
  matchedEquipment: string;
  confidence: "high" | "medium" | "low";
  matchType: "exact" | "variant" | "related" | "alternative";
  explanation: string;
  price: number;
  budget: number;
  daysAgo: number;
  onViewDetails: () => void;
  onPlaceBid: () => void;
  onDismiss: () => void;
}

const confidenceColors = {
  high: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  low: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const matchTypeColors = {
  exact: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  variant: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  related: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  alternative: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
};

export function MatchCard({
  wishlistItem,
  matchedEquipment,
  confidence,
  matchType,
  explanation,
  price,
  budget,
  daysAgo,
  onViewDetails,
  onPlaceBid,
  onDismiss,
}: MatchCardProps) {
  const withinBudget = price <= budget;

  return (
    <Card className="hover-elevate" data-testid="card-match">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <h4 className="text-sm font-semibold text-card-foreground truncate">
                  {wishlistItem}
                </h4>
              </div>
              <p className="text-base font-semibold text-card-foreground">{matchedEquipment}</p>
            </div>
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              <Badge variant="outline" className={`${confidenceColors[confidence]} border font-semibold text-xs`}>
                {confidence} confidence
              </Badge>
              <Badge variant="outline" className={`${matchTypeColors[matchType]} border text-xs`}>
                {matchType}
              </Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{explanation}</p>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-semibold text-card-foreground">${price.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-semibold text-card-foreground">${budget.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {withinBudget ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600 font-medium text-xs">Within budget</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-medium text-xs">Over budget</span>
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">Found {daysAgo} day{daysAgo !== 1 ? 's' : ''} ago</div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={onViewDetails} data-testid="button-view-match-details">
              View Details
            </Button>
            <Button size="sm" variant="outline" onClick={onPlaceBid} data-testid="button-place-bid-match">
              Place Bid
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss} data-testid="button-dismiss-match">
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
