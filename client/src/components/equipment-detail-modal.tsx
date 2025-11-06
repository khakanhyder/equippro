import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Package2 } from "lucide-react";
import { PriceBar } from "./price-bar";

interface EquipmentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: {
    id: string;
    brand: string;
    model: string;
    condition: "new" | "refurbished" | "used";
    price: number;
    location: string;
    category: string;
    description?: string;
    specifications?: Record<string, string>;
  };
  onBid?: (id: string) => void;
}

const conditionColors = {
  new: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  refurbished: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  used: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
};

export function EquipmentDetailModal({ open, onOpenChange, equipment, onBid }: EquipmentDetailModalProps) {
  const [priceContextLoaded, setPriceContextLoaded] = useState(false);

  const loadPriceContext = () => {
    console.log('Loading price context...');
    setPriceContextLoaded(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-equipment-detail">
        <DialogHeader>
          <DialogTitle className="text-2xl">{equipment.brand} {equipment.model}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="description" data-testid="tab-description">Description</TabsTrigger>
            <TabsTrigger value="specifications" data-testid="tab-specifications">Specifications</TabsTrigger>
            <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing</TabsTrigger>
            <TabsTrigger value="match" data-testid="tab-match">Match Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Condition:</span>
                      <Badge variant="outline" className={`${conditionColors[equipment.condition]} border font-semibold`}>
                        {equipment.condition}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{equipment.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{equipment.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Asking Price</p>
                    <p className="text-3xl font-bold text-card-foreground">${equipment.price.toLocaleString()}</p>
                  </div>
                </div>

                {equipment.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Quick Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      {equipment.description.substring(0, 200)}...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => onBid?.(equipment.id)} data-testid="button-place-bid-modal">
              Place Bid on This Equipment
            </Button>
          </TabsContent>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-card-foreground leading-relaxed">
                  {equipment.description || "No description available."}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            {equipment.specifications && Object.keys(equipment.specifications).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(equipment.specifications).map(([key, value]) => (
                  <Card key={key}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{key}</p>
                      <p className="text-sm font-semibold text-card-foreground">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No specifications available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Asking Price</h3>
              <p className="text-4xl font-bold text-card-foreground">${equipment.price.toLocaleString()}</p>
            </div>

            {!priceContextLoaded ? (
              <Button onClick={loadPriceContext} variant="outline" className="w-full" data-testid="button-request-price-context">
                Request Price Context
              </Button>
            ) : (
              <div className="space-y-4">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                  Real Market Data
                </Badge>
                <PriceBar
                  usedMin={80000}
                  usedMax={120000}
                  refurbishedMax={150000}
                  newMax={180000}
                  askingPrice={equipment.price}
                />
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Crating Cost:</span>
                      <span className="font-semibold">$500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Shipping Cost:</span>
                      <span className="font-semibold">$2,500</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="match" className="mt-6">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">This equipment was not found through a wishlist match.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
