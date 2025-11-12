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
import { Plus, Trash2, Sparkles, Upload, FileText, BookOpen } from "lucide-react";
import type { PriceEstimate } from "@/hooks/use-ai-analysis";
import { analyzeEquipmentImages, searchExternalSources } from "@/lib/ai-service";
import { uploadFiles, validateImageFiles, validateDocumentFiles } from "@/lib/file-upload";

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

  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([]);
  const [priceData, setPriceData] = useState<PriceEstimate | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions>({
    brand: null,
    model: null,
    category: null,
    specifications: [],
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);

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

    try {
      const result = await searchExternalSources(brand, model);
      toast({
        title: "External sources found",
        description: `Found ${result.external_matches?.length || 0} relevant sources`,
      });
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    }
  };

  const handleGetPriceContext = async () => {
    const brand = form.getValues('brand');
    const model = form.getValues('model');
    const category = form.getValues('category');
    const condition = form.getValues('preferredCondition');

    if (!brand || !model) {
      toast({
        title: "Missing information",
        description: "Please provide brand and model first",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await fetchPriceContext.mutateAsync({
        brand,
        model,
        category,
        condition: condition || 'any',
      });

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
      form.setValue('priceSource', result.source || 'AI estimate');
      form.setValue('priceBreakdown', result.breakdown || null);

      toast({
        title: "Price context retrieved",
        description: "Market price ranges have been updated",
      });
    } catch (error: any) {
      toast({
        title: "Failed to get price context",
        description: error.message || "Could not retrieve market prices",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const error = validateImageFiles(files);
    if (error) {
      toast({ title: "Invalid files", description: error, variant: "destructive" });
      return;
    }

    setIsUploadingImages(true);
    try {
      setImageFiles(files);
      const urls = await uploadFiles(files, 'image');
      form.setValue('imageUrls', urls);
      toast({ title: "Images uploaded", description: `${files.length} image${files.length !== 1 ? 's' : ''} uploaded` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setImageFiles([]);
    } finally {
      setIsUploadingImages(false);
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
      setImageFiles([]);
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
          disabled={!form.watch('brand') || !form.watch('model')}
          className="w-full text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-search-external"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Search External Sources (PDFs + Google)
        </Button>

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

          <div>
            <Label>Images</Label>
            <label htmlFor="image-upload" className="block mt-2">
              <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-8 text-center cursor-pointer hover-elevate bg-blue-50/50 dark:bg-blue-950/30">
                <Upload className={`w-12 h-12 mx-auto mb-3 text-blue-500 ${isUploadingImages ? 'animate-pulse' : ''}`} />
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {isUploadingImages ? 'Uploading images...' : 'Drop images here or click to select'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 5MB (max 5 files)
                </p>
                {imageFiles.length > 0 && !isUploadingImages && (
                  <p className="text-xs text-foreground mt-2">
                    {imageFiles.length} file{imageFiles.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploadingImages}
                data-testid="input-images"
              />
            </label>

            {(form.watch('imageUrls')?.length ?? 0) > 0 && (
              <Button
                type="button"
                onClick={handleAiAnalyze}
                disabled={isAnalyzing}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                data-testid="button-ai-analyze"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing: Images → Manuals → Specs...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Analyze: Images → Manuals → Specifications
                  </>
                )}
              </Button>
            )}
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
              disabled={fetchPriceContext.isPending}
              data-testid="button-get-price-context"
              className="text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get Price Context
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
