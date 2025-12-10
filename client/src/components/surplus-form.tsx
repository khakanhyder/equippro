import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertEquipmentSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useAiAnalysis } from "@/hooks/use-ai-analysis";
import { X, Plus, Loader2, Upload, Sparkles, ExternalLink, Search, FileText, Check, Building2, Globe, ShoppingCart, BookOpen, FileSpreadsheet, FileCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { searchExternalSources, searchAllSources } from "@/lib/ai-service";
import { PriceContextDisplay } from "@/components/price-context-display";

const internalMatchSchema = z.object({
  id: z.number(),
  brand: z.string(),
  model: z.string(),
  condition: z.string(),
  askingPrice: z.string(),
  location: z.string(),
  savedAt: z.string().optional()
});

const equipmentFormSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  category: z.string().min(1, "Category is required"),
  condition: z.string().min(1, "Condition is required"),
  askingPrice: z.string().min(1, "Price is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  documents: z.array(z.string()).default([]),
  specifications: z.record(z.string()).optional(),
  marketPriceRange: z.any().optional(),
  priceSource: z.string().nullable().optional(),
  priceBreakdown: z.any().optional(),
  savedInternalMatches: z.array(internalMatchSchema).optional(),
  savedMarketplaceListings: z.any().optional(),
  savedSearchResults: z.any().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

interface SpecField {
  key: string;
  value: string;
}

interface SurplusFormProps {
  onSubmit: (data: EquipmentFormData) => void;
  isSubmitting: boolean;
  initialData?: Partial<EquipmentFormData>;
}

export function SurplusForm({ onSubmit, isSubmitting, initialData }: SurplusFormProps) {
  const { toast } = useToast();
  
  // Parse existing saved data from initialData (for editing)
  const parseExistingInternalMatches = () => {
    if (!initialData?.savedInternalMatches) return [];
    try {
      return typeof initialData.savedInternalMatches === 'string' 
        ? JSON.parse(initialData.savedInternalMatches) 
        : initialData.savedInternalMatches;
    } catch { return []; }
  };

  const parseExistingMarketplaceListings = () => {
    if (!(initialData as any)?.savedMarketplaceListings) return [];
    try {
      return typeof (initialData as any).savedMarketplaceListings === 'string'
        ? JSON.parse((initialData as any).savedMarketplaceListings)
        : (initialData as any).savedMarketplaceListings;
    } catch { return []; }
  };

  const parseExistingSearchResults = () => {
    if (!(initialData as any)?.savedSearchResults) return [];
    try {
      const data = typeof (initialData as any).savedSearchResults === 'string'
        ? JSON.parse((initialData as any).savedSearchResults)
        : (initialData as any).savedSearchResults;
      return data?.externalResults || [];
    } catch { return []; }
  };

  const [specs, setSpecs] = useState<SpecField[]>([]);
  const [priceData, setPriceData] = useState<any>(null);
  const [externalResults, setExternalResults] = useState<any[]>(() => parseExistingSearchResults());
  const [internalMatches, setInternalMatches] = useState<any[]>(() => parseExistingInternalMatches());
  const [selectedDocUrls, setSelectedDocUrls] = useState<string[]>([]);
  const [selectedInternalIds, setSelectedInternalIds] = useState<number[]>(() => parseExistingInternalMatches().map((m: any) => m.id));
  const [savedDocuments, setSavedDocuments] = useState<string[]>([]);
  const [savedInternalMatches, setSavedInternalMatches] = useState<any[]>(() => parseExistingInternalMatches());
  const [savedMarketplaceListings, setSavedMarketplaceListings] = useState<any[]>(() => parseExistingMarketplaceListings());
  const [isSearchingSources, setIsSearchingSources] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [isPollingScrape, setIsPollingScrape] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to display result type badge with icon - accessible colors with high contrast
  const getResultTypeBadge = (result: { resultType?: string; isPdf?: boolean; url?: string; title?: string }) => {
    const type = result.resultType || (result.isPdf ? 'pdf_document' : 'web_page');
    
    switch (type) {
      case 'offer':
        return (
          <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 text-[10px] px-1.5 py-0 shrink-0">
            <ShoppingCart className="w-2.5 h-2.5 mr-0.5" />
            Offer
          </Badge>
        );
      case 'manual':
        return (
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700 text-[10px] px-1.5 py-0 shrink-0">
            <BookOpen className="w-2.5 h-2.5 mr-0.5" />
            Manual
          </Badge>
        );
      case 'datasheet':
        return (
          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700 text-[10px] px-1.5 py-0 shrink-0">
            <FileSpreadsheet className="w-2.5 h-2.5 mr-0.5" />
            Datasheet
          </Badge>
        );
      case 'brochure':
        return (
          <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700 text-[10px] px-1.5 py-0 shrink-0">
            <FileCheck className="w-2.5 h-2.5 mr-0.5" />
            Brochure
          </Badge>
        );
      case 'service_doc':
        return (
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 text-[10px] px-1.5 py-0 shrink-0">
            <Wrench className="w-2.5 h-2.5 mr-0.5" />
            Service
          </Badge>
        );
      case 'pdf_document':
        return (
          <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 text-[10px] px-1.5 py-0 shrink-0">
            <FileText className="w-2.5 h-2.5 mr-0.5" />
            PDF
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30 text-[10px] px-1.5 py-0 shrink-0">
            <Globe className="w-2.5 h-2.5 mr-0.5" />
            Web
          </Badge>
        );
    }
  };
  
  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      brand: "",
      model: "",
      category: "",
      condition: "used",
      askingPrice: "",
      location: "",
      description: "",
      images: [],
      documents: [],
      specifications: {},
      marketPriceRange: null,
      priceSource: null,
      priceBreakdown: null,
      savedInternalMatches: [],
      savedMarketplaceListings: [],
      savedSearchResults: null,
    },
  });

  const imageUpload = useImageUpload();
  const { analyzeEquipment } = useAiAnalysis();

  // Reset form and all state when initialData changes (for editing)
  useEffect(() => {
    // Clear new selection state but restore saved data
    setSelectedDocUrls([]);
    setIsSearchingSources(false);
    setIsFetchingPrices(false);
    imageUpload.clearAll();
    
    // Restore saved documents from initial data
    if (initialData?.documents && Array.isArray(initialData.documents)) {
      setSavedDocuments(initialData.documents);
    } else {
      setSavedDocuments([]);
    }
    
    // Restore saved internal matches from initial data
    const savedInternal = parseExistingInternalMatches();
    if (savedInternal && savedInternal.length > 0) {
      setSavedInternalMatches(savedInternal);
      setInternalMatches(savedInternal);
      setSelectedInternalIds(savedInternal.map((m: any) => m.id));
    } else {
      setSavedInternalMatches([]);
      setInternalMatches([]);
      setSelectedInternalIds([]);
    }
    
    // Restore saved marketplace listings from initial data
    const savedMarketplace = parseExistingMarketplaceListings();
    if (savedMarketplace && savedMarketplace.length > 0) {
      setSavedMarketplaceListings(savedMarketplace);
    } else {
      setSavedMarketplaceListings([]);
    }
    
    // Restore saved search results (external results) from initial data
    const savedExternal = parseExistingSearchResults();
    if (savedExternal && savedExternal.length > 0) {
      setExternalResults(savedExternal);
    } else {
      setExternalResults([]);
    }
    
    if (initialData) {
      // Restore priceData state for UI display if we have saved market prices
      if (initialData.marketPriceRange) {
        const savedPriceRange = initialData.marketPriceRange as any;
        setPriceData({
          new_min: savedPriceRange.new_min,
          new_max: savedPriceRange.new_max,
          new_avg: savedPriceRange.new_avg,
          new_count: savedPriceRange.new_count,
          refurbished_min: savedPriceRange.refurbished_min,
          refurbished_max: savedPriceRange.refurbished_max,
          refurbished_avg: savedPriceRange.refurbished_avg,
          refurbished_count: savedPriceRange.refurbished_count,
          used_min: savedPriceRange.used_min,
          used_max: savedPriceRange.used_max,
          used_avg: savedPriceRange.used_avg,
          used_count: savedPriceRange.used_count,
          source: initialData.priceSource,
          breakdown: initialData.priceBreakdown,
          has_marketplace_data: savedPriceRange.has_marketplace_data ?? true,
          totalListingsFound: savedPriceRange.totalListingsFound,
        });
      } else {
        setPriceData(null);
      }
      
      // Sync specs state with initial data
      const initialSpecs = initialData.specifications 
        ? Object.entries(initialData.specifications).map(([key, value]) => ({ key, value }))
        : [];
      setSpecs(initialSpecs);
      
      // Reset form with initial data - MUST explicitly set images/documents to prevent stale uploads
      form.reset({
        brand: initialData.brand || "",
        model: initialData.model || "",
        category: initialData.category || "",
        condition: initialData.condition || "used",
        askingPrice: initialData.askingPrice || "",
        location: initialData.location || "",
        description: initialData.description || "",
        images: Array.isArray(initialData.images) ? [...initialData.images] : [],
        documents: Array.isArray(initialData.documents) ? [...initialData.documents] : [],
        specifications: initialData.specifications || {},
        marketPriceRange: initialData.marketPriceRange || null,
        priceSource: initialData.priceSource || null,
        priceBreakdown: initialData.priceBreakdown || null,
      });
    } else {
      // Clear price data when creating new equipment
      setPriceData(null);
      // Reset to empty form when no initial data (creating new equipment)
      setSpecs([]);
      form.reset({
        brand: "",
        model: "",
        category: "",
        condition: "used",
        askingPrice: "",
        location: "",
        description: "",
        images: [],
        documents: [],
        specifications: {},
        marketPriceRange: null,
        priceSource: null,
        priceBreakdown: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    imageUpload.addFiles(files);
  };

  const handleRemoveExistingImage = (urlToRemove: string) => {
    const currentImages = form.getValues('images') || [];
    const updatedImages = currentImages.filter(url => url !== urlToRemove);
    form.setValue('images', updatedImages);
  };

  const handleUploadImages = async () => {
    const hasPending = imageUpload.queue.some(item => item.status === 'pending' || item.status === 'error');
    
    if (!hasPending) {
      return;
    }
    
    const uploadedUrls = await imageUpload.uploadAll();
    
    if (uploadedUrls.length > 0) {
      const allUrls = [...(form.getValues('images') || []), ...uploadedUrls];
      form.setValue('images', allUrls);
      
      toast({
        title: "Images uploaded",
        description: `${uploadedUrls.length} image(s) uploaded successfully`,
      });
    } else {
      const hasErrors = imageUpload.queue.some(item => item.status === 'error');
      if (hasErrors) {
        toast({
          title: "Upload failed",
          description: "Some images failed to upload. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAiAnalysis = async () => {
    const imageUrls = imageUpload.getUploadedUrls();
    
    if (imageUrls.length === 0) {
      toast({
        title: "No images",
        description: "Please upload at least one image first",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await analyzeEquipment.mutateAsync(imageUrls);
      
      if (result.brand) form.setValue('brand', result.brand);
      if (result.model) form.setValue('model', result.model);
      if (result.category) form.setValue('category', result.category);
      if (result.description) form.setValue('description', result.description);
      
      if (result.specifications && Object.keys(result.specifications).length > 0) {
        const specFields = Object.entries(result.specifications).map(([key, value]) => ({
          key,
          value,
        }));
        setSpecs(specFields);
        form.setValue('specifications', result.specifications);
      }
      
      toast({
        title: "AI Analysis Complete",
        description: `Extracted equipment data with ${result.confidence}% confidence`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message || "Could not analyze images",
        variant: "destructive",
      });
    }
  };

  const startPollingForMarketplaceData = (brand: string, model: string, category: string) => {
    // Clear any existing polling to allow new parameters
    if (pollingIntervalRef.current) {
      console.log('[Polling] Clearing previous interval for new request');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setIsPollingScrape(true);
    let pollCount = 0;
    const maxPolls = 36; // Poll for up to 180 seconds (36 * 5s) - scraping can take 2+ minutes

    const intervalId = setInterval(async () => {
      pollCount++;

      try {
        // Use GET endpoint for read-only polling (doesn't trigger new scrapes)
        const params = new URLSearchParams({ 
          brand, 
          model, 
          category: category || '' 
        });
        const response = await fetch(`/api/price-context/status?${params}`, {
          method: 'GET',
        });

        // 404 means no cache yet, keep polling
        if (response.status === 404) {
          return;
        }

        if (!response.ok) {
          throw new Error('Polling failed');
        }

        const result = await response.json();

        // Guard ALL state updates - only active interval can modify state
        if (pollingIntervalRef.current !== intervalId) {
          console.log('[Polling] Stale callback detected, skipping all updates');
          return;
        }

        // Stop polling if marketplace data is ready or max attempts reached
        if (result.has_marketplace_data || pollCount >= maxPolls) {
          clearInterval(intervalId);
          pollingIntervalRef.current = null;
          setIsPollingScrape(false);

          if (result.has_marketplace_data) {
            // Update prices with real marketplace data
            setPriceData(result);
            // Store complete price context for persistence (excluding large raw listings)
            const priceRange = {
              new_min: result.new_min,
              new_max: result.new_max,
              new_avg: result.new_avg,
              new_count: result.new_count,
              refurbished_min: result.refurbished_min,
              refurbished_max: result.refurbished_max,
              refurbished_avg: result.refurbished_avg,
              refurbished_count: result.refurbished_count,
              used_min: result.used_min,
              used_max: result.used_max,
              used_avg: result.used_avg,
              used_count: result.used_count,
              has_marketplace_data: result.has_marketplace_data,
              totalListingsFound: result.totalListingsFound,
            };
            form.setValue('marketPriceRange', priceRange as any);
            form.setValue('priceSource', result.source || 'Market data');
            form.setValue('priceBreakdown', result.breakdown || null);

            toast({
              title: "Real marketplace data ready!",
              description: result.totalListingsFound 
                ? `Found ${result.totalListingsFound} marketplace listing(s)` 
                : "Prices updated with latest market data",
              duration: 4000,
            });
          } else if (pollCount >= maxPolls) {
            // Timeout reached without marketplace data
            toast({
              title: "Background scrape still processing",
              description: "AI estimate shown. Real marketplace data may take longer. Try refreshing in a moment.",
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling even if one attempt fails
      }
    }, 5000); // Poll every 5 seconds

    pollingIntervalRef.current = intervalId;
  };

  const handleFetchPriceContext = async () => {
    // Guard against duplicate fetches (polling is independent background operation)
    if (isFetchingPrices) {
      console.log('[Fetch Guard] Already fetching, skipping');
      return;
    }

    const brand = form.getValues('brand');
    const model = form.getValues('model');
    const category = form.getValues('category');

    if (!brand || !model) {
      toast({
        title: "Missing information",
        description: "Please provide brand and model first",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingPrices(true);
    try {
      const response = await fetch('/api/price-context/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, model, category, skipCache: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch prices');
      }

      const result = await response.json();
      setPriceData(result);

      // Store complete price context for persistence (excluding large raw listings)
      const priceRange = {
        new_min: result.new_min,
        new_max: result.new_max,
        new_avg: result.new_avg,
        new_count: result.new_count,
        refurbished_min: result.refurbished_min,
        refurbished_max: result.refurbished_max,
        refurbished_avg: result.refurbished_avg,
        refurbished_count: result.refurbished_count,
        used_min: result.used_min,
        used_max: result.used_max,
        used_avg: result.used_avg,
        used_count: result.used_count,
        has_marketplace_data: result.has_marketplace_data,
        totalListingsFound: result.totalListingsFound,
      };

      form.setValue('marketPriceRange', priceRange as any);
      form.setValue('priceSource', result.source || 'Market data');
      form.setValue('priceBreakdown', result.breakdown || null);

      // Reset fetch state - POST is complete
      setIsFetchingPrices(false);

      // Show different toast based on whether scraping is happening in background
      if (result.scraping_in_background) {
        toast({
          title: "AI estimate ready",
          description: "Fetching real marketplace data in background... Prices will update automatically.",
          duration: 5000,
        });
        // Start polling for marketplace data (guard prevents duplicates)
        startPollingForMarketplaceData(brand, model, category);
      } else {
        // Data is immediate (not background) - ensure polling state is clean
        setIsPollingScrape(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }

      if (result.cached) {
        const breakdownText = typeof result.breakdown === 'string' 
          ? result.breakdown 
          : result.source || "Showing previously scraped data";
        
        toast({
          title: result.has_marketplace_data ? "Cached marketplace data" : "Cached AI estimate",
          description: breakdownText,
          duration: 3000,
        });
      } else if (result.totalListingsFound === 0) {
        toast({
          title: "No listings found",
          description: "Try checking eBay or LabX manually for this equipment",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Real market prices found!",
          description: `Found ${result.totalListingsFound} marketplace listing(s)`,
          duration: 3000,
        });
      }
    } catch (error: any) {
      setIsFetchingPrices(false);
      toast({
        title: "Price scraping failed",
        description: error.message || "Could not retrieve market prices. Try checking eBay manually.",
        variant: "destructive",
      });
    }
  };

  const addSpec = () => {
    setSpecs([...specs, { key: "", value: "" }]);
  };

  const removeSpec = (index: number) => {
    const newSpecs = specs.filter((_, i) => i !== index);
    setSpecs(newSpecs);
    updateSpecifications(newSpecs);
  };

  const updateSpec = (index: number, field: 'key' | 'value', value: string) => {
    const newSpecs = [...specs];
    newSpecs[index][field] = value;
    setSpecs(newSpecs);
    updateSpecifications(newSpecs);
  };

  const updateSpecifications = (specFields: SpecField[]) => {
    const specObject = specFields.reduce((acc, spec) => {
      if (spec.key && spec.value) {
        acc[spec.key] = spec.value;
      }
      return acc;
    }, {} as Record<string, string>);
    
    form.setValue('specifications', specObject as any);
  };

  const handleSearchExternalSources = async () => {
    const brand = form.getValues('brand');
    const model = form.getValues('model');
    const category = form.getValues('category');
    
    if (!brand || !model) {
      toast({
        title: "Missing information",
        description: "Please fill in brand and model first",
        variant: "destructive",
      });
      return;
    }

    setIsSearchingSources(true);
    
    try {
      // Search both internal marketplace and external sources
      const result = await searchAllSources(brand, model, category, (initialData as any)?.id);
      const internalFound = result.internal_matches || [];
      const externalFound = result.external_matches || [];
      
      setInternalMatches(internalFound);
      setExternalResults(externalFound);
      // Reset selections for new search
      setSelectedDocUrls([]);
      setSelectedInternalIds([]);
      
      const totalFound = internalFound.length + externalFound.length;
      const internalMsg = internalFound.length > 0 ? `${internalFound.length} in marketplace` : '';
      const externalMsg = externalFound.length > 0 ? `${externalFound.length} external` : '';
      const parts = [internalMsg, externalMsg].filter(Boolean);
      
      toast({
        title: "Search complete",
        description: `Found ${totalFound} result${totalFound !== 1 ? 's' : ''}: ${parts.join(', ')}. Select items to save as references.`,
      });
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Could not search sources",
        variant: "destructive",
      });
      setExternalResults([]);
      setInternalMatches([]);
    } finally {
      setIsSearchingSources(false);
    }
  };

  const toggleDocumentSelection = (url: string) => {
    setSelectedDocUrls(prev => 
      prev.includes(url) 
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
  };

  const toggleInternalSelection = (item: any) => {
    setSelectedInternalIds(prev => {
      if (prev.includes(item.id)) {
        return prev.filter(id => id !== item.id);
      } else {
        return [...prev, item.id];
      }
    });
  };

  const removeSavedDocument = (url: string) => {
    setSavedDocuments(prev => prev.filter(d => d !== url));
  };

  const removeSavedInternalMatch = (id: number) => {
    setSavedInternalMatches(prev => prev.filter(m => m.id !== id));
    // Also remove from internalMatches and selectedInternalIds so it doesn't get re-added on submit
    setInternalMatches(prev => prev.filter(m => m.id !== id));
    setSelectedInternalIds(prev => prev.filter(matchId => matchId !== id));
  };

  const removeSavedMarketplaceListing = (url: string) => {
    setSavedMarketplaceListings(prev => prev.filter(l => l.url !== url));
    // Also remove from externalResults so it doesn't get re-added on submit
    setExternalResults(prev => prev.filter(r => r.url !== url));
  };

  // Sync combined documents to form state when either array changes
  useEffect(() => {
    form.setValue('documents', [...savedDocuments, ...selectedDocUrls] as any);
  }, [savedDocuments, selectedDocUrls]);

  const handleFormSubmit = (data: EquipmentFormData) => {
    // Merge saved documents with newly selected documents before submitting
    const allDocs = [...savedDocuments, ...selectedDocUrls];
    
    // Build selected internal matches data to save (only new selections not already saved)
    const savedInternalIds = new Set(savedInternalMatches.map(m => m.id));
    const selectedInternalData = internalMatches
      .filter(m => selectedInternalIds.includes(m.id) && !savedInternalIds.has(m.id))
      .map(m => ({
        id: m.id,
        brand: m.brand,
        model: m.model,
        condition: m.condition,
        askingPrice: m.askingPrice,
        location: m.location,
        savedAt: new Date().toISOString()
      }));
    
    // Combine saved and newly selected internal matches (no duplicates due to filter above)
    const allInternalMatches = [...savedInternalMatches, ...selectedInternalData];
    
    // Build new marketplace listings from external results (sources with prices)
    const newMarketplaceListings = externalResults
      .filter(r => r.price || r.condition)
      .map(r => ({
        url: r.url,
        title: r.title,
        price: r.price,
        condition: r.condition,
        source: r.source,
        savedAt: new Date().toISOString()
      }));
    
    // Combine saved and new marketplace listings (dedupe by URL)
    const existingUrls = new Set(savedMarketplaceListings.map(l => l.url));
    const uniqueNewListings = newMarketplaceListings.filter(l => !existingUrls.has(l.url));
    const allMarketplaceListings = [...savedMarketplaceListings, ...uniqueNewListings];
    
    // Save all search results for data enrichment
    const searchResults = {
      query: { brand: data.brand, model: data.model, category: data.category },
      searchedAt: new Date().toISOString(),
      internalCount: internalMatches.length,
      externalCount: externalResults.length,
      externalResults: externalResults.map(r => ({
        url: r.url,
        title: r.title,
        price: r.price,
        condition: r.condition,
        source: r.source,
        isPdf: r.isPdf
      }))
    };
    
    onSubmit({ 
      ...data, 
      documents: allDocs,
      savedInternalMatches: allInternalMatches as any,
      savedMarketplaceListings: allMarketplaceListings.length > 0 ? allMarketplaceListings : undefined,
      savedSearchResults: externalResults.length > 0 ? searchResults : undefined
    });
  };

  const formatPrice = (value: number | null) => {
    if (value === null) return 'N/A';
    return `€${value.toLocaleString()}`;
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand *</Label>
          <Input
            id="brand"
            {...form.register('brand')}
            placeholder="e.g., Thermo Fisher"
            data-testid="input-surplus-brand"
          />
          {form.formState.errors.brand && (
            <p className="text-sm text-destructive">{form.formState.errors.brand.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="model">Model *</Label>
          <Input
            id="model"
            {...form.register('model')}
            placeholder="e.g., TSQ-9000"
            data-testid="input-surplus-model"
          />
          {form.formState.errors.model && (
            <p className="text-sm text-destructive">{form.formState.errors.model.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="askingPrice">Asking Price (€) *</Label>
          <Input
            id="askingPrice"
            type="number"
            {...form.register('askingPrice')}
            placeholder="e.g., 45000"
            data-testid="input-surplus-price"
          />
          {form.formState.errors.askingPrice && (
            <p className="text-sm text-destructive">{form.formState.errors.askingPrice.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            {...form.register('category')}
            placeholder="e.g., Mass Spectrometer"
            data-testid="input-surplus-category"
          />
          {form.formState.errors.category && (
            <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="condition">Condition *</Label>
          <Select
            value={form.watch('condition')}
            onValueChange={(value) => form.setValue('condition', value)}
          >
            <SelectTrigger id="condition" data-testid="select-surplus-condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="refurbished">Refurbished</SelectItem>
              <SelectItem value="used">Used</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location *</Label>
        <Input
          id="location"
          {...form.register('location')}
          placeholder="e.g., Houston, TX"
          data-testid="input-surplus-location"
        />
        {form.formState.errors.location && (
          <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          placeholder="Describe the equipment condition, features, and any additional details..."
          rows={4}
          data-testid="input-surplus-description"
        />
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Technical Specifications</Label>
            <Button type="button" size="sm" variant="outline" onClick={addSpec} data-testid="button-add-spec-surplus">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {specs.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Name (e.g., Power)"
                  value={spec.key}
                  onChange={(e) => updateSpec(index, 'key', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value (e.g., 500W)"
                  value={spec.value}
                  onChange={(e) => updateSpec(index, 'value', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeSpec(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Equipment Images</Label>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover-elevate" data-testid="dropzone-images-surplus">
                <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Click to select images</p>
              </div>
            </label>
            
            {/* Display existing uploaded images */}
            {form.watch('images')?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploaded Images</p>
                <div className="grid grid-cols-3 gap-2">
                  {form.watch('images').map((url: string, index: number) => (
                    <div key={url} className="relative group">
                      <img 
                        src={url} 
                        alt={`Equipment ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveExistingImage(url)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Display new pending/uploading images */}
            {imageUpload.queue.length > 0 && (
              <div className="space-y-2">
                {imageUpload.queue.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                    <img src={item.previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.file.name}</p>
                      {item.status === 'uploading' && (
                        <>
                          <p className="text-xs text-muted-foreground mb-1">Uploading...</p>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.progress}% uploaded</p>
                        </>
                      )}
                      {item.status === 'pending' && (
                        <p className="text-xs text-muted-foreground">Ready to upload</p>
                      )}
                      {item.status === 'complete' && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Uploaded</p>
                      )}
                      {item.status === 'error' && (
                        <p className="text-xs text-destructive">{item.error || 'Upload failed'}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => imageUpload.removeItem(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleUploadImages}
                    disabled={imageUpload.queue.every(i => i.status === 'complete')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload All
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiAnalysis}
                    disabled={analyzeEquipment.isPending || imageUpload.getUploadedUrls().length === 0}
                    data-testid="button-ai-analyze-surplus"
                  >
                    {analyzeEquipment.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    AI Analysis
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Market Price Context</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleFetchPriceContext}
              disabled={isFetchingPrices}
              data-testid="button-get-price-context-surplus"
            >
              {isFetchingPrices ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Get Market Prices
            </Button>
          </div>
          
          {priceData && (
            <PriceContextDisplay 
              priceData={priceData} 
              isPollingScrape={isPollingScrape}
              testIdPrefix="surplus-"
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Search Marketplace & Sources</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSearchExternalSources}
              disabled={isSearchingSources}
              data-testid="button-search-sources-surplus"
            >
              {isSearchingSources ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search All Sources
            </Button>
          </div>
          
          {/* Show saved internal matches */}
          {savedInternalMatches.length > 0 && (
            <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/30 space-y-2" data-testid="saved-internal-matches">
              <p className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Saved Marketplace References ({savedInternalMatches.length})
              </p>
              <div className="space-y-1">
                {savedInternalMatches.map((match: any, index: number) => (
                  <div key={match.id || index} className="flex items-center gap-2 text-sm group">
                    <Check className="w-3 h-3 text-blue-600 shrink-0" />
                    <span className="truncate flex-1">
                      {match.brand} {match.model} - €{parseFloat(match.askingPrice).toLocaleString()} ({match.condition})
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {match.location}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeSavedInternalMatch(match.id)}
                      data-testid={`button-remove-internal-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show saved marketplace listings (external price sources) */}
          {savedMarketplaceListings.length > 0 && (
            <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/30 space-y-2" data-testid="saved-marketplace-listings">
              <p className="text-sm font-medium flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-green-600" />
                Saved Price References ({savedMarketplaceListings.length})
              </p>
              <div className="space-y-1">
                {savedMarketplaceListings.map((listing: any, index: number) => (
                  <div key={listing.url || index} className="flex items-center gap-2 text-sm group">
                    <Check className="w-3 h-3 text-green-600 shrink-0" />
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate flex-1 text-primary hover:underline"
                      data-testid={`link-saved-listing-${index}`}
                    >
                      {listing.title || listing.url}
                    </a>
                    {listing.price && (
                      <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                        {listing.price}
                      </Badge>
                    )}
                    {listing.condition && (
                      <Badge variant="outline" className="text-xs">
                        {listing.condition}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeSavedMarketplaceListing(listing.url)}
                      data-testid={`button-remove-listing-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show saved documents */}
          {savedDocuments.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2" data-testid="saved-documents">
              <p className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Saved Documents ({savedDocuments.length})
              </p>
              <div className="space-y-1">
                {savedDocuments.map((url, index) => {
                  const displayName = url.includes('.pdf') 
                    ? url.split('/').pop() || url 
                    : new URL(url).hostname + '...' + url.slice(-20);
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm group">
                      <Check className="w-3 h-3 text-green-600 shrink-0" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate flex-1 text-primary hover:underline"
                        data-testid={`link-saved-doc-${index}`}
                      >
                        {displayName}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeSavedDocument(url)}
                        data-testid={`button-remove-doc-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parallel layout for internal matches and external sources */}
          {(internalMatches.length > 0 || externalResults.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Internal Matches Column */}
              <div className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-2 overflow-hidden" data-testid="internal-matches">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">Internal Matches ({internalMatches.length})</span>
                  {selectedInternalIds.length > 0 && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {selectedInternalIds.length} selected
                    </Badge>
                  )}
                </p>
                {internalMatches.length > 0 ? (
                  <div className="space-y-1 max-h-72 overflow-y-auto overflow-x-hidden">
                    {internalMatches.map((match: any, index: number) => {
                      const isSelected = selectedInternalIds.includes(match.id);
                      return (
                        <div
                          key={match.id}
                          className={`flex items-center gap-2 text-sm p-2 rounded cursor-pointer transition-colors overflow-hidden ${
                            isSelected ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleInternalSelection(match)}
                          data-testid={`select-internal-match-${index}`}
                        >
                          <div className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-muted-foreground'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-xs">{match.brand} {match.model}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              €{parseFloat(match.askingPrice).toLocaleString()} · {match.condition} · {match.location}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No internal matches found</p>
                )}
              </div>

              {/* External Sources Column */}
              <div className="border rounded-lg p-3 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2 overflow-hidden">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">External Sources ({externalResults.length})</span>
                  {selectedDocUrls.length > 0 && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {selectedDocUrls.length} selected
                    </Badge>
                  )}
                </p>
                {externalResults.length > 0 ? (
                  <div className="space-y-1 max-h-72 overflow-y-auto overflow-x-hidden">
                    {externalResults.map((source: any, index: number) => {
                      const isSelected = selectedDocUrls.includes(source.url);
                      const displayName = source.title || (source.url.includes('.pdf') 
                        ? source.url.split('/').pop() 
                        : source.url);
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-sm p-2 rounded cursor-pointer transition-colors overflow-hidden ${
                            isSelected ? 'bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleDocumentSelection(source.url)}
                          data-testid={`select-external-source-${index}`}
                        >
                          <div className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-muted-foreground'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          {getResultTypeBadge(source)}
                          <span className="truncate flex-1 text-xs">{displayName}</span>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No external sources found</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} data-testid="button-save-draft">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save as Draft'
          )}
        </Button>
      </div>
    </form>
  );
}
