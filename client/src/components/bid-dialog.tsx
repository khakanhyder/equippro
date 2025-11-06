import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: {
    brand: string;
    model: string;
    askingPrice: number;
  };
  onSubmit: (bidAmount: number, notes: string) => void;
}

export function BidDialog({ open, onOpenChange, equipment, onSubmit }: BidDialogProps) {
  const [bidAmount, setBidAmount] = useState(equipment.askingPrice.toString());
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onSubmit(parseFloat(bidAmount), notes);
    setBidAmount(equipment.askingPrice.toString());
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-place-bid">
        <DialogHeader>
          <DialogTitle>Place Individual Bid</DialogTitle>
          <DialogDescription>
            Submit your bid for this equipment. Bids are valid for 30 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-sm text-card-foreground">
              {equipment.brand} {equipment.model}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Asking Price: <span className="font-semibold">${equipment.askingPrice.toLocaleString()}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bid-amount">Your Bid Amount ($) *</Label>
            <Input
              id="bid-amount"
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="e.g., 125000"
              data-testid="input-bid-amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or conditions for your bid..."
              rows={3}
              data-testid="input-bid-notes"
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            Your bid will be valid for 30 days from submission.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-bid">
            Cancel
          </Button>
          <Button onClick={handleSubmit} data-testid="button-submit-bid">
            Submit Bid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
