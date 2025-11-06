import { StatCard } from "@/components/stat-card";
import { MatchCard } from "@/components/match-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gavel, Target, Sparkles, DollarSign, AlertCircle, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">AI-powered equipment marketplace insights</p>
          </div>
          <div className="text-sm text-muted-foreground">
            Last updated: <span className="font-medium">Just now</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Active Bids"
            value={12}
            subtitle="All current"
            icon={Gavel}
            onClick={() => console.log('View all bids')}
          />
          <StatCard
            title="Total Wishlist Items"
            value={8}
            subtitle="Across 3 projects"
            icon={Target}
            onClick={() => console.log('View wishlist')}
          />
          <StatCard
            title="New Matches Today"
            value={3}
            subtitle="AI-verified matches"
            icon={Sparkles}
            onClick={() => console.log('View matches')}
          />
          <StatCard
            title="Total Bid Value"
            value="$450,000"
            subtitle="1 pending bids"
            icon={DollarSign}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Alert className="bg-red-500/5 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm">
              <span className="font-semibold text-red-900 dark:text-red-100">2 bids expiring in 7 days</span>
              <div className="mt-2 space-y-1 text-xs text-red-800 dark:text-red-200">
                <div>• Thermo Fisher TSQ Altis - Expires in 5 days</div>
                <div>• Waters ACQUITY UPLC - Expires in 6 days</div>
              </div>
              <Button size="sm" variant="outline" className="mt-3" data-testid="button-view-expiring-bids">
                View All
              </Button>
            </AlertDescription>
          </Alert>

          <Alert className="bg-emerald-500/5 border-emerald-500/20">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-sm">
              <span className="font-semibold text-emerald-900 dark:text-emerald-100">3 high-confidence matches found</span>
              <div className="mt-2 space-y-1 text-xs text-emerald-800 dark:text-emerald-200">
                <div>• Watson Marlow 620Bp (95% match)</div>
                <div>• Agilent 7890B GC (88% match)</div>
                <div>• Miltenyi MACSQuant (82% match)</div>
              </div>
              <Button size="sm" variant="outline" className="mt-3" data-testid="button-view-all-matches">
                View All Matches
              </Button>
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Bids
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { equipment: "Thermo Fisher TSQ Altis", bid: 125000, status: "pending", days: "NaN" },
                { equipment: "Agilent 7890B GC", bid: 85000, status: "pending", days: "NaN" },
              ].map((bid, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-card-foreground truncate">{bid.equipment}</p>
                    <p className="text-xs text-muted-foreground mt-1">Expires in {bid.days} days</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">${bid.bid.toLocaleString()}</p>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs mt-1">
                        {bid.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Saved Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                You have no saved matches yet. Save them from the Wishlist page!
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Wishlist Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MatchCard
              wishlistItem="Watson Marlow 620Bp"
              matchedEquipment="Watson Marlow 620Bp - Analytical"
              confidence="high"
              matchType="exact"
              explanation="Same brand and model, similar specs. Excellent match for your requirements."
              price={1039}
              budget={1559}
              daysAgo={2}
              onViewDetails={() => console.log('View details')}
              onPlaceBid={() => console.log('Place bid')}
              onDismiss={() => console.log('Dismiss')}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
