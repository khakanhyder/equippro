import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Grid3x3, List, Loader2 } from "lucide-react";
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
import { SurplusItemCard } from "@/components/surplus-item-card";
import type { Equipment } from "@shared/schema";

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
    <SurplusItemCard
      key={equipment.id}
      item={equipment}
      isDraft={isDraft}
      onPublish={setPublishingId}
      onEdit={(id) => console.log('Edit equipment:', id)}
      onMarkAsSold={handleMarkAsSold}
    />
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
