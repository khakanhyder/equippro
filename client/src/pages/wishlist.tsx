import { useState } from "react";
import { useProjects, useProjectMutations, useWishlistItems, useWishlistMutations } from "@/hooks/use-wishlist";
import { ProjectCardWrapper } from "@/components/project-card-wrapper";
import { WishlistItemForm } from "@/components/wishlist-item-form";
import { WishlistItemCard } from "@/components/wishlist-item-card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Package, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWishlistProjectSchema, type InsertWishlistProject, type WishlistItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { searchAllSources } from "@/lib/ai-service";

export default function Wishlist() {
  const { toast } = useToast();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { createProject, deleteProject } = useProjectMutations();
  const { deleteWishlistItem, updateWishlistItem } = useWishlistMutations();

  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [viewingProjectId, setViewingProjectId] = useState<number | null>(null);
  const [findingMatchesId, setFindingMatchesId] = useState<number | null>(null);
  
  const { data: projectItems } = useWishlistItems(viewingProjectId || 0);
  const viewingProject = projects?.find(p => p.id === viewingProjectId);

  const projectForm = useForm<InsertWishlistProject>({
    resolver: zodResolver(insertWishlistProjectSchema),
    defaultValues: {
      name: "",
      totalBudget: null,
      deadline: null,
      notes: null,
    },
  });

  const handleCreateProject = async (data: InsertWishlistProject) => {
    try {
      const result = await createProject.mutateAsync(data);

      toast({
        title: "Project created",
        description: `${data.name} has been created successfully`,
      });

      projectForm.reset({
        name: "",
        totalBudget: null,
        deadline: null,
        notes: null,
      });
      setNewProjectDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to create project",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleOpenAddItem = (projectId: number) => {
    setSelectedProjectId(projectId);
    setAddItemDialogOpen(true);
  };

  const handleViewProject = (projectId: number) => {
    setViewingProjectId(projectId);
  };

  const handleBackToProjects = () => {
    setViewingProjectId(null);
  };

  const handleEditItem = (itemId: number) => {
    const item = projectItems?.find(i => i.id === itemId);
    if (item) {
      setEditingItem(item);
      setEditItemDialogOpen(true);
    }
  };

  const handleFindMatches = async (itemId: number) => {
    const item = projectItems?.find(i => i.id === itemId);
    if (!item) return;

    setFindingMatchesId(itemId);
    
    try {
      // Use the combined search function from ai-service
      const searchData = await searchAllSources(item.brand, item.model, item.category);
      
      // Build the saved data
      const internalMatches = searchData.internal_matches || [];
      const externalResults = searchData.external_matches || [];
      
      const savedInternalMatches = internalMatches.map((m: any) => ({
        id: m.id,
        brand: m.brand,
        model: m.model,
        condition: m.condition,
        askingPrice: m.askingPrice,
        location: m.location,
        savedAt: new Date().toISOString()
      }));

      const savedMarketplaceListings = externalResults
        .map((r: any) => ({
          url: r.url,
          title: r.title,
          price: r.price || null,
          condition: r.condition || null,
          source: r.source || 'External',
          isPdf: r.isPdf || false,
          savedAt: new Date().toISOString()
        }));

      const savedSearchResults = {
        query: { brand: item.brand, model: item.model, category: item.category },
        searchedAt: new Date().toISOString(),
        internalCount: internalMatches.length,
        externalCount: externalResults.length,
        externalResults: externalResults.map((r: any) => ({
          url: r.url,
          title: r.title,
          price: r.price,
          condition: r.condition,
          source: r.source,
          isPdf: r.isPdf
        }))
      };

      // Update the item with search results
      await updateWishlistItem.mutateAsync({
        id: itemId,
        data: {
          savedInternalMatches: savedInternalMatches.length > 0 ? savedInternalMatches : null,
          savedMarketplaceListings: savedMarketplaceListings.length > 0 ? savedMarketplaceListings : null,
          savedSearchResults
        } as any
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });

      toast({
        title: "Matches found",
        description: `Found ${internalMatches.length} internal matches and ${externalResults.length} external sources`,
      });
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Failed to find matches",
        variant: "destructive",
      });
    } finally {
      setFindingMatchesId(null);
    }
  };

  // Render project detail view OR project list view
  const renderProjectDetailView = () => (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBackToProjects} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{viewingProject?.name}</h1>
              <p className="text-muted-foreground mt-1">
                {projectItems?.length || 0} equipment specification{(projectItems?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button onClick={() => viewingProjectId && handleOpenAddItem(viewingProjectId)} data-testid="button-add-item">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {!projectItems || projectItems.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No equipment added to this project yet</p>
            <Button onClick={() => viewingProjectId && handleOpenAddItem(viewingProjectId)} variant="outline" data-testid="button-add-first-item">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Equipment
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectItems.map((item) => (
              <WishlistItemCard 
                key={item.id} 
                item={item}
                onFindMatches={(itemId) => {
                  if (findingMatchesId === null) {
                    handleFindMatches(itemId);
                  }
                }}
                onEdit={handleEditItem}
                onDelete={async (itemId) => {
                  try {
                    await deleteWishlistItem.mutateAsync(itemId);
                    toast({
                      title: "Item deleted",
                      description: "Wishlist item has been removed successfully",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Failed to delete item",
                      description: error.message || "An error occurred",
                      variant: "destructive",
                    });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderProjectListView = () => (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Project Wishlists</h1>
            <p className="text-muted-foreground mt-1">
              Plan and budget for your equipment procurement projects
            </p>
          </div>
          <Button onClick={() => setNewProjectDialogOpen(true)} data-testid="button-new-project">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {projectsLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No projects yet</p>
            <Button onClick={() => setNewProjectDialogOpen(true)} variant="outline" data-testid="button-create-first-project">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCardWrapper
                key={project.id}
                project={project}
                onOpenAddItem={handleOpenAddItem}
                onViewProject={handleViewProject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Main return - always render dialogs regardless of view
  return (
    <>
      {viewingProjectId && viewingProject ? renderProjectDetailView() : renderProjectListView()}

      {/* Add Item Dialog - rendered outside conditional to work on both views */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden" data-testid="dialog-add-equipment">
          <DialogHeader>
            <DialogTitle>Add Equipment Specification</DialogTitle>
            <DialogDescription>
              Fill in the details for your equipment specification. This helps us find the best matches and pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedProjectId && (
              <WishlistItemForm
                projectId={selectedProjectId}
                onSuccess={() => setAddItemDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemDialogOpen} onOpenChange={(open) => {
        setEditItemDialogOpen(open);
        if (!open) setEditingItem(null);
      }}>
        <DialogContent className="sm:max-w-2xl max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden" data-testid="dialog-edit-equipment">
          <DialogHeader>
            <DialogTitle>Edit Equipment Specification</DialogTitle>
            <DialogDescription>
              Update the details for your equipment specification.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {editingItem && (
              <WishlistItemForm
                projectId={editingItem.projectId}
                existingItem={editingItem}
                onSuccess={() => {
                  setEditItemDialogOpen(false);
                  setEditingItem(null);
                }}
                onCancel={() => {
                  setEditItemDialogOpen(false);
                  setEditingItem(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
        <DialogContent data-testid="dialog-new-project">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Organize your wishlist items into a named project with a budget.
            </DialogDescription>
          </DialogHeader>

          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="space-y-4 py-4">
              <FormField
                control={projectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Lab Expansion Q1 2025" {...field} data-testid="input-project-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={projectForm.control}
                name="totalBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Budget ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 500000"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        data-testid="input-project-budget"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={projectForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional project notes"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        data-testid="input-project-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewProjectDialogOpen(false)}
                  data-testid="button-cancel-project"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProject.isPending}
                  data-testid="button-create-project"
                >
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Loading overlay for Find Matches */}
      {findingMatchesId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Searching for matches...</span>
          </div>
        </div>
      )}
    </>
  );
}
