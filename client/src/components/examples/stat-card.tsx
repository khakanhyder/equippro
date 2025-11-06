import { StatCard } from '../stat-card';
import { Target, DollarSign } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="p-8 grid grid-cols-2 gap-4 max-w-3xl">
      <StatCard
        title="Total Active Bids"
        value={12}
        subtitle="All current"
        icon={Target}
        onClick={() => console.log('View bids clicked')}
      />
      <StatCard
        title="Total Bid Value"
        value="$450,000"
        icon={DollarSign}
      />
    </div>
  );
}
