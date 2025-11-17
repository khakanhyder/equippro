import { useState } from "react";
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
import { Plus, Trash2, Sparkles, Upload, FileText, BookOpen, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PriceEstimate } from "@/hooks/use-ai-analysis";
import { analyzeEquipmentImages, searchExternalSources } from "@/lib/ai-service";
import { uploadFiles, validateImageFiles, validateDocumentFiles } from "@/lib/file-upload";
import { useImageUpload } from "@/hooks/use-image-upload";

interface WishlistItemFormProps {
  projectId: number;
  createdBy: string;
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

export function WishlistItemForm({ projectId, createdBy, onSuccess, onCancel }: WishlistItemFormProps) {
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

  const form = useForm<InsertWishlistItem>({
    resolver: zodResolver(insertWishlistItemSchema),
    defaultValues: {
      projectId,
      createdBy,
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

  const handleGetPriceContext = async () => {
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

      if (result.totalListingsFound === 0) {
        toast({
          title: "No listings found",
          description: "Try checking eBay or LabX manually for this equipment",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Real market prices found!",
          description: `Found ${result.totalListingsFound} marketplace listing(s)`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Price scraping failed",
        description: error.message || "Could not retrieve market prices. Try checking eBay manually.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingPrices(false);
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
    const uploadedUrls = await imageUpload.uploadAll();
    
    if (uploadedUrls.length > 0) {
      const allUrls = [...(form.getValues('imageUrls') || []), ...uploadedUrls];
      form.setValue('imageUrls', allUrls);
      
      toast({
        title: "Images uploaded",
        description: `${uploadedUrls.length} image(s) uploaded successfully`,
      });
    } else {
      toast({
        title: "Upload failed",
        description: "No images were successfully uploaded",
        variant: "destructive",
      });
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
        createdBy,
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
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {externalResults.map((result, idx) => (
                <a
                  key={idx}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-background hover-elevate rounded border text-sm"
                  data-testid={`link-external-result-${idx}`}
                >
                  <div className="font-medium text-foreground mb-1">{result.title}</div>
                  {result.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">{result.description}</div>
                  )}
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">{result.url}</div>
                </a>
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

          {priceData && (
            <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
              {priceData.new_min !== null && priceData.new_max !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New:</span>
                  <span className="font-medium">
                    ${priceData.new_min?.toLocaleString()} - ${priceData.new_max?.toLocaleString()}
                  </span>
                </div>
              )}
              {priceData.refurbished_min !== null && priceData.refurbished_max !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Refurbished:</span>
                  <span className="font-medium">
                    ${priceData.refurbished_min?.toLocaleString()} - ${priceData.refurbished_max?.toLocaleString()}
                  </span>
                </div>
              )}
              {priceData.used_min !== null && priceData.used_max !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used:</span>
                  <span className="font-medium">
                    ${priceData.used_min?.toLocaleString()} - ${priceData.used_max?.toLocaleString()}
                  </span>
                </div>
              )}
              {priceData.breakdown && (
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  {priceData.breakdown}
                </p>
              )}
            </div>
          )}

          {priceData && priceData.marketplace_listings && priceData.marketplace_listings.length > 0 && (
            <div className="mt-3 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center">
                <ExternalLink className="w-4 h-4 mr-2" />
                Found {priceData.marketplace_listings.length} Marketplace Listing{priceData.marketplace_listings.length !== 1 ? 's' : ''}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {priceData.marketplace_listings.map((listing: any, idx: number) => (
                  <a
                    key={idx}
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-background hover-elevate rounded border text-sm"
                    data-testid={`link-marketplace-listing-${idx}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-foreground flex-1">
                        {listing.title || `Listing from ${listing.source}`}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs capitalize" data-testid={`badge-condition-${idx}`}>
                          {listing.condition}
                        </Badge>
                        <span className="font-semibold text-foreground">${listing.price?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 truncate">{listing.source}</div>
                  </a>
                ))}
              </div>
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
