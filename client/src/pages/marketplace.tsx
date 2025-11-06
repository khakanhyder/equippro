import { useState } from "react";
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
import { Search, Grid3x3, List, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Marketplace() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");

  const mockEquipment = [
    {
      id: "1",
      brand: "Thermo Fisher",
      model: "TSQ Altis",
      condition: "used" as const,
      price: 125000,
      location: "Boston, MA",
      category: "Mass Spectrometer",
      priceVariance: -8,
      description: "High-performance triple quadrupole mass spectrometer for quantitative analysis.",
      specifications: { Power: "500W", Weight: "75 kg" },
    },
    {
      id: "2",
      brand: "Agilent",
      model: "7890B GC",
      condition: "new" as const,
      price: 85000,
      location: "San Francisco, CA",
      category: "Gas Chromatograph",
      priceVariance: 5,
      description: "Advanced gas chromatography system with latest features.",
      specifications: { Power: "1200W", Dimensions: "80 x 60 x 50 cm" },
    },
    {
      id: "3",
      brand: "Waters",
      model: "ACQUITY UPLC H-Class",
      condition: "refurbished" as const,
      price: 65000,
      location: "New York, NY",
      category: "HPLC System",
      priceVariance: -12,
      description: "Ultra-performance liquid chromatography system, fully refurbished.",
      specifications: { Voltage: "220V", Weight: "60 kg" },
    },
  ];

  const handleBid = (id: string) => {
    const equipment = mockEquipment.find((e) => e.id === id);
    if (equipment) {
      setCurrentEquipment(equipment);
      setBidDialogOpen(true);
    }
  };

  const handleViewDetails = (id: string) => {
    const equipment = mockEquipment.find((e) => e.id === id);
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
              {mockEquipment.length} equipment entries available
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
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {mockEquipment.map((equipment) => (
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
            onSubmit={(amount, notes) => {
              console.log("Bid submitted:", { amount, notes });
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
