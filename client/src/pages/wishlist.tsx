import { useState } from "react";
import { useProjects, useProjectMutations, useWishlistItems } from "@/hooks/use-wishlist";
import { ProjectCardWrapper } from "@/components/project-card-wrapper";
import { WishlistItemForm } from "@/components/wishlist-item-form";
import { WishlistItemCard } from "@/components/wishlist-item-card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Package } from "lucide-react";
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
import { insertWishlistProjectSchema, type InsertWishlistProject } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Wishlist() {
  const currentUser = "demo-user";
  const { toast } = useToast();
  const { data: projects, isLoading: projectsLoading } = useProjects(currentUser);
  const { createProject } = useProjectMutations();

  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [viewingProjectId, setViewingProjectId] = useState<number | null>(null);
  
  const { data: projectItems } = useWishlistItems(viewingProjectId || 0);
  const viewingProject = projects?.find(p => p.id === viewingProjectId);

  const projectForm = useForm<InsertWishlistProject>({
    resolver: zodResolver(insertWishlistProjectSchema),
    defaultValues: {
      name: "",
      createdBy: currentUser,
      totalBudget: null,
      deadline: null,
      notes: null,
    },
  });

  const handleCreateProject = async (data: InsertWishlistProject) => {
    try {
      const result = await createProject.mutateAsync({
        ...data,
        createdBy: currentUser,
      });

      toast({
        title: "Project created",
        description: `${data.name} has been created successfully`,
      });

      projectForm.reset({
        name: "",
        createdBy: currentUser,
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

  // Show project detail view if viewing a project
  if (viewingProjectId && viewingProject) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBackToProjects} data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{viewingProject.name}</h1>
                <p className="text-muted-foreground mt-1">
                  {projectItems?.length || 0} equipment specification{(projectItems?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button onClick={() => handleOpenAddItem(viewingProjectId)} data-testid="button-add-item">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {!projectItems || projectItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No equipment added to this project yet</p>
              <Button onClick={() => handleOpenAddItem(viewingProjectId)} variant="outline" data-testid="button-add-first-item">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Equipment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {projectItems.map((item) => (
                <WishlistItemCard 
                  key={item.id} 
                  item={item}
                  onFindMatches={(itemId) => {
                    console.log('Find matches for item:', itemId);
                  }}
                  onEdit={(itemId) => {
                    console.log('Edit item:', itemId);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
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

        <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-equipment">
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
                  createdBy={currentUser}
                  onSuccess={() => setAddItemDialogOpen(false)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

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
      </div>
    </div>
  );
}
