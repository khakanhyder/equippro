/**
 * Unit tests for search result classification logic
 * Tests the offer vs documentation differentiation for Task 3
 * Uses the shared classifySearchResult utility for consistency
 */

import { classifySearchResult } from '../utils/result-classifier';

// Test cases
const testCases = [
  // === CASE 1: PDF Manual from OEM ===
  {
    name: "PDF manual from OEM support page",
    input: {
      url: "https://www.agilent.com/support/downloads/manual.pdf",
      title: "Operating Manual for Model 7890",
      description: "Download the complete user manual for the Agilent 7890 GC system."
    },
    expected: "manual"
  },
  
  // === CASE 2: HTML Manual on vendor site ===
  {
    name: "HTML manual on vendor support page",
    input: {
      url: "https://www.thermofisher.com/support/documentation/spectrometer",
      title: "Spectrometer User Guide",
      description: "Complete user guide and operating instructions for the spectrometer."
    },
    expected: "manual"
  },
  
  // === CASE 3: Manual valve listing ===
  {
    name: "Manual valve product listing",
    input: {
      url: "https://www.industrialparts.com/valves/MV-100",
      title: "Manual Valve MV-100 - Stainless Steel",
      description: "High-quality manual valve for industrial applications. Price: $450"
    },
    expected: "offer"
  },
  
  // === CASE 4: Marketplace offer with incidental manual mention ===
  {
    name: "Marketplace offer mentioning manual",
    input: {
      url: "https://www.labx.com/item/hplc-system-12345",
      title: "HPLC System Agilent 1100 - Complete",
      description: "Refurbished HPLC system includes user manual and software. $12,500"
    },
    expected: "offer"
  },
  
  // === CASE 5: Ambiguous title on non-marketplace ===
  {
    name: "Ambiguous 'Manual' title on non-marketplace with doc URL",
    input: {
      url: "https://www.beckman.com/support/manuals/centrifuge-manual.pdf",
      title: "Manual - Beckman Centrifuge",
      description: "Download the complete manual for the Beckman Allegra X-15R centrifuge."
    },
    expected: "manual"
  },
  
  // === CASE 6: Manual pipettor product ===
  {
    name: "Manual pipettor product",
    input: {
      url: "https://www.fishersci.com/shop/products/manual-pipettor",
      title: "Manual Pipettor 100-1000uL",
      description: "Eppendorf manual pipettor for laboratory use. For sale at $199."
    },
    expected: "offer"
  },
  
  // === CASE 7: Datasheet ===
  {
    name: "Datasheet PDF",
    input: {
      url: "https://www.keysight.com/resources/datasheet-oscilloscope.pdf",
      title: "Data Sheet - InfiniiVision 3000T X-Series Oscilloscopes",
      description: "Technical specifications and features."
    },
    expected: "datasheet"
  },
  
  // === CASE 8: Service manual ===
  {
    name: "Service manual",
    input: {
      url: "https://manualslib.com/manuals/hp-5890.html",
      title: "HP 5890 Service Manual",
      description: "Complete service and repair manual for HP 5890 GC."
    },
    expected: "service_doc"
  },
  
  // === CASE 9: eBay listing ===
  {
    name: "eBay listing with user manual title",
    input: {
      url: "https://www.ebay.com/itm/234567890",
      title: "User Manual and Software for Agilent 1100 HPLC",
      description: "Original user manual and installation CD. Buy now for $50."
    },
    expected: "offer"
  },
  
  // === CASE 10: Guide rail product ===
  {
    name: "Guide rail product listing",
    input: {
      url: "https://www.mcmaster.com/linear-motion/guide-rails",
      title: "Linear Guide Rail - 500mm Precision",
      description: "THK linear guide rail for CNC machines. Price: $125"
    },
    expected: "offer"
  },
  
  // === CASE 11: Instructions for use ===
  {
    name: "Instructions for use document",
    input: {
      url: "https://www.roche.com/docs/ifu.pdf",
      title: "Instructions for Use - Cobas e411",
      description: "Complete operating instructions for the immunoassay analyzer."
    },
    expected: "manual"
  },
  
  // === CASE 12: Product brochure ===
  {
    name: "Product brochure",
    input: {
      url: "https://www.waters.com/marketing/brochure.pdf",
      title: "Product Brochure - ACQUITY UPLC System",
      description: "Marketing brochure with features and specifications."
    },
    expected: "brochure"
  },
  
  // === CASE 13: Mirrored PDF on bidding domain (regression) ===
  {
    name: "Manual PDF on bidding/marketplace domain",
    input: {
      url: "https://www.bidspotter.com/manual.pdf",
      title: "Operating Manual for XYZ Equipment",
      description: "Download the user manual for this equipment."
    },
    expected: "offer"
  },
  
  // === CASE 14: Doc domain with offer context ===
  {
    name: "Doc domain with marketplace-like content",
    input: {
      url: "https://manualslib.com/auction/equipment",
      title: "Equipment for Auction - Includes Manual",
      description: "Equipment available for auction. Manual included. $5,000 starting bid."
    },
    expected: "offer"
  }
];

// Run tests
console.log("Running classification tests...\n");
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = classifySearchResult(tc.input);
  const status = result.resultType === tc.expected ? "PASS" : "FAIL";
  
  if (status === "PASS") {
    passed++;
    console.log(`✓ ${tc.name}: ${result.resultType}`);
  } else {
    failed++;
    console.log(`✗ ${tc.name}`);
    console.log(`  Expected: ${tc.expected}`);
    console.log(`  Got: ${result.resultType}`);
    console.log(`  URL: ${tc.input.url}`);
    console.log(`  Title: ${tc.input.title}`);
  }
}

console.log(`\n========================================`);
console.log(`Results: ${passed}/${testCases.length} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed!");
  process.exit(0);
}
