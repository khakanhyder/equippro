import { PriceBar } from '../price-bar';

export default function PriceBarExample() {
  return (
    <div className="p-8 max-w-2xl">
      <PriceBar
        usedMin={80000}
        usedMax={120000}
        refurbishedMax={150000}
        newMax={180000}
        askingPrice={125000}
      />
    </div>
  );
}
