import { useState, useEffect } from "react";
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
import { X, Plus, Loader2, Upload, Sparkles, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { searchExternalSources } from "@/lib/ai-service";

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
  
  const [specs, setSpecs] = useState<SpecField[]>([]);
  const [priceData, setPriceData] = useState<any>(null);
  const [externalResults, setExternalResults] = useState<any[]>([]);
  const [isSearchingSources, setIsSearchingSources] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  
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
    },
  });

  const imageUpload = useImageUpload();
  const { analyzeEquipment } = useAiAnalysis();

  // Reset form and all state when initialData changes (for editing)
  useEffect(() => {
    // Clear all derived state first to prevent cross-contamination
    setPriceData(null);
    setExternalResults([]);
    setIsSearchingSources(false);
    setIsFetchingPrices(false);
    imageUpload.clearAll();
    
    if (initialData) {
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    imageUpload.addFiles(files);
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

  const handleFetchPriceContext = async () => {
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

      // Show different toast based on whether scraping is happening in background
      if (result.scraping_in_background) {
        toast({
          title: "AI estimate ready",
          description: "Live marketplace data is being fetched in the background. Refresh for latest prices.",
          duration: 5000,
        });
      } else if (result.cached) {
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
      toast({
        title: "Price scraping failed",
        description: error.message || "Could not retrieve market prices. Try checking eBay manually.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingPrices(false);
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
      const result = await searchExternalSources(brand, model);
      const matches = result.external_matches || [];
      setExternalResults(matches);
      
      toast({
        title: "Search complete",
        description: `Found ${matches.length} relevant source${matches.length !== 1 ? 's' : ''}`,
      });
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Could not search external sources",
        variant: "destructive",
      });
      setExternalResults([]);
    } finally {
      setIsSearchingSources(false);
    }
  };

  const handleFormSubmit = (data: EquipmentFormData) => {
    onSubmit(data);
  };

  const formatPrice = (value: number | null) => {
    if (value === null) return 'N/A';
    return `$${value.toLocaleString()}`;
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
          <Label htmlFor="askingPrice">Asking Price ($) *</Label>
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
              Get Price Context
            </Button>
          </div>
          
          {priceData && (
            <div className="border rounded-lg p-4 space-y-3">
              {priceData.has_marketplace_data !== undefined && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  {priceData.has_marketplace_data ? (
                    <>
                      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                        Real Marketplace Data
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Averaged from actual listings
                      </span>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary">
                        AI Estimate
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {priceData.scraping_in_background 
                          ? 'Fetching real marketplace data in background...' 
                          : 'Based on AI analysis'}
                      </span>
                    </>
                  )}
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">New</p>
                  <p className="font-semibold">
                    {formatPrice(priceData.new_min)} - {formatPrice(priceData.new_max)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Refurbished</p>
                  <p className="font-semibold">
                    {formatPrice(priceData.refurbished_min)} - {formatPrice(priceData.refurbished_max)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Used</p>
                  <p className="font-semibold">
                    {formatPrice(priceData.used_min)} - {formatPrice(priceData.used_max)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">{priceData.breakdown}</p>
              <Badge variant="outline" className="text-xs">
                Source: {priceData.source}
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>External Sources (Manuals, Datasheets)</Label>
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
              Search PDFs & Web
            </Button>
          </div>
          
          {externalResults.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Found {externalResults.length} sources:</p>
              <div className="space-y-2">
                {externalResults.map((source: any, index: number) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid={`link-external-source-${index}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{source.title || source.url}</span>
                  </a>
                ))}
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
