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
import { Plus, Trash2, RefreshCw } from "lucide-react";

interface WishlistItemFormProps {
  projectId: number;
  createdBy: string;
  onSuccess?: () => void;
}

export function WishlistItemForm({ projectId, createdBy, onSuccess }: WishlistItemFormProps) {
  const { toast } = useToast();
  const { createWishlistItem } = useWishlistMutations();
  const { fetchPriceContext } = usePriceContext();

  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([]);

  const form = useForm<InsertWishlistItem>({
    resolver: zodResolver(insertWishlistItemSchema),
    defaultValues: {
      projectId,
      createdBy,
      brand: "",
      model: "",
      category: "analytical",
      preferredCondition: "any",
      maxBudget: "0",
      priority: "high",
      requiredSpecs: null,
      notes: "",
      status: "active",
      marketPriceRange: null,
      priceSource: null,
    },
  });

  const addSpec = () => {
    setSpecs([...specs, { key: "", value: "" }]);
  };

  const removeSpec = (index: number) => {
    const newSpecs = specs.filter((_, i) => i !== index);
    setSpecs(newSpecs);
    
    const specsObject = newSpecs
      .filter(s => s.key && s.value)
      .reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    
    form.setValue('requiredSpecs', Object.keys(specsObject).length > 0 ? specsObject : null);
  };

  const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...specs];
    newSpecs[index][field] = val;
    setSpecs(newSpecs);

    const specsObject = newSpecs
      .filter(s => s.key && s.value)
      .reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    
    form.setValue('requiredSpecs', Object.keys(specsObject).length > 0 ? specsObject : null);
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
        condition,
      });

      form.setValue('marketPriceRange', result.priceRange as any);
      form.setValue('priceSource', result.source);

      toast({
        title: "Price context retrieved",
        description: `Market price: $${result.priceRange?.min.toLocaleString()} - $${result.priceRange?.max.toLocaleString()}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to get price context",
        description: error.message || "Could not retrieve market prices",
        variant: "destructive",
      });
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
        maxBudget: "0",
        priority: "high",
        requiredSpecs: null,
        notes: "",
        status: "active",
        marketPriceRange: null,
        priceSource: null,
      });
      setSpecs([]);

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Failed to create wishlist item",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const marketPriceRange = form.watch('marketPriceRange') as any;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Thermo Fisher" {...field} data-testid="input-brand" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., TSQ-9000" {...field} data-testid="input-model" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the equipment requirements..."
                  rows={4}
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
          <div className="flex items-center justify-between mb-2">
            <Label>Required Specifications</Label>
            <Button type="button" size="sm" variant="outline" onClick={addSpec} data-testid="button-add-spec">
              <Plus className="w-3 h-3 mr-1" />
              Add Spec
            </Button>
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxBudget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Budget ($)</FormLabel>
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

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Market Price Context</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleGetPriceContext}
              disabled={fetchPriceContext.isPending}
              data-testid="button-get-price-context"
            >
              {fetchPriceContext.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Get Price Context
            </Button>
          </div>

          {marketPriceRange && (
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Market Range:</span>
                <span className="text-sm">
                  ${marketPriceRange.min?.toLocaleString() || 0} - ${marketPriceRange.max?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category-wishlist">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="analytical">Analytical</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preferredCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Condition *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-condition-wishlist">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createWishlistItem.isPending}
          data-testid="button-submit-wishlist"
        >
          {createWishlistItem.isPending ? "Adding..." : "Add to Project"}
        </Button>
      </form>
    </Form>
  );
}
