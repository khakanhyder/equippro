import { EquipmentDetailModal } from '../equipment-detail-modal';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function EquipmentDetailModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Equipment Detail</Button>
      <EquipmentDetailModal
        open={open}
        onOpenChange={setOpen}
        equipment={{
          id: "1",
          brand: "Thermo Fisher",
          model: "TSQ Altis",
          condition: "used",
          price: 125000,
          location: "Boston, MA",
          category: "Mass Spectrometer",
          description: "High-performance triple quadrupole mass spectrometer for quantitative analysis. Excellent condition with recent calibration and maintenance. Includes software license and documentation.",
          specifications: {
            "Power": "500W",
            "Weight": "75 kg",
            "Dimensions": "60 x 50 x 45 cm",
            "Voltage": "220V",
          },
        }}
        onBid={(id) => console.log('Bid on:', id)}
      />
    </div>
  );
}
