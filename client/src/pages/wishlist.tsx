import { useState } from "react";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Wishlist() {
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);

  const mockProjects = [
    {
      id: "1",
      name: "Watson Marlow 620Bp",
      itemCount: 1,
      matchedCount: 1,
      totalBudget: 1559,
      spentBudget: 0,
      createdDate: "Jan 10, 2025",
    },
    {
      id: "2",
      name: "Miltenyi Biotec MACSQuant 16",
      itemCount: 1,
      matchedCount: 0,
      totalBudget: 45000,
      spentBudget: 0,
      createdDate: "Jan 12, 2025",
    },
    {
      id: "3",
      name: "Research Lab Setup 2024",
      itemCount: 8,
      matchedCount: 5,
      totalBudget: 200000,
      spentBudget: 125000,
      createdDate: "Dec 1, 2024",
    },
  ];

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProjects.map((project) => (
            <ProjectCard
              key={project.id}
              {...project}
              onClick={() => console.log('View project:', project.id)}
            />
          ))}
        </div>

        <div className="mt-8">
          <Button onClick={() => setAddItemDialogOpen(true)} variant="outline" data-testid="button-add-equipment">
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment to Wishlist
          </Button>
        </div>

        <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-equipment">
            <DialogHeader>
              <DialogTitle>Add Equipment Specification</DialogTitle>
              <DialogDescription>
                Fill in the details for your equipment specification. This helps us find the best matches and pricing.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Input id="brand" placeholder="e.g., Thermo Fisher" data-testid="input-brand" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input id="model" placeholder="e.g., TSQ-9000" data-testid="input-model" />
                </div>
              </div>

              <button className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center mb-6" data-testid="button-search-external">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Search External Sources (PDFs + Google)
              </button>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the equipment requirements, desired features, and any additional details..."
                      rows={4}
                      data-testid="input-description"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Technical Specifications</Label>
                      <Button size="sm" variant="outline" data-testid="button-add-spec">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget">Maximum Budget ($)</Label>
                    <Input id="budget" type="number" placeholder="e.g., 45000" data-testid="input-budget" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Market Price Context</Label>
                      <button className="p-1 hover:bg-muted rounded" data-testid="button-refresh-price">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                    <Button variant="outline" className="w-full text-amber-600 border-amber-200" data-testid="button-get-price-context">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Get Price Context
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select defaultValue="high">
                      <SelectTrigger id="priority" data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">high</SelectItem>
                        <SelectItem value="medium">medium</SelectItem>
                        <SelectItem value="low">low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Images</Label>
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50/50 dark:bg-blue-950/20" data-testid="dropzone-images">
                      <svg className="w-12 h-12 mx-auto mb-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm font-medium text-blue-600 mb-1">Drop images here or click to select</p>
                      <p className="text-xs text-blue-500">PNG, JPG up to 5MB (max 5 files)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Documents</Label>
                    <div className="border-2 border-dashed border-emerald-300 rounded-lg p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20" data-testid="dropzone-documents">
                      <svg className="w-12 h-12 mx-auto mb-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm font-medium text-emerald-600 mb-1">Drop documents here or click to select</p>
                      <p className="text-xs text-emerald-500">PDF, DOC, XLS up to 10MB (max 3 files)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select defaultValue="analytical">
                    <SelectTrigger id="category" data-testid="select-category-wishlist">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analytical">analytical</SelectItem>
                      <SelectItem value="processing">processing</SelectItem>
                      <SelectItem value="testing">testing</SelectItem>
                      <SelectItem value="other">other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>
                  <Select defaultValue="any">
                    <SelectTrigger id="condition" data-testid="select-condition-wishlist">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">any</SelectItem>
                      <SelectItem value="new">new</SelectItem>
                      <SelectItem value="refurbished">refurbished</SelectItem>
                      <SelectItem value="used">used</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" placeholder="e.g., Houston, TX" data-testid="input-location" />
              </div>

              <p className="text-sm text-destructive mt-4">Please fill in required fields: Brand, Model, Location</p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAddItemDialogOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button onClick={() => {
                console.log('Add to Project clicked');
                setAddItemDialogOpen(false);
              }} data-testid="button-add-to-project">
                Add to Project
              </Button>
            </DialogFooter>
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

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input id="project-name" placeholder="e.g., Lab Expansion Q1 2025" data-testid="input-project-name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-budget">Total Budget ($)</Label>
                <Input id="project-budget" type="number" placeholder="e.g., 500000" data-testid="input-project-budget" />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setNewProjectDialogOpen(false)} data-testid="button-cancel-project">
                Cancel
              </Button>
              <Button onClick={() => {
                console.log('Create project clicked');
                setNewProjectDialogOpen(false);
              }} data-testid="button-create-project">
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
