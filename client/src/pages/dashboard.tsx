import { StatCard } from "@/components/stat-card";
import { MatchCard } from "@/components/match-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gavel, Target, Sparkles, DollarSign, AlertCircle, TrendingUp, Clock, CheckCircle, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useBidsReceived } from "@/hooks/use-bids";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: bidsReceived, isLoading: bidsLoading } = useBidsReceived();

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">AI-powered equipment marketplace insights</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
            title="Active Bids Received"
            value={stats?.activeBidsCount || 0}
            subtitle={`${stats?.bidsReceivedCount || 0} total bids`}
            icon={Gavel}
            data-testid="stat-card-bids"
          />
          <StatCard
            title="Total Wishlist Items"
            value={stats?.wishlistCount || 0}
            subtitle="Across all projects"
            icon={Target}
            data-testid="stat-card-wishlist"
          />
          <StatCard
            title="New Matches Today"
            value={stats?.newMatchesToday || 0}
            subtitle={`${stats?.matchesCount || 0} total matches`}
            icon={Sparkles}
            data-testid="stat-card-matches"
          />
          <StatCard
            title="Total Bid Value"
            value={`$${(stats?.totalBidValue || 0).toLocaleString()}`}
            subtitle={`${stats?.activeBidsCount || 0} pending bids`}
            icon={DollarSign}
            data-testid="stat-card-bid-value"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Surplus Equipment"
            value={stats?.surplusCount || 0}
            subtitle={`${stats?.publishedCount || 0} published`}
            icon={Package}
            data-testid="stat-card-surplus"
          />
        </div>

        {stats?.activeBidsCount === 0 && stats?.newMatchesToday === 0 ? (
          <Alert className="bg-muted/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <span className="font-semibold">No recent activity</span>
              <p className="mt-2 text-muted-foreground">
                You don't have any active bids or new matches yet. 
                Start by adding equipment to your surplus or wishlist to get AI-powered matches!
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {stats && stats.activeBidsCount > 0 && (
              <Alert className="bg-emerald-500/5 border-emerald-500/20">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-sm">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                    {stats.activeBidsCount} active {stats.activeBidsCount === 1 ? 'bid' : 'bids'} on your equipment
                  </span>
                  <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-200">
                    Total value: ${stats.totalBidValue.toLocaleString()}
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" data-testid="button-view-active-bids">
                    View All Bids
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {stats && stats.newMatchesToday > 0 && (
              <Alert className="bg-blue-500/5 border-blue-500/20">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    {stats.newMatchesToday} new {stats.newMatchesToday === 1 ? 'match' : 'matches'} found today
                  </span>
                  <p className="mt-2 text-xs text-blue-800 dark:text-blue-200">
                    AI has found equipment matching your wishlist items
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" data-testid="button-view-all-matches">
                    View All Matches
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Bids
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bidsLoading ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Loading bids...</p>
                </div>
              ) : !bidsReceived || bidsReceived.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No bids received yet. Publish your equipment to start receiving bids!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bidsReceived.slice(0, 5).map(({ bid, equipment }) => (
                    <div
                      key={bid.id}
                      className="flex items-start justify-between p-3 rounded-lg border hover-elevate"
                      data-testid={`bid-item-${bid.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {equipment.brand} {equipment.model}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Bid: ${parseFloat(bid.bidAmount).toLocaleString()}
                        </p>
                        {bid.message && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{bid.message}"
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          variant={bid.status === 'pending' ? 'default' : bid.status === 'accepted' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {bid.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(bid.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {bidsReceived.length > 5 && (
                    <Button variant="outline" size="sm" className="w-full mt-2" data-testid="button-view-all-bids">
                      View All {bidsReceived.length} Bids
                    </Button>
                  )}
                </div>
              )}
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
      </div>
    </div>
  );
}
