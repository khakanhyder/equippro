import { EquipmentCard } from '../equipment-card';
import { useState } from 'react';

export default function EquipmentCardExample() {
  const [selected, setSelected] = useState(false);

  return (
    <div className="p-8 max-w-sm">
      <EquipmentCard
        id="1"
        brand="Thermo Fisher"
        model="TSQ Altis"
        condition="used"
        price={125000}
        location="Boston, MA"
        category="Mass Spectrometer"
        priceVariance={-8}
        selected={selected}
        onSelect={(_, checked) => setSelected(checked)}
        onBid={(id) => console.log('Bid on equipment:', id)}
        onClick={(id) => console.log('View equipment:', id)}
      />
    </div>
  );
}
