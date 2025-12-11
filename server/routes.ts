import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from 'express-session';
import MemoryStore from 'memorystore';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { storage } from "./storage";
import multer from "multer";
import { uploadFile, uploadMultipleFiles, validateFileType, validateFileSize, downloadFile } from "./services/upload-service";
import { analyzeEquipmentFromImages, estimatePrice, calculateMatchScore, sanitizePriceContext, analyzeSourceUrl } from "./services/ai-service";
import { searchPDFsAndWeb } from "./services/apify-service";
import { classifySearchResult } from "./utils/result-classifier";
import { createUser, authenticateUser, updatePassword, sanitizeUser } from "./services/auth-service";
import { db } from "./db";
import { 
  equipment, 
  surplusProjects, 
  equipmentProjects,
  wishlistProjects,
  wishlistItems,
  matches,
  bids,
  priceContextCache,
  insertEquipmentSchema,
  insertSurplusProjectSchema,
  insertWishlistProjectSchema,
  insertWishlistItemSchema,
  insertMatchSchema,
  insertBidSchema
} from "@shared/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
});

// In-memory tracking for background scraping jobs to prevent duplicates
const inFlightScrapes = new Set<string>();

function getCacheKey(brand: string, model: string, category: string): string {
  return `${brand.toLowerCase()}_${model.toLowerCase()}_${category.toLowerCase()}`;
}

// Extend Express Session to include userId
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Trust proxy in production (behind Coolify/Traefik reverse proxy)
  if (isProduction) {
    app.set('trust proxy', 1);
    console.log('[Express] Trust proxy enabled for production');
  }
  
  // Health check endpoint for container orchestration (Coolify, Docker, etc.)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Setup session management with environment-appropriate store
  // Development: MemoryStore (simple, works with Replit)
  // Production: PostgreSQL store (persistent, scalable)
  let sessionStore: session.Store;
  
  if (isProduction) {
    // Production: Use PostgreSQL session store
    const PgSession = connectPgSimple(session);
    const pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
    sessionStore = new PgSession({
      pool: pgPool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    });
    console.log('[Session] Using PostgreSQL session store (production)');
  } else {
    // Development: Use in-memory store
    const MemStore = MemoryStore(session);
    sessionStore = new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    console.log('[Session] Using MemoryStore (development)');
  }

  // Require SESSION_SECRET in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (isProduction && !sessionSecret) {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }

  // Allow disabling secure cookies via env var for HTTP deployments
  const secureCookies = process.env.COOKIE_SECURE !== 'false' && isProduction;
  
  app.use(session({
    secret: sessionSecret || 'equipment-pro-dev-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax'
    }
  }));
  
  if (isProduction && !secureCookies) {
    console.log('[Session] WARNING: Secure cookies disabled - enable HTTPS for production security');
  }

  // ===== Authentication Routes =====

  // Signup
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { username, password, email } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      const user = await createUser(username, password, email);
      req.session.userId = user.id;

      res.json(sanitizeUser(user));
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(400).json({ message: error.message || 'Failed to create account' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const user = await authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.session.userId = user.id;

      res.json(sanitizeUser(user));
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Failed to login' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Get current user
  app.get('/api/auth/user', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  // Update password
  app.patch('/api/auth/password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }

      await updatePassword(req.session.userId!, currentPassword, newPassword);

      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('Password update error:', error);
      res.status(400).json({ message: error.message || 'Failed to update password' });
    }
  });

  // Update profile
  app.patch('/api/auth/profile', requireAuth, async (req, res) => {
    try {
      const { email, firstName, lastName } = req.body;
      const updates: any = {};
      
      if (email !== undefined) updates.email = email;
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;

      const user = await storage.updateUserProfile(req.session.userId!, updates);

      res.json(sanitizeUser(user));
    } catch (error: any) {
      console.error('Profile update error:', error);
      res.status(400).json({ message: error.message || 'Failed to update profile' });
    }
  });

  // ===== End Authentication Routes =====

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

  // Analyze external source URL for technical specifications
  app.post("/api/analyze-source", requireAuth, async (req, res) => {
    try {
      const { url, brand, model } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Fetch page content using Apify Cheerio scraper for reliable extraction
      const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
      if (!APIFY_TOKEN) {
        return res.status(500).json({ message: "Search service not configured" });
      }

      console.log('[AnalyzeSource] Fetching content from:', url);

      // Use Cheerio scraper to extract page content
      const response = await fetch(`https://api.apify.com/v2/acts/apify~cheerio-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxRequestsPerCrawl: 1,
          requestTimeoutSecs: 30,
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
          },
          pageFunction: `
            async function pageFunction(context) {
              const { $, request } = context;
              
              // Extract all text content
              const textContent = $('body').text().replace(/\\s+/g, ' ').trim();
              
              // Extract specific sections that often contain specs
              const specSections = [];
              $('table, .specifications, .specs, .features, [class*="spec"], [class*="feature"], dl, ul').each((i, el) => {
                const text = $(el).text().replace(/\\s+/g, ' ').trim();
                if (text.length > 20 && text.length < 5000) {
                  specSections.push(text);
                }
              });
              
              // Get title and description
              const title = $('h1').first().text().trim() || $('title').text().trim();
              const description = $('meta[name="description"]').attr('content') || '';
              
              return {
                url: request.url,
                title,
                description,
                textContent: textContent.substring(0, 15000),
                specSections: specSections.slice(0, 10).join('\\n\\n')
              };
            }
          `
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch page content');
      }

      const results = await response.json();
      if (!results || results.length === 0) {
        return res.status(400).json({ message: "Could not extract content from URL" });
      }

      const pageData = results[0];
      const contentToAnalyze = pageData.specSections || pageData.textContent || '';
      
      if (!contentToAnalyze || contentToAnalyze.length < 50) {
        return res.status(400).json({ message: "Insufficient content found on page" });
      }

      console.log('[AnalyzeSource] Extracted', contentToAnalyze.length, 'chars, analyzing with AI...');

      // Use AI to extract specifications
      const analysisResult = await analyzeSourceUrl(url, contentToAnalyze, brand, model);
      
      console.log('[AnalyzeSource] Found', Object.keys(analysisResult.specifications).length, 'specifications');

      res.json({
        ...analysisResult,
        title: pageData.title,
        url
      });
    } catch (error: any) {
      console.error('Source analysis error:', error);
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
          const hasMarketplaceData = cached[0].hasMarketplaceData === 'true';
          return res.json({
            ...sanitized.priceRanges,
            source: sanitized.priceSource,
            breakdown: sanitized.priceBreakdown,
            cached: true,
            has_marketplace_data: hasMarketplaceData,
            scraping_in_background: !hasMarketplaceData
          });
        }
      }

      const estimate = await estimatePrice(brand, model, category, condition || 'used');
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Fresh AI estimate always resets marketplace flag to false
      await db.insert(priceContextCache).values({
        brand,
        model,
        category,
        priceRanges: estimate as any,
        priceSource: estimate.source,
        priceBreakdown: estimate.breakdown as any,
        hasMarketplaceData: 'false',
        expiresAt,
      }).onConflictDoUpdate({
        target: [priceContextCache.brand, priceContextCache.model, priceContextCache.category],
        set: {
          priceRanges: estimate as any,
          priceSource: estimate.source,
          priceBreakdown: estimate.breakdown as any,
          hasMarketplaceData: 'false',
          expiresAt,
        }
      });

      res.json({ 
        ...estimate, 
        cached: false,
        has_marketplace_data: false,
        scraping_in_background: true
      });
    } catch (error: any) {
      console.error('Price context error:', error);
      res.status(500).json({ message: error.message || "Price estimation failed" });
    }
  });

  // Read-only endpoint for polling - does NOT trigger new scrapes
  app.get("/api/price-context/status", async (req, res) => {
    try {
      let { brand, model, category } = req.query;
      
      if (!brand || !model || typeof brand !== 'string' || typeof model !== 'string') {
        return res.status(400).json({ message: "brand and model are required" });
      }

      // Normalize brand/model for consistent cache lookup
      const { normalizeSearchTerm } = await import('./services/apify-service');
      brand = normalizeSearchTerm(brand);
      model = normalizeSearchTerm(model);
      
      // Normalize category - try exact match first, then lowercase
      const normalizedCategory = category ? (category as string).toLowerCase() : null;

      // Check for cached data (AI or marketplace) that's not expired
      // Try with provided category first, then without category filter as fallback
      let cached = await db.select()
        .from(priceContextCache)
        .where(and(
          eq(priceContextCache.brand, brand),
          eq(priceContextCache.model, model),
          normalizedCategory 
            ? sql`LOWER(${priceContextCache.category}) = ${normalizedCategory}`
            : sql`true`, // If no category provided, match any
          sql`${priceContextCache.expiresAt} > NOW()`
        ))
        .limit(1);
      
      // If no match and category was provided, try without category filter
      if (cached.length === 0 && normalizedCategory) {
        cached = await db.select()
          .from(priceContextCache)
          .where(and(
            eq(priceContextCache.brand, brand),
            eq(priceContextCache.model, model),
            sql`${priceContextCache.expiresAt} > NOW()`
          ))
          .limit(1);
      }

      const hasMarketplaceData = cached.length > 0 && cached[0].hasMarketplaceData === 'true';
      const hasAnyCache = cached.length > 0;

      if (hasAnyCache) {
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
            cached: true,
            has_marketplace_data: hasMarketplaceData,
            scraping_in_background: !hasMarketplaceData
          });
        }
      }

      // No cache found
      return res.status(404).json({ 
        message: "No cached price data found. Call POST /api/price-context/scrape first.",
        has_marketplace_data: false,
        cached: false
      });
    } catch (error: any) {
      console.error('Price status check error:', error);
      res.status(500).json({ message: error.message || "Status check failed" });
    }
  });

  app.post("/api/price-context/scrape", async (req, res) => {
    try {
      let { brand, model, category, skipCache } = req.body;
      
      if (!brand || !model) {
        return res.status(400).json({ message: "brand and model are required" });
      }

      // Normalize brand/model for consistent caching and search
      const { normalizeSearchTerm } = await import('./services/apify-service');
      brand = normalizeSearchTerm(brand);
      model = normalizeSearchTerm(model);

      const cacheKey = getCacheKey(brand, model, category || 'Unknown');

      // Skip cache check if skipCache is true (force fresh scrape)
      let cached: any[] = [];
      let hasMarketplaceData = false;
      let hasAnyCache = false;

      if (!skipCache) {
        // Check for cached data (AI or marketplace) that's not expired
        cached = await db.select()
          .from(priceContextCache)
          .where(and(
            eq(priceContextCache.brand, brand),
            eq(priceContextCache.model, model),
            eq(priceContextCache.category, category || 'Unknown'),
            sql`${priceContextCache.expiresAt} > NOW()`
          ))
          .limit(1);

        hasMarketplaceData = cached.length > 0 && cached[0].hasMarketplaceData === 'true';
        hasAnyCache = cached.length > 0;
      } else {
        console.log('[PriceScrape] skipCache=true, forcing fresh scrape for', brand, model);
      }

      // Return cached data immediately if available
      if (hasAnyCache) {
        console.log('[PriceScrape] Cache hit for', brand, model, '(marketplace:', hasMarketplaceData, ')');
        const sanitized = sanitizePriceContext({
          priceRanges: cached[0].priceRanges,
          priceSource: cached[0].priceSource,
          priceBreakdown: cached[0].priceBreakdown
        });
        
        if (sanitized) {
          // If we have AI-only cache and no scrape in flight, trigger background upgrade
          if (!hasMarketplaceData && !inFlightScrapes.has(cacheKey)) {
            console.log('[PriceScrape] AI cache found, triggering background marketplace scrape (if not already running)');
            inFlightScrapes.add(cacheKey);
            
            const { calculateMarketPrice, formatPriceForAPI } = await import('./services/price-calculation-service');
            
            setImmediate(async () => {
              try {
                console.log('[BackgroundScrape] Upgrading AI cache with marketplace data for', brand, model);
                const marketData = await calculateMarketPrice(brand, model, category);
                const formattedData = formatPriceForAPI(marketData);
                
                const hasRealMarketData = formattedData.totalListingsFound > 0;

                // Only update cache if we found real marketplace data
                // If scraping failed (0 listings), keep existing AI cache to allow retry
                if (hasRealMarketData) {
                  // Marketplace data gets 3-day TTL
                  const expiresAt = new Date();
                  expiresAt.setDate(expiresAt.getDate() + 3);

                  try {
                    await db.insert(priceContextCache).values({
                      brand,
                      model,
                      category: category || 'Unknown',
                      priceRanges: formattedData as any,
                      priceSource: formattedData.source,
                      priceBreakdown: formattedData.breakdown as any,
                      hasMarketplaceData: 'true',
                      expiresAt,
                    }).onConflictDoUpdate({
                      target: [priceContextCache.brand, priceContextCache.model, priceContextCache.category],
                      set: {
                        priceRanges: formattedData as any,
                        priceSource: formattedData.source,
                        priceBreakdown: formattedData.breakdown as any,
                        hasMarketplaceData: 'true',
                        expiresAt,
                      }
                    });
                  } catch (dbError: any) {
                    // Handle database connection errors gracefully
                    if (dbError.message && dbError.message.includes('terminating connection')) {
                      console.error('[BackgroundScrape] Database connection terminated - will retry on next request');
                    } else {
                      throw dbError;
                    }
                  }
                } else {
                  console.log('[BackgroundScrape] No marketplace listings found, keeping AI cache for retry');
                }
                
                console.log('[BackgroundScrape] Successfully upgraded cache (marketplace:', hasRealMarketData, ') for', brand, model);
              } catch (error: any) {
                console.error('[BackgroundScrape] Failed to upgrade cache for', brand, model, ':', error.message);
              } finally {
                inFlightScrapes.delete(cacheKey);
              }
            });
          }
          
          return res.json({
            ...sanitized.priceRanges,
            source: sanitized.priceSource,
            breakdown: sanitized.priceBreakdown,
            cached: true,
            has_marketplace_data: hasMarketplaceData,
            scraping_in_background: !hasMarketplaceData
          });
        }
      }

      // No cache - return AI estimate immediately, then scrape in background
      console.log('[PriceScrape] Cache miss, returning AI estimate and triggering background scrape for', brand, model);
      
      // Get AI estimate immediately (fast, <3s)
      const aiEstimate = await estimatePrice(brand, model, category || 'Industrial Equipment', 'used');
      
      // Cache AI estimate with 15-minute TTL
      const aiExpiresAt = new Date();
      aiExpiresAt.setMinutes(aiExpiresAt.getMinutes() + 15);

      await db.insert(priceContextCache).values({
        brand,
        model,
        category: category || 'Unknown',
        priceRanges: aiEstimate as any,
        priceSource: aiEstimate.source,
        priceBreakdown: aiEstimate.breakdown as any,
        hasMarketplaceData: 'false',
        expiresAt: aiExpiresAt,
      }).onConflictDoUpdate({
        target: [priceContextCache.brand, priceContextCache.model, priceContextCache.category],
        set: {
          priceRanges: aiEstimate as any,
          priceSource: aiEstimate.source,
          priceBreakdown: aiEstimate.breakdown as any,
          hasMarketplaceData: 'false',
          expiresAt: aiExpiresAt,
        }
      });

      // Return AI estimate to user immediately
      res.json({ 
        ...aiEstimate, 
        cached: false,
        has_marketplace_data: false,
        scraping_in_background: true,
        message: 'Showing AI estimate while fetching live marketplace data...'
      });

      // Trigger background marketplace scraping only if not already in flight
      if (!inFlightScrapes.has(cacheKey)) {
        inFlightScrapes.add(cacheKey);
        const { calculateMarketPrice, formatPriceForAPI } = await import('./services/price-calculation-service');
        
        setImmediate(async () => {
          try {
            console.log('[BackgroundScrape] Starting marketplace scrape for', brand, model);
            const marketData = await calculateMarketPrice(brand, model, category);
            const formattedData = formatPriceForAPI(marketData);
            
            const hasRealMarketData = formattedData.totalListingsFound > 0;

            // Only update cache if we found real marketplace data
            // If scraping failed (0 listings), keep existing AI cache to allow retry
            if (hasRealMarketData) {
              // Marketplace data gets 3-day TTL
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 3);

              try {
                await db.insert(priceContextCache).values({
                  brand,
                  model,
                  category: category || 'Unknown',
                  priceRanges: formattedData as any,
                  priceSource: formattedData.source,
                  priceBreakdown: formattedData.breakdown as any,
                  hasMarketplaceData: 'true',
                  expiresAt,
                }).onConflictDoUpdate({
                  target: [priceContextCache.brand, priceContextCache.model, priceContextCache.category],
                  set: {
                    priceRanges: formattedData as any,
                    priceSource: formattedData.source,
                    priceBreakdown: formattedData.breakdown as any,
                    hasMarketplaceData: 'true',
                    expiresAt,
                  }
                });
                
                console.log('[BackgroundScrape] Successfully cached marketplace data (listings:', formattedData.totalListingsFound, ') for', brand, model);
              } catch (dbError: any) {
                // Handle database connection errors gracefully
                if (dbError.message && dbError.message.includes('terminating connection')) {
                  console.error('[BackgroundScrape] Database connection terminated - will retry on next request');
                } else {
                  throw dbError;
                }
              }
            } else {
              console.log('[BackgroundScrape] No marketplace listings found, keeping AI cache for retry');
            }
          } catch (error: any) {
            console.error('[BackgroundScrape] Failed for', brand, model, ':', error.message);
          } finally {
            inFlightScrapes.delete(cacheKey);
          }
        });
      }

    } catch (error: any) {
      console.error('Price scraping error:', error);
      res.status(500).json({ message: error.message || "Price estimation failed" });
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
          description: analysis.description,
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
      
      // Classify results using shared utility
      const classifyResult = (r: any) => {
        const classification = classifySearchResult({
          url: r.url || '',
          title: r.title || '',
          description: r.description || '',
        });
        
        return {
          url: r.url, title: r.title, description: r.description || '',
          brand, model, confidence: 0.85,
          provenance: classification.isPdf ? 'pdf_search' : 'web_search',
          resultType: classification.resultType,
          isPdf: classification.isPdf,
        };
      };
      
      const matches = results.map(classifyResult);

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
          const hasMarketplaceData = cached[0].hasMarketplaceData === 'true';
          return res.json({
            ...sanitized.priceRanges,
            source: sanitized.priceSource,
            breakdown: sanitized.priceBreakdown,
            cached: true,
            has_marketplace_data: hasMarketplaceData,
            scraping_in_background: false
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
        hasMarketplaceData: 'false',
        expiresAt,
      }).onConflictDoUpdate({
        target: [priceContextCache.brand, priceContextCache.model, priceContextCache.category],
        set: {
          priceRanges: estimate as any,
          priceSource: estimate.source,
          priceBreakdown: estimate.breakdown as any,
          hasMarketplaceData: 'false',
          expiresAt,
        }
      });

      res.json({ 
        ...estimate, 
        cached: false,
        has_marketplace_data: false,
        scraping_in_background: false
      });
    } catch (error: any) {
      console.error('Price estimate error:', error);
      res.status(500).json({ message: error.message || "Failed to estimate price" });
    }
  });

  app.get("/api/equipment", requireAuth, async (req, res) => {
    try {
      const { status, listingStatus } = req.query;
      const userId = req.session.userId!;
      
      let query = db.select().from(equipment);
      
      const conditions = [eq(equipment.createdBy, userId)];
      
      // Support both 'status' and 'listingStatus' query params for compatibility
      const statusFilter = status || listingStatus;
      if (statusFilter) {
        conditions.push(eq(equipment.listingStatus, statusFilter as string));
      }
      
      query = query.where(and(...conditions)) as any;
      
      const results = await query.orderBy(desc(equipment.createdAt));
      res.json(results);
    } catch (error: any) {
      console.error('Get equipment error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch equipment" });
    }
  });

  app.get("/api/equipment/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      
      const result = await db.select()
        .from(equipment)
        .where(eq(equipment.id, id))
        .limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      // Verify ownership
      if (result[0].createdBy !== userId) {
        return res.status(403).json({ message: "You can only view your own equipment" });
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

  app.get("/api/equipment/export/csv", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const results = await db.select()
        .from(equipment)
        .where(eq(equipment.createdBy, userId))
        .orderBy(desc(equipment.createdAt));

      // CSV Headers
      const headers = [
        'ID',
        'Brand',
        'Model',
        'Category',
        'Condition',
        'Asking Price',
        'Location',
        'Description',
        'Status',
        'Specifications',
        'Market Price Range (New)',
        'Market Price Range (Refurbished)',
        'Market Price Range (Used)',
        'Views',
        'Created At',
        'Updated At'
      ];

      // Helper function to escape CSV values
      const escapeCsv = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Helper to format price range
      const formatPriceRange = (priceRange: any, condition: string): string => {
        if (!priceRange) return 'N/A';
        const min = priceRange[`${condition}_min`];
        const max = priceRange[`${condition}_max`];
        if (min && max) {
          return `$${min} - $${max}`;
        }
        return 'N/A';
      };

      // Helper to format specifications
      const formatSpecs = (specs: any): string => {
        if (!specs || typeof specs !== 'object') return '';
        return Object.entries(specs)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      };

      // Build CSV rows
      const rows = results.map(item => [
        item.id,
        item.brand,
        item.model,
        item.category,
        item.condition,
        `$${item.askingPrice}`,
        item.location,
        item.description || '',
        item.listingStatus,
        formatSpecs(item.specifications),
        formatPriceRange(item.marketPriceRange, 'new'),
        formatPriceRange(item.marketPriceRange, 'refurbished'),
        formatPriceRange(item.marketPriceRange, 'used'),
        item.viewsCount || 0,
        item.createdAt?.toISOString() || '',
        item.updatedAt?.toISOString() || ''
      ].map(escapeCsv));

      // Generate CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Set headers for file download
      const filename = `surplus-equipment-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(csvContent);
    } catch (error: any) {
      console.error('Export equipment error:', error);
      res.status(500).json({ message: error.message || "Failed to export equipment" });
    }
  });

  app.post("/api/equipment", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertEquipmentSchema.parse(req.body);
      
      const result = await db.insert(equipment)
        .values({
          ...validatedData,
          createdBy: userId,
          listingStatus: validatedData.listingStatus || 'draft',
        })
        .returning();
      
      res.json(result[0]);
    } catch (error: any) {
      console.error('Create equipment error:', error);
      res.status(400).json({ message: error.message || "Failed to create equipment" });
    }
  });

  app.patch("/api/equipment/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      const updates = req.body;
      
      const currentEquipment = await db.select()
        .from(equipment)
        .where(eq(equipment.id, id))
        .limit(1);
      
      if (currentEquipment.length === 0) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      // Verify ownership
      if (currentEquipment[0].createdBy !== userId) {
        return res.status(403).json({ message: "You can only edit your own equipment" });
      }

      // Prevent changing owner
      if (updates.createdBy && updates.createdBy !== userId) {
        return res.status(403).json({ message: "Cannot change equipment owner" });
      }

      if (updates.listingStatus) {
        const currentStatus = currentEquipment[0].listingStatus;
        const newStatus = updates.listingStatus;
        
        const validTransitions: Record<string, string[]> = {
          'draft': ['active'],
          'active': ['draft', 'sold'], // Allow unpublishing: active → draft
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

  app.delete("/api/equipment/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      
      // Verify ownership before deleting
      const item = await db.select()
        .from(equipment)
        .where(eq(equipment.id, id))
        .limit(1);
      
      if (item.length === 0) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      if (item[0].createdBy !== userId) {
        return res.status(403).json({ message: "You can only delete your own equipment" });
      }
      
      await db.delete(equipment).where(eq(equipment.id, id));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete equipment error:', error);
      res.status(500).json({ message: error.message || "Failed to delete equipment" });
    }
  });

  // ===== Internal Marketplace Search Endpoint =====
  // Rate limiting: track requests per user session
  const searchRateLimits = new Map<string, { count: number; resetAt: number }>();
  const SEARCH_RATE_LIMIT = 10; // max requests
  const SEARCH_RATE_WINDOW = 60000; // per minute
  
  app.post("/api/equipment/search-internal", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Rate limiting check
      const now = Date.now();
      const userLimit = searchRateLimits.get(userId);
      if (userLimit) {
        if (now < userLimit.resetAt) {
          if (userLimit.count >= SEARCH_RATE_LIMIT) {
            return res.status(429).json({ message: "Too many search requests. Please wait a moment." });
          }
          userLimit.count++;
        } else {
          searchRateLimits.set(userId, { count: 1, resetAt: now + SEARCH_RATE_WINDOW });
        }
      } else {
        searchRateLimits.set(userId, { count: 1, resetAt: now + SEARCH_RATE_WINDOW });
      }
      
      const { brand, model, category, excludeId } = req.body;
      
      if (!brand && !model) {
        return res.status(400).json({ message: "Brand or model is required for search" });
      }

      // Sanitize and validate inputs - minimum 2 characters, max 100
      const sanitizedBrand = (brand || '').trim().slice(0, 100).toLowerCase();
      const sanitizedModel = (model || '').trim().slice(0, 100).toLowerCase();
      
      if (sanitizedBrand.length < 2 && sanitizedModel.length < 2) {
        return res.status(400).json({ message: "Search term must be at least 2 characters" });
      }

      // Build search query using LOWER() + LIKE to leverage functional indexes (equipment_brand_lower_idx, equipment_model_lower_idx)
      // Prefix-only matching (no leading wildcards) allows PostgreSQL to use text_pattern_ops indexes
      const results = await db.select()
        .from(equipment)
        .where(
          and(
            eq(equipment.listingStatus, 'active'),
            sql`(
              ${sanitizedBrand.length >= 2 ? sql`LOWER(${equipment.brand}) LIKE ${sanitizedBrand + '%'}` : sql`FALSE`}
              OR ${sanitizedModel.length >= 2 ? sql`LOWER(${equipment.model}) LIKE ${sanitizedModel + '%'}` : sql`FALSE`}
            )`
          )
        )
        .orderBy(desc(equipment.createdAt))
        .limit(20);

      // Filter out excluded ID and format response
      const filteredResults = results
        .filter(item => excludeId ? item.id !== excludeId : true)
        .map(item => ({
          id: item.id,
          brand: item.brand,
          model: item.model,
          category: item.category,
          condition: item.condition,
          askingPrice: item.askingPrice,
          location: item.location,
          description: item.description,
          images: item.images,
          marketPriceRange: item.marketPriceRange,
          priceSource: item.priceSource,
          source: 'internal',
          matchType: (sanitizedBrand && item.brand.toLowerCase().includes(sanitizedBrand) && 
                      sanitizedModel && item.model.toLowerCase().includes(sanitizedModel)) 
            ? 'exact' : 'partial'
        }));

      res.json({
        internal_matches: filteredResults,
        total_count: filteredResults.length,
        search_query: { brand, model, category }
      });
    } catch (error: any) {
      console.error('Internal search error:', error);
      res.status(500).json({ message: error.message || "Internal search failed" });
    }
  });

  // ===== Dashboard Stats Endpoint =====
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get surplus equipment count (user-specific)
      const [surplusCount] = await db.select({ count: sql<number>`count(*)::int` })
        .from(equipment)
        .where(eq(equipment.createdBy, userId));
      
      // Get published equipment count
      const [publishedCount] = await db.select({ count: sql<number>`count(*)::int` })
        .from(equipment)
        .where(and(eq(equipment.createdBy, userId), eq(equipment.listingStatus, 'active')));
      
      // Get wishlist items count (user-specific)
      const [wishlistCount] = await db.select({ count: sql<number>`count(*)::int` })
        .from(wishlistItems)
        .where(eq(wishlistItems.createdBy, userId));
      
      // Get bids received on user's published equipment
      const userEquipment = await db.select({ id: equipment.id })
        .from(equipment)
        .where(and(eq(equipment.createdBy, userId), eq(equipment.listingStatus, 'active')));
      
      const equipmentIds = userEquipment.map(e => e.id);
      
      let bidsReceivedCount = 0;
      let totalBidValue = 0;
      let activeBidsCount = 0;
      
      if (equipmentIds.length > 0) {
        const bidsReceived = await db.select()
          .from(bids)
          .where(inArray(bids.equipmentId, equipmentIds));
        
        bidsReceivedCount = bidsReceived.length;
        activeBidsCount = bidsReceived.filter(b => b.status === 'pending').length;
        totalBidValue = bidsReceived
          .filter(b => b.status === 'pending')
          .reduce((sum, bid) => sum + parseFloat(bid.bidAmount), 0);
      }
      
      // Get matches count (user-specific - matches for user's wishlist items)
      const userWishlistItems = await db.select({ id: wishlistItems.id })
        .from(wishlistItems)
        .where(eq(wishlistItems.createdBy, userId));
      
      const wishlistItemIds = userWishlistItems.map(w => w.id);
      
      let matchesCount = 0;
      let newMatchesToday = 0;
      
      if (wishlistItemIds.length > 0) {
        const allMatches = await db.select()
          .from(matches)
          .where(inArray(matches.wishlistItemId, wishlistItemIds));
        
        matchesCount = allMatches.length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        newMatchesToday = allMatches.filter(m => m.createdAt >= today).length;
      }
      
      res.json({
        surplusCount: surplusCount.count || 0,
        publishedCount: publishedCount.count || 0,
        wishlistCount: wishlistCount.count || 0,
        bidsReceivedCount,
        activeBidsCount,
        totalBidValue,
        matchesCount,
        newMatchesToday,
      });
    } catch (error: any) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch dashboard stats" });
    }
  });

  // ===== Marketplace Endpoint (Public - shows all active equipment) =====
  app.get("/api/marketplace", requireAuth, async (req, res) => {
    try {
      // Marketplace shows ALL users' published equipment (not user-specific)
      const results = await db.select()
        .from(equipment)
        .where(eq(equipment.listingStatus, 'active'))
        .orderBy(desc(equipment.createdAt));
      
      res.json(results);
    } catch (error: any) {
      console.error('Marketplace error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch marketplace listings" });
    }
  });

  app.get("/api/surplus-projects", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const results = await db.select()
        .from(surplusProjects)
        .where(eq(surplusProjects.createdBy, userId))
        .orderBy(desc(surplusProjects.createdAt));
        
      res.json(results);
    } catch (error: any) {
      console.error('Get surplus projects error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch projects" });
    }
  });

  app.post("/api/surplus-projects", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertSurplusProjectSchema.parse(req.body);
      
      const result = await db.insert(surplusProjects)
        .values({
          ...validatedData,
          createdBy: userId,
        })
        .returning();
      
      res.json(result[0]);
    } catch (error: any) {
      console.error('Create surplus project error:', error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  app.get("/api/wishlist-projects", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const results = await db.select()
        .from(wishlistProjects)
        .where(eq(wishlistProjects.createdBy, userId))
        .orderBy(desc(wishlistProjects.createdAt));
        
      res.json(results);
    } catch (error: any) {
      console.error('Get wishlist projects error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch projects" });
    }
  });

  app.post("/api/wishlist-projects", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertWishlistProjectSchema.parse(req.body);
      
      const result = await db.insert(wishlistProjects)
        .values({
          ...validatedData,
          createdBy: userId,
        })
        .returning();
      
      res.json(result[0]);
    } catch (error: any) {
      console.error('Create wishlist project error:', error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  app.delete("/api/wishlist-projects/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      
      // Verify ownership before deleting
      const project = await db.select()
        .from(wishlistProjects)
        .where(eq(wishlistProjects.id, id))
        .limit(1);
      
      if (project.length === 0) {
        return res.status(404).json({ message: "Wishlist project not found" });
      }
      
      if (project[0].createdBy !== userId) {
        return res.status(403).json({ message: "You can only delete your own wishlist projects" });
      }
      
      // Cascade delete will automatically remove all items in the project
      await db.delete(wishlistProjects).where(eq(wishlistProjects.id, id));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete wishlist project error:', error);
      res.status(500).json({ message: error.message || "Failed to delete wishlist project" });
    }
  });

  app.get("/api/wishlist-items", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { projectId, status } = req.query;
      
      let query = db.select().from(wishlistItems);
      
      const conditions = [eq(wishlistItems.createdBy, userId)];
      
      if (projectId) {
        conditions.push(eq(wishlistItems.projectId, parseInt(projectId as string)));
      }
      if (status) {
        conditions.push(eq(wishlistItems.status, status as string));
      }
      
      query = query.where(and(...conditions)) as any;
      
      const results = await query.orderBy(desc(wishlistItems.createdAt));
      res.json(results);
    } catch (error: any) {
      console.error('Get wishlist items error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch wishlist items" });
    }
  });

  app.post("/api/wishlist-items", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertWishlistItemSchema.parse(req.body);
      
      const result = await db.insert(wishlistItems)
        .values({
          ...validatedData,
          createdBy: userId,
        })
        .returning();
      
      res.json(result[0]);
    } catch (error: any) {
      console.error('Create wishlist item error:', error);
      res.status(400).json({ message: error.message || "Failed to create wishlist item" });
    }
  });

  app.patch("/api/wishlist-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      const updates = req.body;
      
      // Verify ownership
      const currentItem = await db.select()
        .from(wishlistItems)
        .where(eq(wishlistItems.id, id))
        .limit(1);
      
      if (currentItem.length === 0) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }

      if (currentItem[0].createdBy !== userId) {
        return res.status(403).json({ message: "You can only edit your own wishlist items" });
      }

      // Prevent changing owner
      if (updates.createdBy && updates.createdBy !== userId) {
        return res.status(403).json({ message: "Cannot change wishlist item owner" });
      }

      // If projectId is being updated, verify the target project belongs to the user
      if (updates.projectId && updates.projectId !== currentItem[0].projectId) {
        const targetProject = await db.select()
          .from(wishlistProjects)
          .where(eq(wishlistProjects.id, updates.projectId))
          .limit(1);
        
        if (targetProject.length === 0) {
          return res.status(404).json({ message: "Target project not found" });
        }
        
        if (targetProject[0].createdBy !== userId) {
          return res.status(403).json({ message: "Cannot move item to another user's project" });
        }
      }

      const validatedUpdates = insertWishlistItemSchema.partial().parse(updates);
      
      const result = await db.update(wishlistItems)
        .set({
          ...validatedUpdates,
          updatedAt: new Date(),
        })
        .where(eq(wishlistItems.id, id))
        .returning();

      res.json(result[0]);
    } catch (error: any) {
      console.error('Update wishlist item error:', error);
      res.status(400).json({ message: error.message || "Failed to update wishlist item" });
    }
  });

  app.delete("/api/wishlist-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      
      // Verify ownership before deleting
      const item = await db.select()
        .from(wishlistItems)
        .where(eq(wishlistItems.id, id))
        .limit(1);
      
      if (item.length === 0) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
      
      if (item[0].createdBy !== userId) {
        return res.status(403).json({ message: "You can only delete your own wishlist items" });
      }
      
      // Cascade delete will automatically remove matches
      await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete wishlist item error:', error);
      res.status(500).json({ message: error.message || "Failed to delete wishlist item" });
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

  app.get("/api/matches/:wishlistItemId", requireAuth, async (req, res) => {
    try {
      const wishlistItemId = parseInt(req.params.wishlistItemId);
      const userId = req.session.userId!;
      
      // Verify that the wishlist item belongs to the user
      const wishlistItem = await db.select()
        .from(wishlistItems)
        .where(eq(wishlistItems.id, wishlistItemId))
        .limit(1);
      
      if (wishlistItem.length === 0) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
      
      if (wishlistItem[0].createdBy !== userId) {
        return res.status(403).json({ message: "You can only view matches for your own wishlist items" });
      }
      
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

  // ===== Bids Endpoints =====
  app.post("/api/bids", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = insertBidSchema.parse(req.body);
      
      // Verify the equipment exists and is active
      const equipmentData = await db.select()
        .from(equipment)
        .where(eq(equipment.id, validatedData.equipmentId))
        .limit(1);
      
      if (equipmentData.length === 0) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      if (equipmentData[0].listingStatus !== 'active') {
        return res.status(400).json({ message: "This equipment is no longer available for bidding" });
      }
      
      // Prevent users from bidding on their own equipment
      if (equipmentData[0].createdBy === userId) {
        return res.status(400).json({ message: "You cannot bid on your own equipment" });
      }
      
      // Create the bid - always set status to 'pending' (ignore client-provided status)
      const [newBid] = await db.insert(bids)
        .values({
          equipmentId: validatedData.equipmentId,
          bidAmount: validatedData.bidAmount,
          message: validatedData.message,
          bidderUserId: userId,
          status: 'pending', // Always pending for new bids
          expiresAt: validatedData.expiresAt,
        })
        .returning();
      
      res.json(newBid);
    } catch (error: any) {
      console.error('Create bid error:', error);
      res.status(500).json({ message: error.message || "Failed to submit bid" });
    }
  });
  
  app.get("/api/bids/received", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get all equipment owned by the user
      const userEquipment = await db.select({ id: equipment.id })
        .from(equipment)
        .where(eq(equipment.createdBy, userId));
      
      const equipmentIds = userEquipment.map(e => e.id);
      
      if (equipmentIds.length === 0) {
        return res.json([]);
      }
      
      // Get all bids on user's equipment with equipment details
      const bidsReceived = await db.select({
        bid: bids,
        equipment: equipment,
      })
        .from(bids)
        .innerJoin(equipment, eq(bids.equipmentId, equipment.id))
        .where(inArray(bids.equipmentId, equipmentIds))
        .orderBy(desc(bids.createdAt));
      
      res.json(bidsReceived);
    } catch (error: any) {
      console.error('Get bids received error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch bids" });
    }
  });
  
  // Get bids placed by the current user
  app.get("/api/bids/placed", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get all bids placed by the user with equipment details
      const bidsPlaced = await db.select({
        bid: bids,
        equipment: equipment,
      })
        .from(bids)
        .innerJoin(equipment, eq(bids.equipmentId, equipment.id))
        .where(eq(bids.bidderUserId, userId))
        .orderBy(desc(bids.createdAt));
      
      res.json(bidsPlaced);
    } catch (error: any) {
      console.error('Get bids placed error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch bids placed" });
    }
  });

  app.patch("/api/bids/:id/status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const bidId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'rejected'" });
      }
      
      // Get the bid with equipment details
      const [bidData] = await db.select({
        bid: bids,
        equipment: equipment,
      })
        .from(bids)
        .innerJoin(equipment, eq(bids.equipmentId, equipment.id))
        .where(eq(bids.id, bidId))
        .limit(1);
      
      if (!bidData) {
        return res.status(404).json({ message: "Bid not found" });
      }
      
      // Verify the user owns the equipment
      if (bidData.equipment.createdBy !== userId) {
        return res.status(403).json({ message: "You can only manage bids on your own equipment" });
      }
      
      // Update the bid status
      const [updatedBid] = await db.update(bids)
        .set({ 
          status,
          updatedAt: new Date(),
        })
        .where(eq(bids.id, bidId))
        .returning();
      
      res.json(updatedBid);
    } catch (error: any) {
      console.error('Update bid status error:', error);
      res.status(500).json({ message: error.message || "Failed to update bid status" });
    }
  });

  app.patch("/api/matches/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      const { status } = req.body;
      
      if (!['active', 'saved', 'dismissed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // First get the match to verify ownership via wishlist item
      const match = await db.select()
        .from(matches)
        .leftJoin(wishlistItems, eq(matches.wishlistItemId, wishlistItems.id))
        .where(eq(matches.id, id))
        .limit(1);
      
      if (match.length === 0) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      if (match[0].wishlist_items?.createdBy !== userId) {
        return res.status(403).json({ message: "You can only update matches for your own wishlist items" });
      }

      const result = await db.update(matches)
        .set({ status })
        .where(eq(matches.id, id))
        .returning();

      res.json(result[0]);
    } catch (error: any) {
      console.error('Update match status error:', error);
      res.status(500).json({ message: error.message || "Failed to update match status" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
