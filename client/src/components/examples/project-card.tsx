import { ProjectCard } from '../project-card';

export default function ProjectCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <ProjectCard
        name="Lab Expansion Q1 2025"
        itemCount={8}
        matchedCount={5}
        totalBudget={500000}
        spentBudget={325000}
        createdDate="Jan 15, 2025"
        onClick={() => console.log('Project clicked')}
      />
    </div>
  );
}
