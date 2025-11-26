import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWishlistItemSchema, type InsertWishlistItem } from "@shared/schema";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useWishlistMutations } from "@/hooks/use-wishlist";
import { usePriceContext } from "@/hooks/use-ai-analysis";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Sparkles, Upload, FileText, BookOpen, ExternalLink, X, BookmarkPlus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PriceEstimate } from "@/hooks/use-ai-analysis";
import { analyzeEquipmentImages, searchExternalSources } from "@/lib/ai-service";
import { uploadFiles, validateImageFiles, validateDocumentFiles } from "@/lib/file-upload";
import { useImageUpload } from "@/hooks/use-image-upload";

interface WishlistItemFormProps {
  projectId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface AiSuggestion {
  value: string;
  confidence: number;
}

interface AiSuggestions {
  brand: AiSuggestion | null;
  model: AiSuggestion | null;
  category: AiSuggestion | null;
  specifications: Array<{ name: string; value: string; unit?: string }>;
}

export function WishlistItemForm({ projectId, onSuccess, onCancel }: WishlistItemFormProps) {
  const { toast } = useToast();
  const { createWishlistItem } = useWishlistMutations();
  const { fetchPriceContext } = usePriceContext();
  const imageUpload = useImageUpload();

  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([]);
  const [priceData, setPriceData] = useState<PriceEstimate | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions>({
    brand: null,
    model: null,
    category: null,
    specifications: [],
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [externalResults, setExternalResults] = useState<Array<{ url: string; title: string; description?: string }>>([]);
  const [isPollingScrape, setIsPollingScrape] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<InsertWishlistItem>({
    resolver: zodResolver(insertWishlistItemSchema),
    defaultValues: {
      projectId,
      brand: "",
      model: "",
      category: "analytical",
      preferredCondition: "any",
      location: "",
      maxBudget: "0",
      priority: "high",
      requiredSpecs: null,
      notes: "",
      imageUrls: [],
      documentUrls: [],
      status: "active",
      marketPriceRange: null,
      priceSource: null,
      priceBreakdown: null,
    },
  });

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const addSpec = () => {
    setSpecs([...specs, { key: "", value: "" }]);
  };

  const removeSpec = (index: number) => {
    const newSpecs = specs.filter((_, i) => i !== index);
    setSpecs(newSpecs);
    updateSpecsInForm(newSpecs);
  };

  const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...specs];
    newSpecs[index][field] = val;
    setSpecs(newSpecs);
    updateSpecsInForm(newSpecs);
  };

  const updateSpecsInForm = (newSpecs: Array<{ key: string; value: string }>) => {
    const specsObject = newSpecs
      .filter(s => s.key && s.value)
      .reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    form.setValue('requiredSpecs', Object.keys(specsObject).length > 0 ? specsObject : null);
  };

  const acceptSuggestion = (field: 'brand' | 'model' | 'category') => {
    const suggestion = aiSuggestions[field];
    if (suggestion) {
      form.setValue(field, suggestion.value);
      setAiSuggestions(prev => ({ ...prev, [field]: null }));
    }
  };

  const ignoreSuggestion = (field: 'brand' | 'model' | 'category') => {
    setAiSuggestions(prev => ({ ...prev, [field]: null }));
  };

  const acceptSpec = (spec: { name: string; value: string; unit?: string }) => {
    const specValue = spec.unit ? `${spec.value} ${spec.unit}` : spec.value;
    const newSpecs = [...specs, { key: spec.name, value: specValue }];
    setSpecs(newSpecs);
    updateSpecsInForm(newSpecs);
    setAiSuggestions(prev => ({
      ...prev,
      specifications: prev.specifications.filter(s => s.name !== spec.name),
    }));
  };

  const ignoreSpec = (specName: string) => {
    setAiSuggestions(prev => ({
      ...prev,
      specifications: prev.specifications.filter(s => s.name !== specName),
    }));
  };

  const handleAiAnalyze = async () => {
    const imageUrls = form.getValues('imageUrls');
    if (!imageUrls?.length) {
      toast({ title: "No images", description: "Please upload images first", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeEquipmentImages(
        imageUrls,
        form.getValues('brand') || undefined,
        form.getValues('model') || undefined
      );

      const confidence = 0.85;
      if (result.brand) setAiSuggestions(prev => ({ ...prev, brand: { value: result.brand!, confidence } }));
      if (result.model) setAiSuggestions(prev => ({ ...prev, model: { value: result.model!, confidence } }));
      if (result.category) setAiSuggestions(prev => ({ ...prev, category: { value: result.category!, confidence } }));
      if (result.description) form.setValue('notes', result.description);
      if (result.specifications?.length) setAiSuggestions(prev => ({ ...prev, specifications: result.specifications! }));

      toast({ title: "Analysis complete", description: `Found ${result.specifications?.length || 0} specifications` });
    } catch (error: any) {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearchExternal = async () => {
    const brand = form.getValues('brand');
    const model = form.getValues('model');

    if (!brand || !model) {
      toast({ title: "Missing information", description: "Please provide brand and model first", variant: "destructive" });
      return;
    }

    setIsSearchingExternal(true);
    try {
      const result = await searchExternalSources(brand, model);
      const matches = result.external_matches || [];
      setExternalResults(matches);
      toast({
        title: "Search complete",
        description: `Found ${matches.length} relevant source${matches.length !== 1 ? 's' : ''}`,
      });
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
      setExternalResults([]);
    } finally {
      setIsSearchingExternal(false);
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
    const maxPolls = 18; // Poll for up to 90 seconds (18 * 5s) to match scraping timeout

    const intervalId = setInterval(async () => {
      pollCount++;
      console.log(`[WishlistPoll] Poll #${pollCount}/${maxPolls} for ${brand} ${model}`);

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
          console.log('[WishlistPoll] No cache yet, continuing...');
          return;
        }

        if (!response.ok) {
          throw new Error('Polling failed');
        }

        const result = await response.json();
        console.log(`[WishlistPoll] Response: has_marketplace_data=${result.has_marketplace_data}`);

        // Guard ALL state updates - only active interval can modify state
        if (pollingIntervalRef.current !== intervalId) {
          console.log('[WishlistPoll] Stale callback detected, skipping all updates');
          return;
        }

        // Stop polling if marketplace data is ready or max attempts reached
        if (result.has_marketplace_data || pollCount >= maxPolls) {
          console.log(`[WishlistPoll] Stopping: has_data=${result.has_marketplace_data}, polls=${pollCount}`);
          clearInterval(intervalId);
          pollingIntervalRef.current = null;
          setIsPollingScrape(false);

          if (result.has_marketplace_data) {
            // Update prices with real marketplace data
            setPriceData(result);
            const priceRange = {
              new_min: result.new_min,
              new_max: result.new_max,
              refurbished_min: result.refurbished_min,
              refurbished_max: result.refurbished_max,
              used_min: result.used_min,
              used_max: result.used_max,
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

  const handleGetPriceContext = async () => {
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
        body: JSON.stringify({ brand, model, category }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch prices');
      }

      const result = await response.json();
      setPriceData(result);

      const priceRange = {
        new_min: result.new_min,
        new_max: result.new_max,
        refurbished_min: result.refurbished_min,
        refurbished_max: result.refurbished_max,
        used_min: result.used_min,
        used_max: result.used_max,
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
        // Handle breakdown which might be a string or object
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const error = validateImageFiles(files);
    if (error) {
      toast({ title: "Invalid files", description: error, variant: "destructive" });
      return;
    }

    imageUpload.addFiles(files);
  };

  const handleUploadImages = async () => {
    const hasPending = imageUpload.queue.some(item => item.status === 'pending' || item.status === 'error');
    
    if (!hasPending) {
      return;
    }
    
    const uploadedUrls = await imageUpload.uploadAll();
    
    if (uploadedUrls.length > 0) {
      const allUrls = [...(form.getValues('imageUrls') || []), ...uploadedUrls];
      form.setValue('imageUrls', allUrls);
      
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

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const error = validateDocumentFiles(files);
    if (error) {
      toast({ title: "Invalid files", description: error, variant: "destructive" });
      return;
    }

    setIsUploadingDocs(true);
    try {
      setDocumentFiles(files);
      const urls = await uploadFiles(files, 'document');
      form.setValue('documentUrls', urls);
      toast({ title: "Documents uploaded", description: `${files.length} document${files.length !== 1 ? 's' : ''} uploaded` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setDocumentFiles([]);
    } finally {
      setIsUploadingDocs(false);
    }
  };

  const onSubmit = async (data: InsertWishlistItem) => {
    try {
      await createWishlistItem.mutateAsync(data);

      toast({
        title: "Wishlist item created",
        description: "Your equipment specification has been added",
      });

      form.reset({
        projectId,
        brand: "",
        model: "",
        category: "analytical",
        preferredCondition: "any",
        location: "",
        maxBudget: "0",
        priority: "high",
        requiredSpecs: null,
        notes: "",
        imageUrls: [],
        documentUrls: [],
        status: "active",
        marketPriceRange: null,
        priceSource: null,
        priceBreakdown: null,
      });
      setSpecs([]);
      setPriceData(null);
      imageUpload.clearAll();
      setDocumentFiles([]);

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Failed to create wishlist item",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Fill in the details for your equipment specification. This helps us find the best matches and pricing.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">
                    Brand <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Thermo Fisher" {...field} data-testid="input-brand" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {aiSuggestions.brand && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    AI Suggestion ({Math.round(aiSuggestions.brand.confidence * 100)}% confidence)
                  </span>
                </div>
                <p className="text-sm mb-2">{aiSuggestions.brand.value}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptSuggestion('brand')} data-testid="button-accept-brand">Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => ignoreSuggestion('brand')} data-testid="button-ignore-brand">Ignore</Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">
                    Model <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., TSQ-9000" {...field} data-testid="input-model" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {aiSuggestions.model && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    AI Suggestion ({Math.round(aiSuggestions.model.confidence * 100)}% confidence)
                  </span>
                </div>
                <p className="text-sm mb-2">{aiSuggestions.model.value}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptSuggestion('model')} data-testid="button-accept-model">Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => ignoreSuggestion('model')} data-testid="button-ignore-model">Ignore</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleSearchExternal}
          disabled={!form.watch('brand') || !form.watch('model') || isSearchingExternal}
          className="w-full text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-search-external"
        >
          <BookOpen className={`w-4 h-4 mr-2 ${isSearchingExternal ? 'animate-pulse' : ''}`} />
          {isSearchingExternal ? 'Searching external sources...' : 'Search External Sources (PDFs + Google)'}
        </Button>

        {externalResults.length > 0 && (
          <div className="p-4 border rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
            <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              Found {externalResults.length} External Source{externalResults.length !== 1 ? 's' : ''}
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {externalResults.map((result, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-background rounded-lg border hover-elevate"
                  data-testid={`card-external-result-${idx}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-foreground">{result.title}</div>
                  </div>
                  
                  {result.description && (
                    <div className="text-sm text-muted-foreground mb-2 line-clamp-2">{result.description}</div>
                  )}
                  
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block mb-3"
                    data-testid={`link-external-url-${idx}`}
                  >
                    {result.url}
                  </a>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toast({
                          title: "Analyzing source",
                          description: `Analyzing details from ${result.title}...`,
                          duration: 3000,
                        });
                      }}
                      className="text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-400"
                      data-testid={`button-analyze-${idx}`}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Analyze
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toast({
                          title: "Source saved",
                          description: `Saved ${result.title} for reference`,
                          duration: 3000,
                        });
                      }}
                      className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400"
                      data-testid={`button-save-${idx}`}
                    >
                      <BookmarkPlus className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the equipment requirements, desired features, and any additional details..."
                    rows={6}
                    {...field}
                    value={field.value || ""}
                    data-testid="input-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Equipment Images</Label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload-wishlist"
              />
              <label htmlFor="image-upload-wishlist">
                <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-6 text-center cursor-pointer hover-elevate bg-blue-50/50 dark:bg-blue-950/30" data-testid="dropzone-images-wishlist">
                  <Upload className="w-10 h-10 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Drop images here or click to select</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB (max 5 files)</p>
                </div>
              </label>
              
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
                        data-testid={`button-remove-image-${index}`}
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
                      data-testid="button-upload-all-wishlist"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload All
                    </Button>
                    
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAiAnalyze}
                      disabled={isAnalyzing || imageUpload.getUploadedUrls().length === 0}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      data-testid="button-ai-analyze"
                    >
                      {isAnalyzing ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI Analyze
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base">Technical Specifications</Label>
            <Button 
              type="button" 
              size="sm" 
              variant="outline" 
              onClick={addSpec} 
              data-testid="button-add-spec"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>

          {aiSuggestions.specifications.length > 0 && (
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
                <Sparkles className="w-3 h-3 inline mr-1" />
                AI Suggested Specifications
              </div>
              <div className="space-y-2">
                {aiSuggestions.specifications.map((spec, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-background p-2 rounded">
                    <span className="text-sm">{spec.name}: {spec.value}{spec.unit ? ` ${spec.unit}` : ''}</span>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => acceptSpec(spec)}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => ignoreSpec(spec.name)}>Ignore</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {specs.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Specification name"
                  value={spec.key}
                  onChange={(e) => updateSpec(index, 'key', e.target.value)}
                  data-testid={`input-spec-key-${index}`}
                />
                <Input
                  placeholder="Value"
                  value={spec.value}
                  onChange={(e) => updateSpec(index, 'value', e.target.value)}
                  data-testid={`input-spec-value-${index}`}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeSpec(index)}
                  data-testid={`button-remove-spec-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="maxBudget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Maximum Budget ($) <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 45000"
                  {...field}
                  data-testid="input-budget"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base">Market Price Context</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleGetPriceContext}
              disabled={isFetchingPrices}
              data-testid="button-get-price-context"
              className="text-muted-foreground hover:text-foreground"
            >
              <Sparkles className={`w-4 h-4 mr-2 ${isFetchingPrices ? 'animate-spin' : ''}`} />
              {isFetchingPrices ? 'Scraping marketplace...' : 'Get Market Prices'}
            </Button>
          </div>
          
          {/* Live Scraping Progress Indicator */}
          {(priceData?.scraping_in_background || isPollingScrape) && !priceData?.has_marketplace_data && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2" data-testid="scraping-progress">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Searching Global Marketplaces...
                </span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <p>Scanning eBay, LabX, Fisher Scientific, BioSurplus and more</p>
                <p className="opacity-75">This may take up to 90 seconds for comprehensive results</p>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {priceData && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/30" data-testid="price-context">
              {/* Data Source Badge */}
              {priceData.has_marketplace_data ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">Real Marketplace Data</Badge>
              ) : (
                <Badge variant="secondary">AI Estimate</Badge>
              )}
              
              {/* New Condition */}
              {priceData.new_min !== null && priceData.new_max !== null && (
                <div className="space-y-2" data-testid="price-new">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-green-600 dark:text-green-400">New {(priceData.new_count ?? 0) > 0 ? `(${priceData.new_count} listings)` : '(AI Estimate)'}:</span>
                    <span className="font-medium">
                      ${priceData.new_min?.toLocaleString()} - ${priceData.new_max?.toLocaleString()}
                    </span>
                  </div>
                  {priceData.new_avg && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Average:</span>
                      <span className="font-semibold text-foreground">${priceData.new_avg?.toLocaleString()}</span>
                    </div>
                  )}
                  {(priceData.marketplace_listings?.filter((l) => l.condition === 'new').length ?? 0) > 0 && (
                    <div className="pl-3 border-l-2 border-green-300 dark:border-green-700 space-y-1">
                      {priceData.marketplace_listings?.filter((l) => l.condition === 'new').map((listing, idx) => (
                        <a
                          key={idx}
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between text-xs hover:underline text-blue-600 dark:text-blue-400"
                          data-testid={`link-new-listing-${idx}`}
                        >
                          <span className="truncate flex-1 mr-2">{listing.title || listing.source}</span>
                          <span className="font-medium shrink-0">${listing.price?.toLocaleString()}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Refurbished Condition */}
              {priceData.refurbished_min !== null && priceData.refurbished_max !== null && (
                <div className="space-y-2" data-testid="price-refurbished">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-amber-600 dark:text-amber-400">Refurbished {(priceData.refurbished_count ?? 0) > 0 ? `(${priceData.refurbished_count} listings)` : '(AI Estimate)'}:</span>
                    <span className="font-medium">
                      ${priceData.refurbished_min?.toLocaleString()} - ${priceData.refurbished_max?.toLocaleString()}
                    </span>
                  </div>
                  {priceData.refurbished_avg && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Average:</span>
                      <span className="font-semibold text-foreground">${priceData.refurbished_avg?.toLocaleString()}</span>
                    </div>
                  )}
                  {(priceData.marketplace_listings?.filter((l) => l.condition === 'refurbished').length ?? 0) > 0 && (
                    <div className="pl-3 border-l-2 border-amber-300 dark:border-amber-700 space-y-1">
                      {priceData.marketplace_listings?.filter((l) => l.condition === 'refurbished').map((listing, idx) => (
                        <a
                          key={idx}
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between text-xs hover:underline text-blue-600 dark:text-blue-400"
                          data-testid={`link-refurbished-listing-${idx}`}
                        >
                          <span className="truncate flex-1 mr-2">{listing.title || listing.source}</span>
                          <span className="font-medium shrink-0">${listing.price?.toLocaleString()}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Used Condition */}
              {priceData.used_min !== null && priceData.used_max !== null && (
                <div className="space-y-2" data-testid="price-used">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Used {(priceData.used_count ?? 0) > 0 ? `(${priceData.used_count} listings)` : '(AI Estimate)'}:</span>
                    <span className="font-medium">
                      ${priceData.used_min?.toLocaleString()} - ${priceData.used_max?.toLocaleString()}
                    </span>
                  </div>
                  {priceData.used_avg && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Average:</span>
                      <span className="font-semibold text-foreground">${priceData.used_avg?.toLocaleString()}</span>
                    </div>
                  )}
                  {(priceData.marketplace_listings?.filter((l) => l.condition === 'used').length ?? 0) > 0 && (
                    <div className="pl-3 border-l-2 border-gray-300 dark:border-gray-700 space-y-1">
                      {priceData.marketplace_listings?.filter((l) => l.condition === 'used').map((listing, idx) => (
                        <a
                          key={idx}
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between text-xs hover:underline text-blue-600 dark:text-blue-400"
                          data-testid={`link-used-listing-${idx}`}
                        >
                          <span className="truncate flex-1 mr-2">{listing.title || listing.source}</span>
                          <span className="font-medium shrink-0">${listing.price?.toLocaleString()}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {priceData.breakdown && (
                <p className="text-xs text-muted-foreground pt-2 border-t" data-testid="price-breakdown">
                  {priceData.breakdown}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Priority <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="high">high</SelectItem>
                    <SelectItem value="medium">medium</SelectItem>
                    <SelectItem value="low">low</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Label>Documents</Label>
            <label htmlFor="document-upload" className="block mt-2">
              <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-lg p-8 text-center cursor-pointer hover-elevate bg-emerald-50/50 dark:bg-emerald-950/30">
                <FileText className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Drop documents here or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, XLS up to 10MB (max 3 files)
                </p>
                {documentFiles.length > 0 && (
                  <p className="text-xs text-foreground mt-2">
                    {documentFiles.length} file{documentFiles.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
              <input
                id="document-upload"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                multiple
                onChange={handleDocumentUpload}
                className="hidden"
                data-testid="input-documents"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Category <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category-wishlist">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="analytical">analytical</SelectItem>
                      <SelectItem value="processing">processing</SelectItem>
                      <SelectItem value="testing">testing</SelectItem>
                      <SelectItem value="other">other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {aiSuggestions.category && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    AI Suggestion ({Math.round(aiSuggestions.category.confidence * 100)}% confidence)
                  </span>
                </div>
                <p className="text-sm mb-2">{aiSuggestions.category.value}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptSuggestion('category')} data-testid="button-accept-category">Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => ignoreSuggestion('category')} data-testid="button-ignore-category">Ignore</Button>
                </div>
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name="preferredCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Condition <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-condition-wishlist">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="any">any</SelectItem>
                    <SelectItem value="new">new</SelectItem>
                    <SelectItem value="refurbished">refurbished</SelectItem>
                    <SelectItem value="used">used</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Location <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g., Houston, TX" {...field} data-testid="input-location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
          <p className="text-sm text-destructive">
            Please fill in required fields: {Object.keys(form.formState.errors).map(key => {
              if (key === 'preferredCondition') return 'Condition';
              return key.charAt(0).toUpperCase() + key.slice(1);
            }).join(', ')}
          </p>
        )}

        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel-wishlist"
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1"
            disabled={createWishlistItem.isPending}
            data-testid="button-submit-wishlist"
          >
            {createWishlistItem.isPending ? "Adding..." : "Add to Project"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
