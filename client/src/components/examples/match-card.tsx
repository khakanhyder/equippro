import { MatchCard } from '../match-card';

export default function MatchCardExample() {
  return (
    <div className="p-8 max-w-2xl">
      <MatchCard
        wishlistItem="Watson Marlow 620Bp"
        matchedEquipment="Watson Marlow 620Bp - Analytical"
        confidence="high"
        matchType="exact"
        explanation="Same brand and model, similar specs. Excellent match for your requirements."
        price={1039}
        budget={1559}
        daysAgo={2}
        onViewDetails={() => console.log('View details')}
        onPlaceBid={() => console.log('Place bid')}
        onDismiss={() => console.log('Dismiss')}
      />
    </div>
  );
}
