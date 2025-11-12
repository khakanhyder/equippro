import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, MapPin, Grid3x3, List, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useEquipmentList, useEquipmentMutations } from "@/hooks/use-equipment";
import { SurplusForm } from "@/components/surplus-form";
import type { Equipment } from "@shared/schema";

const conditionColors = {
  new: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  refurbished: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  used: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
};

export default function Surplus() {
  const { toast } = useToast();
  const [addEquipmentDialogOpen, setAddEquipmentDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const { data: draftEquipment = [], isLoading: isDraftsLoading } = useEquipmentList('draft');
  const { data: activeEquipment = [], isLoading: isActiveLoading } = useEquipmentList('active');
  
  const { createEquipment, publishEquipment, markAsSold } = useEquipmentMutations();

  const handleSubmit = async (data: any) => {
    try {
      await createEquipment.mutateAsync(data);
      
      toast({
        title: "Equipment saved",
        description: "Your equipment has been saved as a draft",
      });
      
      setAddEquipmentDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message || "Could not save equipment",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await publishEquipment.mutateAsync(id);
      
      toast({
        title: "Published",
        description: "Equipment is now live on the marketplace",
      });
      
      setPublishingId(null);
    } catch (error: any) {
      toast({
        title: "Failed to publish",
        description: error.message || "Could not publish equipment",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsSold = async (id: number) => {
    try {
      await markAsSold.mutateAsync(id);
      
      toast({
        title: "Marked as sold",
        description: "Equipment listing has been marked as sold",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update",
        description: error.message || "Could not mark as sold",
        variant: "destructive",
      });
    }
  };

  const renderEquipmentCard = (equipment: Equipment, isDraft: boolean) => (
    <Card key={equipment.id} className="hover-elevate" data-testid={`card-${isDraft ? 'draft' : 'active'}-${equipment.id}`}>
      <CardContent className="p-6 space-y-4">
        {equipment.images && equipment.images.length > 0 && (
          <div className="w-full h-40 bg-muted rounded-lg overflow-hidden">
            <img
              src={equipment.images[0]}
              alt={`${equipment.brand} ${equipment.model}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-card-foreground">
              {equipment.brand} {equipment.model}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{equipment.category}</p>
          </div>
          <Badge variant="outline" className={`${conditionColors[equipment.condition as keyof typeof conditionColors]} border font-semibold text-xs ml-2`}>
            {equipment.condition}
          </Badge>
        </div>

        {!isDraft && (
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-card-foreground">
              ${parseFloat(equipment.askingPrice).toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          {equipment.location}
        </div>

        {equipment.marketPriceRange && isDraft ? (
          <div className="text-sm text-muted-foreground">
            <p className="italic">Price context available</p>
          </div>
        ) : null}

        {!isDraft && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{equipment.viewsCount || 0} views</span>
          </div>
        )}

        {isDraft ? (
          <Button
            className="w-full"
            size="sm"
            variant="default"
            onClick={() => setPublishingId(equipment.id)}
            data-testid={`button-publish-${equipment.id}`}
          >
            Publish
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              variant="outline"
              data-testid={`button-edit-${equipment.id}`}
            >
              Edit
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="secondary"
              onClick={() => handleMarkAsSold(equipment.id)}
              disabled={markAsSold.isPending}
              data-testid={`button-mark-sold-${equipment.id}`}
            >
              Mark as Sold
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Surplus Equipment</h1>
            <p className="text-muted-foreground mt-1">
              Manage your equipment for sale on the marketplace.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-bulk-import">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
            <Button onClick={() => setAddEquipmentDialogOpen(true)} data-testid="button-add-equipment-surplus">
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </div>
        </div>

        <Tabs defaultValue="drafts" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="drafts" data-testid="tab-drafts">
                Drafts ({draftEquipment.length})
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">
                Active Listings ({activeEquipment.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid-surplus"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
                data-testid="button-view-list-surplus"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="drafts" className="space-y-4">
            {isDraftsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : draftEquipment.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No draft equipment yet</p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                {draftEquipment.map((equipment) => renderEquipmentCard(equipment, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {isActiveLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeEquipment.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No active listings yet</p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                {activeEquipment.map((equipment) => renderEquipmentCard(equipment, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={addEquipmentDialogOpen} onOpenChange={setAddEquipmentDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-surplus">
            <DialogHeader>
              <DialogTitle>Add Surplus Equipment</DialogTitle>
              <DialogDescription>
                Fill in the details for your equipment listing. All saved equipment starts as a draft.
              </DialogDescription>
            </DialogHeader>

            <SurplusForm
              onSubmit={handleSubmit}
              isSubmitting={createEquipment.isPending}
              defaultEmail="user@example.com"
            />
          </DialogContent>
        </Dialog>

        <AlertDialog open={publishingId !== null} onOpenChange={(open) => !open && setPublishingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish Equipment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will make your equipment visible on the marketplace. Once published, it can only be marked as sold.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => publishingId && handlePublish(publishingId)}
                disabled={publishEquipment.isPending}
              >
                {publishEquipment.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
