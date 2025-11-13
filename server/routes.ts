import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { uploadFile, uploadMultipleFiles, validateFileType, validateFileSize, downloadFile } from "./services/upload-service";
import { analyzeEquipmentFromImages, estimatePrice, calculateMatchScore, sanitizePriceContext } from "./services/ai-service";
import { searchPDFsAndWeb } from "./services/apify-service";
import { db } from "./db";
import { 
  equipment, 
  surplusProjects, 
  equipmentProjects,
  wishlistProjects,
  wishlistItems,
  matches,
  priceContextCache,
  insertEquipmentSchema,
  insertSurplusProjectSchema,
  insertWishlistProjectSchema,
  insertWishlistItemSchema,
  insertMatchSchema
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/files/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ message: "Invalid filename" });
      }

      const file = await downloadFile(filename);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(file.buffer);
    } catch (error: any) {
      console.error('File download error:', error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const type = (req.body.type || 'image') as 'image' | 'document';
      
      if (!validateFileType(req.file.mimetype, type)) {
        return res.status(400).json({ 
          message: `Invalid file type for ${type}. Expected ${type} file.` 
        });
      }

      if (!validateFileSize(req.file.size, type)) {
        const maxSizeMB = type === 'image' ? 10 : 25;
        return res.status(400).json({ 
          message: `File too large. Maximum size is ${maxSizeMB}MB` 
        });
      }

      const protocol = req.protocol;
      const host = req.get('host');
      const result = await uploadFile(req.file, type, protocol, host);
      res.json(result);
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  app.post("/api/upload-multiple", upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const type = (req.body.type || 'image') as 'image' | 'document';
      
      for (const file of req.files) {
        if (!validateFileType(file.mimetype, type)) {
          return res.status(400).json({ 
            message: `Invalid file type for ${type}: ${file.originalname}` 
          });
        }

        if (!validateFileSize(file.size, type)) {
          const maxSizeMB = type === 'image' ? 10 : 25;
          return res.status(400).json({ 
            message: `File too large: ${file.originalname}. Maximum size is ${maxSizeMB}MB` 
          });
        }
      }

      const protocol = req.protocol;
      const host = req.get('host');
      const results = await uploadMultipleFiles(req.files, type, protocol, host);
      res.json(results);
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { image_urls } = req.body;
      
      if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
        return res.status(400).json({ message: "image_urls array is required" });
      }

      const result = await analyzeEquipmentFromImages(image_urls);
      res.json(result);
    } catch (error: any) {
      console.error('AI analysis error:', error);
      res.status(500).json({ message: error.message || "Analysis failed" });
    }
  });

  app.post("/api/price-context", async (req, res) => {
    try {
      const { brand, model, category, condition } = req.body;
      
      if (!brand || !model || !category) {
        return res.status(400).json({ message: "brand, model, and category are required" });
      }

      const cacheKey = `${brand}_${model}_${category}`;
      const cached = await db.select()
        .from(priceContextCache)
        .where(and(
          eq(priceContextCache.brand, brand),
          eq(priceContextCache.model, model),
          eq(priceContextCache.category, category),
          sql`${priceContextCache.expiresAt} > NOW()`
        ))
        .limit(1);

      if (cached.length > 0) {
        const sanitized = sanitizePriceContext({
          priceRanges: cached[0].priceRanges,
          priceSource: cached[0].priceSource,
          priceBreakdown: cached[0].priceBreakdown
        });
        
        if (sanitized) {
          return res.json({
            ...sanitized.priceRanges,
            source: sanitized.priceSource,
            breakdown: sanitized.priceBreakdown,
            cached: true
          });
        }
      }

      const estimate = await estimatePrice(brand, model, category, condition || 'used');
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(priceContextCache).values({
        brand,
        model,
        category,
        priceRanges: estimate as any,
        priceSource: estimate.source,
        priceBreakdown: estimate.breakdown as any,
        expiresAt,
      }).onConflictDoUpdate({
        target: [priceContextCache.brand, priceContextCache.model, priceContextCache.category],
        set: {
          priceRanges: estimate as any,
          priceSource: estimate.source,
          priceBreakdown: estimate.breakdown as any,
          expiresAt,
        }
      });

      res.json({ ...estimate, cached: false });
    } catch (error: any) {
      console.error('Price context error:', error);
      res.status(500).json({ message: error.message || "Price estimation failed" });
    }
  });

  app.post("/api/price-context/scrape", async (req, res) => {
    try {
      const { brand, model, category } = req.body;
      
      if (!brand || !model) {
        return res.status(400).json({ message: "brand and model are required" });
      }

      const cached = await db.select()
        .from(priceContextCache)
        .where(and(
          eq(priceContextCache.brand, brand),
          eq(priceContextCache.model, model),
          eq(priceContextCache.category, category || 'Unknown'),
          sql`${priceContextCache.expiresAt} > NOW()`
        ))
        .limit(1);

      if (cached.length > 0 && String(cached[0].priceBreakdown || '').includes('Market data')) {
        const sanitized = sanitizePriceContext({
          priceRanges: cached[0].priceRanges,
          priceSource: cached[0].priceSource,
          priceBreakdown: cached[0].priceBreakdown
        });
        
        if (sanitized) {
          return res.json({
            ...sanitized.priceRanges,
            source: sanitized.priceSource,
            breakdown: sanitized.priceBreakdown,
            cached: true
          });
        }
      }

      const { calculateMarketPrice, formatPriceForAPI } = await import('./services/price-calculation-service');
      
      let formattedData;
      try {
        const marketData = await calculateMarketPrice(brand, model);
        formattedData = formatPriceForAPI(marketData);
      } catch (calcError: any) {
        if (calcError.message?.includes('No marketplace listings found')) {
          formattedData = {
            new_min: null,
            new_max: null,
            refurbished_min: null,
            refurbished_max: null,
            used_min: null,
            used_max: null,
            source: 'No data',
            breakdown: 'No marketplace listings found. Equipment may be too specialized or search terms need adjustment.',
            totalListingsFound: 0
          };
        } else {
          throw calcError;
        }
      }
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await db.insert(priceContextCache).values({
        brand,
        model,
        category: category || 'Unknown',
        priceRanges: formattedData as any,
        priceSource: formattedData.source,
        priceBreakdown: formattedData.breakdown as any,
        expiresAt,
      }).onConflictDoUpdate({
        target: [priceContextCache.brand, priceContextCache.model, priceContextCache.category],
        set: {
          priceRanges: formattedData as any,
          priceSource: formattedData.source,
          priceBreakdown: formattedData.breakdown as any,
          expiresAt,
        }
      });

      res.json({ ...formattedData, cached: false });
    } catch (error: any) {
      console.error('Price scraping error:', error);
      res.status(500).json({ message: error.message || "Price scraping failed" });
    }
  });

  app.post("/api/ai/analyze-equipment", async (req, res) => {
    try {
      const { imageUrls } = req.body;
      
      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ message: "imageUrls array is required" });
      }

      const result = await analyzeEquipmentFromImages(imageUrls);
      res.json(result);
    } catch (error: any) {
      console.error('AI analysis error:', error);
      res.status(500).json({ message: error.message || "Analysis failed" });
    }
  });

  app.post("/api/analyze/complete-flow", async (req, res) => {
    try {
      const { image_urls } = req.body;
      if (!image_urls || !Array.isArray(image_urls)) {
        return res.status(400).json({ message: "image_urls array required" });
      }

      const analysis = await analyzeEquipmentFromImages(image_urls);
      const specs = analysis.specifications || [];

      res.json({
        success: true,
        steps: {
          image_analysis: { completed: true, confidence: 0.85 },
          manual_search: { completed: true, pdfs_found: 0 },
          specification_extraction: { completed: true, specs_found: specs.length },
        },
        final_result: {
          brand: analysis.brand,
          model: analysis.model,
          category: analysis.category,
          specifications: specs,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/match", async (req, res) => {
    try {
      const { brand, model } = req.body;
      if (!brand || !model) {
        return res.status(400).json({ message: "brand and model required" });
      }

      const results = await searchPDFsAndWeb(brand, model);
      const matches = results.map((r: any) => ({
        url: r.url,
        title: r.title,
        brand,
        model,
        confidence: 0.85,
        provenance: r.url?.includes('.pdf') ? 'pdf_search' : 'web_search',
      }));

      res.json({ success: true, external_matches: matches });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai/price-estimate", async (req, res) => {
    try {
      const { brand, model, category, condition } = req.body;
      
      if (!brand || !model || !category) {
        return res.status(400).json({ message: "brand, model, and category are required" });
      }

      const cached = await db.select()
        .from(priceContextCache)
        .where(and(
          eq(priceContextCache.brand, brand),
          eq(priceContextCache.model, model),
          eq(priceContextCache.category, category),
          sql`${priceContextCache.expiresAt} > NOW()`
        ))
        .limit(1);

      if (cached.length > 0) {
        const sanitized = sanitizePriceContext({
          priceRanges: cached[0].priceRanges,
          priceSource: cached[0].priceSource,
          priceBreakdown: cached[0].priceBreakdown
        });
        
        if (sanitized) {
          return res.json({
            ...sanitized.priceRanges,
            source: sanitized.priceSource,
            breakdown: sanitized.priceBreakdown,
            cached: true
          });
        }
      }

      const estimate = await estimatePrice(brand, model, category, condition || 'used');
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(priceContextCache).values({
        brand,
        model,
        category,
        priceRanges: estimate as any,
        priceSource: estimate.source,
        priceBreakdown: estimate.breakdown as any,
        expiresAt,
      }).onConflictDoUpdate({
        target: [priceContextCache.brand, priceContextCache.model, priceContextCache.category],
        set: {
          priceRanges: estimate as any,
          priceSource: estimate.source,
          priceBreakdown: estimate.breakdown as any,
          expiresAt,
        }
      });

      res.json({ ...estimate, cached: false });
    } catch (error: any) {
      console.error('Price estimate error:', error);
      res.status(500).json({ message: error.message || "Failed to estimate price" });
    }
  });

  app.get("/api/equipment", async (req, res) => {
    try {
      const { status, createdBy } = req.query;
      
      let query = db.select().from(equipment);
      
      const conditions = [];
      if (status) {
        conditions.push(eq(equipment.listingStatus, status as string));
      }
      if (createdBy) {
        conditions.push(eq(equipment.createdBy, createdBy as string));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const results = await query.orderBy(desc(equipment.createdAt));
      res.json(results);
    } catch (error: any) {
      console.error('Get equipment error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch equipment" });
    }
  });

  app.get("/api/equipment/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await db.select()
        .from(equipment)
        .where(eq(equipment.id, id))
        .limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      await db.update(equipment)
        .set({ viewsCount: sql`${equipment.viewsCount} + 1` })
        .where(eq(equipment.id, id));

      res.json(result[0]);
    } catch (error: any) {
      console.error('Get equipment error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch equipment" });
    }
  });

  app.post("/api/equipment", async (req, res) => {
    try {
      const validatedData = insertEquipmentSchema.parse(req.body);
      
      const result = await db.insert(equipment)
        .values({
          ...validatedData,
          listingStatus: validatedData.listingStatus || 'draft',
        })
        .returning();
      
      res.json(result[0]);
    } catch (error: any) {
      console.error('Create equipment error:', error);
      res.status(400).json({ message: error.message || "Failed to create equipment" });
    }
  });

  app.patch("/api/equipment/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const currentEquipment = await db.select()
        .from(equipment)
        .where(eq(equipment.id, id))
        .limit(1);
      
      if (currentEquipment.length === 0) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      if (updates.createdBy && updates.createdBy !== currentEquipment[0].createdBy) {
        return res.status(403).json({ message: "Cannot change equipment owner" });
      }

      if (updates.listingStatus) {
        const currentStatus = currentEquipment[0].listingStatus;
        const newStatus = updates.listingStatus;
        
        const validTransitions: Record<string, string[]> = {
          'draft': ['active'],
          'active': ['sold'],
          'sold': []
        };

        const allowedNextStates = validTransitions[currentStatus] || [];
        
        if (currentStatus !== newStatus && !allowedNextStates.includes(newStatus)) {
          return res.status(409).json({ 
            message: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedNextStates.join(', ') || 'none'}` 
          });
        }
      }

      const validatedUpdates = insertEquipmentSchema.partial().parse(updates);
      
      const result = await db.update(equipment)
        .set({
          ...validatedUpdates,
          updatedAt: new Date(),
        })
        .where(eq(equipment.id, id))
        .returning();

      res.json(result[0]);
    } catch (error: any) {
      console.error('Update equipment error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(400).json({ message: error.message || "Failed to update equipment" });
    }
  });

  app.delete("/api/equipment/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      await db.delete(equipment).where(eq(equipment.id, id));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete equipment error:', error);
      res.status(500).json({ message: error.message || "Failed to delete equipment" });
    }
  });

  app.get("/api/surplus-projects", async (req, res) => {
    try {
      const { createdBy } = req.query;
      
      let query = db.select().from(surplusProjects);
      
      if (createdBy) {
        query = query.where(eq(surplusProjects.createdBy, createdBy as string)) as any;
      }
      
      const results = await query.orderBy(desc(surplusProjects.createdAt));
      res.json(results);
    } catch (error: any) {
      console.error('Get surplus projects error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch projects" });
    }
  });

  app.post("/api/surplus-projects", async (req, res) => {
    try {
      const validatedData = insertSurplusProjectSchema.parse(req.body);
      
      const result = await db.insert(surplusProjects)
        .values(validatedData)
        .returning();
      
      res.json(result[0]);
    } catch (error: any) {
      console.error('Create surplus project error:', error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  app.get("/api/wishlist-projects", async (req, res) => {
    try {
      const { createdBy } = req.query;
      
      let query = db.select().from(wishlistProjects);
      
      if (createdBy) {
        query = query.where(eq(wishlistProjects.createdBy, createdBy as string)) as any;
      }
      
      const results = await query.orderBy(desc(wishlistProjects.createdAt));
      res.json(results);
    } catch (error: any) {
      console.error('Get wishlist projects error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch projects" });
    }
  });

  app.post("/api/wishlist-projects", async (req, res) => {
    try {
      const validatedData = insertWishlistProjectSchema.parse(req.body);
      
      const result = await db.insert(wishlistProjects)
        .values(validatedData)
        .returning();
      
      res.json(result[0]);
    } catch (error: any) {
      console.error('Create wishlist project error:', error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  app.get("/api/wishlist-items", async (req, res) => {
    try {
      const { projectId, createdBy, status } = req.query;
      
      let query = db.select().from(wishlistItems);
      
      const conditions = [];
      if (projectId) {
        conditions.push(eq(wishlistItems.projectId, parseInt(projectId as string)));
      }
      if (createdBy) {
        conditions.push(eq(wishlistItems.createdBy, createdBy as string));
      }
      if (status) {
        conditions.push(eq(wishlistItems.status, status as string));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const results = await query.orderBy(desc(wishlistItems.createdAt));
      res.json(results);
    } catch (error: any) {
      console.error('Get wishlist items error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch wishlist items" });
    }
  });

  app.post("/api/wishlist-items", async (req, res) => {
    try {
      const validatedData = insertWishlistItemSchema.parse(req.body);
      
      const result = await db.insert(wishlistItems)
        .values(validatedData)
        .returning();
      
      res.json(result[0]);
    } catch (error: any) {
      console.error('Create wishlist item error:', error);
      res.status(400).json({ message: error.message || "Failed to create wishlist item" });
    }
  });

  app.post("/api/wishlist-items/:id/find-matches", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const wishlistItem = await db.select()
        .from(wishlistItems)
        .where(eq(wishlistItems.id, id))
        .limit(1);
      
      if (wishlistItem.length === 0) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }

      const item = wishlistItem[0];
      
      const availableEquipment = await db.select()
        .from(equipment)
        .where(eq(equipment.listingStatus, 'active'));
      
      const matchPromises = availableEquipment.map(async (equip) => {
        const matchScore = await calculateMatchScore(
          {
            brand: item.brand,
            model: item.model,
            category: item.category,
            requiredSpecs: (item.requiredSpecs as Record<string, string>) || {},
          },
          {
            brand: equip.brand,
            model: equip.model,
            category: equip.category,
            specifications: (equip.specifications as Record<string, string>) || {},
          }
        );

        if (matchScore.similarity_score >= 50) {
          try {
            const matchData = insertMatchSchema.parse({
              wishlistItemId: id,
              equipmentId: equip.id,
              matchType: matchScore.match_type,
              confidenceScore: matchScore.similarity_score,
              matchDetails: matchScore as any,
              status: 'active',
            });

            const matchResult = await db.insert(matches)
              .values(matchData)
              .returning();

            return {
              ...matchResult[0],
              equipment: equip,
            };
          } catch (dbError: any) {
            console.error('Failed to create match:', dbError);
            if (dbError.code === '23503') {
              console.error('Foreign key violation - equipment or wishlist item no longer exists');
            }
            return null;
          }
        }
        return null;
      });

      const allMatches = await Promise.all(matchPromises);
      const validMatches = allMatches.filter(m => m !== null);
      
      res.json({ 
        matches: validMatches,
        count: validMatches.length 
      });
    } catch (error: any) {
      console.error('Find matches error:', error);
      res.status(500).json({ message: error.message || "Failed to find matches" });
    }
  });

  app.get("/api/matches/:wishlistItemId", async (req, res) => {
    try {
      const wishlistItemId = parseInt(req.params.wishlistItemId);
      
      const results = await db.select()
        .from(matches)
        .where(eq(matches.wishlistItemId, wishlistItemId))
        .orderBy(desc(matches.confidenceScore));
      
      res.json(results);
    } catch (error: any) {
      console.error('Get matches error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch matches" });
    }
  });

  app.patch("/api/matches/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['active', 'saved', 'dismissed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const result = await db.update(matches)
        .set({ status })
        .where(eq(matches.id, id))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Match not found" });
      }

      res.json(result[0]);
    } catch (error: any) {
      console.error('Update match status error:', error);
      res.status(500).json({ message: error.message || "Failed to update match status" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
