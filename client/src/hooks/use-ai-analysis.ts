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
  refurbished_min: number | null;
  refurbished_max: number | null;
  used_min: number | null;
  used_max: number | null;
  source: string;
  breakdown: string;
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
      const res = await apiRequest('POST', '/api/ai/price-estimate', params);
      return res.json() as Promise<PriceEstimate>;
    },
  });

  return {
    fetchPriceContext,
  };
}
