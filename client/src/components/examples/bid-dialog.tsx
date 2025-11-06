import { BidDialog } from '../bid-dialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function BidDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Bid Dialog</Button>
      <BidDialog
        open={open}
        onOpenChange={setOpen}
        equipment={{
          brand: "Thermo Fisher",
          model: "TSQ Altis",
          askingPrice: 125000,
        }}
        onSubmit={(amount, notes) => {
          console.log('Bid submitted:', { amount, notes });
        }}
      />
    </div>
  );
}
