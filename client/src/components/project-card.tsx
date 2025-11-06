import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, Check } from "lucide-react";

interface ProjectCardProps {
  name: string;
  itemCount: number;
  matchedCount: number;
  totalBudget: number;
  spentBudget: number;
  createdDate: string;
  onClick: () => void;
}

export function ProjectCard({
  name,
  itemCount,
  matchedCount,
  totalBudget,
  spentBudget,
  createdDate,
  onClick,
}: ProjectCardProps) {
  const matchPercentage = itemCount > 0 ? Math.round((matchedCount / itemCount) * 100) : 0;
  const budgetPercentage = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;

  return (
    <Card className="cursor-pointer hover-elevate" onClick={onClick} data-testid="card-project">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-card-foreground truncate">{name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{itemCount} items</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Match Status</span>
              <div className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium text-card-foreground">{matchedCount} of {itemCount}</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all" 
                style={{ width: `${matchPercentage}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium text-card-foreground">
                ${spentBudget.toLocaleString()} / ${totalBudget.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${budgetPercentage > 90 ? 'bg-red-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Created {createdDate}</p>
        </div>
      </CardContent>
    </Card>
  );
}
