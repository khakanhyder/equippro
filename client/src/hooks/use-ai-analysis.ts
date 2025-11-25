import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface AiAnalysisResult {
  brand: string | null;
  model: string | null;
  category: string | null;
  description: string | null;
  specifications: Record<string, string>;
  confidence: number;
}

export interface PriceEstimate {
  new_min: number | null;
  new_max: number | null;
  new_avg?: number | null;
  new_count?: number;
  refurbished_min: number | null;
  refurbished_max: number | null;
  refurbished_avg?: number | null;
  refurbished_count?: number;
  used_min: number | null;
  used_max: number | null;
  used_avg?: number | null;
  used_count?: number;
  source: string;
  breakdown: string;
  has_marketplace_data?: boolean;
  scraping_in_background?: boolean;
  marketplace_listings?: Array<{
    url: string;
    price: number;
    source: string;
    condition: string;
    title?: string;
  }>;
}

export function useAiAnalysis() {
  const analyzeEquipment = useMutation({
    mutationFn: async (imageUrls: string[]) => {
      const res = await apiRequest('POST', '/api/ai/analyze-equipment', { imageUrls });
      return res.json() as Promise<AiAnalysisResult>;
    },
  });

  return {
    analyzeEquipment,
  };
}

export function usePriceContext() {
  const fetchPriceContext = useMutation({
    mutationFn: async (params: {
      brand: string;
      model: string;
      category: string;
      condition: string;
    }) => {
      const res = await apiRequest('POST', '/api/price-context/scrape', params);
      return res.json() as Promise<PriceEstimate>;
    },
  });

  return {
    fetchPriceContext,
  };
}
