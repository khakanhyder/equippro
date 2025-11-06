import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, MapPin, Grid3x3, List } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const conditionColors = {
  new: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  refurbished: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  used: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
};

export default function Surplus() {
  const [addEquipmentDialogOpen, setAddEquipmentDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const draftEquipment = [
    {
      id: "1",
      brand: "Agilent",
      model: "7890B GC",
      condition: "new" as const,
      category: "Gas Chromatograph",
      location: "San Francisco, CA",
    },
    {
      id: "2",
      brand: "Waters",
      model: "ACQUITY UPLC H-Class",
      condition: "used" as const,
      category: "HPLC System",
      location: "New York, NY",
    },
  ];

  const activeListings = [
    {
      id: "3",
      brand: "Thermo Fisher",
      model: "TSQ Altis",
      condition: "used" as const,
      price: 125000,
      category: "Mass Spectrometer",
      location: "Boston, MA",
      views: 42,
      inquiries: 5,
    },
  ];

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
                Active Listings ({activeListings.length})
              </TabsTrigger>
              <TabsTrigger value="bulks" data-testid="tab-bulks">
                Bulks (0)
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {draftEquipment.length} draft{draftEquipment.length !== 1 ? 's' : ''}
              </p>
              {draftEquipment.length > 0 && (
                <Button variant="destructive" size="sm" data-testid="button-delete-all-drafts">
                  Delete All Drafts
                </Button>
              )}
            </div>

            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
              {draftEquipment.map((equipment) => (
                <Card key={equipment.id} className="hover-elevate" data-testid={`card-draft-${equipment.id}`}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-card-foreground">
                          {equipment.brand} {equipment.model}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{equipment.category}</p>
                      </div>
                      <Badge variant="outline" className={`${conditionColors[equipment.condition]} border font-semibold text-xs ml-2`}>
                        {equipment.condition}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {equipment.location}
                    </div>

                    <div className="text-sm text-muted-foreground italic">
                      Price context not available.
                    </div>

                    <Button className="w-full" size="sm" variant="default" data-testid={`button-publish-${equipment.id}`}>
                      Publish
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
              {activeListings.map((equipment) => (
                <Card key={equipment.id} className="hover-elevate" data-testid={`card-active-${equipment.id}`}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-card-foreground">
                          {equipment.brand} {equipment.model}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{equipment.category}</p>
                      </div>
                      <Badge variant="outline" className={`${conditionColors[equipment.condition]} border font-semibold text-xs ml-2`}>
                        {equipment.condition}
                      </Badge>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-card-foreground">${equipment.price.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {equipment.location}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{equipment.views} views</span>
                      <span>{equipment.inquiries} inquiries</span>
                    </div>

                    <Button className="w-full" size="sm" variant="outline" data-testid={`button-edit-${equipment.id}`}>
                      Edit Listing
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bulks" className="py-12 text-center">
            <p className="text-muted-foreground">No bulk listings yet.</p>
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

            <div className="py-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="surplus-brand">Brand *</Label>
                  <Input id="surplus-brand" placeholder="e.g., Thermo Fisher" data-testid="input-surplus-brand" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surplus-model">Model *</Label>
                  <Input id="surplus-model" placeholder="e.g., TSQ-9000" data-testid="input-surplus-model" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surplus-price">Asking Price ($)</Label>
                  <Input id="surplus-price" type="number" placeholder="e.g., 45000" data-testid="input-surplus-price" />
                </div>
              </div>

              <div className="col-span-2 mb-6">
                <Button variant="secondary" className="w-full bg-violet-500 hover:bg-violet-600 text-white" data-testid="button-validate-brand-model">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Validate Brand/Model
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="surplus-category">Category *</Label>
                  <Select>
                    <SelectTrigger id="surplus-category" data-testid="select-surplus-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analytical">Analytical</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surplus-condition">Condition *</Label>
                  <Select>
                    <SelectTrigger id="surplus-condition" data-testid="select-surplus-condition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="surplus-location">Location *</Label>
                <Input id="surplus-location" placeholder="e.g., Houston, TX" data-testid="input-surplus-location" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="surplus-description">Description</Label>
                    <Textarea
                      id="surplus-description"
                      placeholder="Describe the equipment condition, features, and any additional details..."
                      rows={4}
                      data-testid="input-surplus-description"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Technical Specifications</Label>
                      <Button size="sm" variant="outline" data-testid="button-add-spec-surplus">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Market Price Context</Label>
                      <button className="p-1 hover:bg-muted rounded" data-testid="button-refresh-price-surplus">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                    <Button variant="outline" className="w-full" data-testid="button-get-price-context-surplus">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Get Price Context
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Images</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center" data-testid="dropzone-images-surplus">
                      <svg className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-muted-foreground">Drop images here or click to select</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Documents</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center" data-testid="dropzone-documents-surplus">
                      <svg className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-xs text-muted-foreground">Drop documents here or click to select</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAddEquipmentDialogOpen(false)} data-testid="button-cancel-surplus">
                Cancel
              </Button>
              <Button onClick={() => {
                console.log('Save as Draft clicked');
                setAddEquipmentDialogOpen(false);
              }} data-testid="button-save-draft">
                Save as Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
