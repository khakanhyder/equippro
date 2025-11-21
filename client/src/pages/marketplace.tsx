import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Equipment } from "@shared/schema";
import { EquipmentCard } from "@/components/equipment-card";
import { BidDialog } from "@/components/bid-dialog";
import { EquipmentDetailModal } from "@/components/equipment-detail-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Grid3x3, List, Filter, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBidMutations } from "@/hooks/use-bids";
import { useToast } from "@/hooks/use-toast";

export default function Marketplace() {
  const { toast } = useToast();
  const { createBid } = useBidMutations();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");

  // Fetch published equipment from API (shows ALL users' active listings - generic marketplace)
  const { data: equipmentList, isLoading, error } = useQuery<Equipment[]>({
    queryKey: ["/api/marketplace"],
  });

  // Calculate price variance based on market data
  const calculatePriceVariance = (askingPrice: string, marketPriceRange: any, condition: string) => {
    if (!marketPriceRange) return undefined;
    
    const asking = parseFloat(askingPrice);
    const conditionKey = condition.toLowerCase();
    
    // Get market average for the condition
    const marketAvg = marketPriceRange[conditionKey]?.average || 
                      marketPriceRange[`${conditionKey}_average`];
    
    if (!marketAvg) return undefined;
    
    // Calculate percentage variance
    const variance = ((asking - marketAvg) / marketAvg) * 100;
    return Math.round(variance);
  };

  // Transform equipment data for display
  const displayEquipment = useMemo(() => {
    if (!equipmentList) return [];
    
    return equipmentList
      // Defensive check: only show active listings even if backend returns others
      .filter((item) => item.listingStatus === 'active')
      .map((item) => {
        // Parse asking price safely (remove non-numeric characters except decimal point)
        const cleanPrice = item.askingPrice.replace(/[^0-9.]/g, '');
        const numericPrice = parseFloat(cleanPrice);
        
        return {
          id: item.id.toString(),
          brand: item.brand,
          model: item.model,
          condition: item.condition as "new" | "refurbished" | "used",
          price: isNaN(numericPrice) ? 0 : numericPrice,
          location: item.location,
          category: item.category,
          priceVariance: calculatePriceVariance(cleanPrice, item.marketPriceRange, item.condition),
          description: item.description || "",
          specifications: item.specifications || {},
          imageUrl: item.images?.[0], // Use first image
          rawData: item, // Keep full data for detail view
        };
      });
  }, [equipmentList]);

  // Filter equipment based on search and filters
  const filteredEquipment = useMemo(() => {
    return displayEquipment.filter((item) => {
      const matchesSearch = !searchQuery || 
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || 
        item.category.toLowerCase().includes(categoryFilter.toLowerCase());
      
      const matchesCondition = conditionFilter === "all" || 
        item.condition === conditionFilter;
      
      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [displayEquipment, searchQuery, categoryFilter, conditionFilter]);

  const handleBid = (id: string) => {
    const equipment = displayEquipment.find((e) => e.id === id);
    if (equipment) {
      setCurrentEquipment(equipment);
      setBidDialogOpen(true);
    }
  };

  const handleViewDetails = (id: string) => {
    const equipment = displayEquipment.find((e) => e.id === id);
    if (equipment) {
      setCurrentEquipment(equipment);
      setDetailModalOpen(true);
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedEquipment((prev) =>
      selected ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
            <p className="text-muted-foreground mt-1">
              {isLoading ? "Loading..." : `${filteredEquipment.length} equipment entries available`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search brand, model, or description..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="analytical">Analytical</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
            </SelectContent>
          </Select>

          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-condition">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="refurbished">Refurbished</SelectItem>
              <SelectItem value="used">Used</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" data-testid="button-more-filters">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>

        {selectedEquipment.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              {selectedEquipment.length} items selected
            </Badge>
            <Button size="sm" data-testid="button-create-bulk-offer">
              Create Bulk Offer
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-lg font-medium text-destructive">Failed to load marketplace</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "An error occurred while loading equipment"}
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-lg font-medium text-muted-foreground">No equipment found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your filters or check back later for new listings
            </p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredEquipment.map((equipment) => (
              <EquipmentCard
                key={equipment.id}
                {...equipment}
                selected={selectedEquipment.includes(equipment.id)}
                onSelect={handleSelect}
                onBid={handleBid}
                onClick={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>

      {currentEquipment && (
        <>
          <BidDialog
            open={bidDialogOpen}
            onOpenChange={setBidDialogOpen}
            equipment={{
              brand: currentEquipment.brand,
              model: currentEquipment.model,
              askingPrice: currentEquipment.price,
            }}
            onSubmit={async (amount, notes) => {
              try {
                await createBid.mutateAsync({
                  equipmentId: parseInt(currentEquipment.id),
                  bidAmount: amount.toString(),
                  message: notes || null,
                  expiresAt: null,
                });
                toast({
                  title: "Bid submitted successfully",
                  description: `Your bid of $${amount.toLocaleString()} has been submitted`,
                });
                setBidDialogOpen(false);
              } catch (error: any) {
                toast({
                  title: "Failed to submit bid",
                  description: error.message || "Please try again",
                  variant: "destructive",
                });
              }
            }}
          />
          <EquipmentDetailModal
            open={detailModalOpen}
            onOpenChange={setDetailModalOpen}
            equipment={currentEquipment}
            onBid={handleBid}
          />
        </>
      )}
    </div>
  );
}
