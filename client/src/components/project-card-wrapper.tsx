import { useWishlistItems } from "@/hooks/use-wishlist";
import { ProjectCard } from "@/components/project-card";
import type { WishlistProject } from "@shared/schema";

interface ProjectCardWrapperProps {
  project: WishlistProject;
  onOpenAddItem: (projectId: number) => void;
  onViewProject: (projectId: number) => void;
}

export function ProjectCardWrapper({ project, onOpenAddItem, onViewProject }: ProjectCardWrapperProps) {
  const { data: items } = useWishlistItems(project.id);
  const itemCount = items?.length || 0;
  const matchedCount = items?.filter(item => item.status === 'found').length || 0;

  return (
    <ProjectCard
      name={project.name}
      itemCount={itemCount}
      matchedCount={matchedCount}
      totalBudget={parseFloat(project.totalBudget || "0")}
      spentBudget={0}
      createdDate={new Date(project.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}
      onClick={() => onViewProject(project.id)}
      onAddItem={() => onOpenAddItem(project.id)}
    />
  );
}
