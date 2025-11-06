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
          <DialogContent className="sm:max-w-2xl" data-testid="dialog-add-equipment">
            <DialogHeader>
              <DialogTitle>Add Equipment Specification</DialogTitle>
              <DialogDescription>
                Fill in the details for your equipment specification. This helps us find the best matches and pricing.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Input id="brand" placeholder="e.g., Thermo Fisher" data-testid="input-brand" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input id="model" placeholder="e.g., TSQ-9000" data-testid="input-model" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the equipment requirements, desired features, and any additional details..."
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Maximum Budget ($) *</Label>
                  <Input id="budget" type="number" placeholder="e.g., 45000" data-testid="input-budget" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger id="priority" data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (urgent need)</SelectItem>
                      <SelectItem value="medium">Medium (planned purchase)</SelectItem>
                      <SelectItem value="low">Low (nice to have)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select defaultValue="analytical">
                    <SelectTrigger id="category" data-testid="select-category-wishlist">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analytical">Analytical</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">Preferred Condition</Label>
                  <Select defaultValue="any">
                    <SelectTrigger id="condition" data-testid="select-condition-wishlist">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any condition</SelectItem>
                      <SelectItem value="new">New only</SelectItem>
                      <SelectItem value="refurbished">Refurbished only</SelectItem>
                      <SelectItem value="used">Used only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" placeholder="e.g., Houston, TX" data-testid="input-location" />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAddItemDialogOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button onClick={() => {
                console.log('Save & Find Matches clicked');
                setAddItemDialogOpen(false);
              }} data-testid="button-save-find-matches">
                <Search className="w-4 h-4 mr-2" />
                Save & Find Matches
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
