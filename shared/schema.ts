import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, serial, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
}).partial({ email: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Surplus Equipment Listings
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  createdBy: text("created_by").notNull(), // user email
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  category: text("category").notNull(),
  condition: text("condition").notNull(), // new, refurbished, used
  askingPrice: decimal("asking_price", { precision: 10, scale: 2 }).notNull(),
  location: text("location").notNull(),
  description: text("description"),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`), // Wasabi URLs
  documents: text("documents").array().default(sql`ARRAY[]::text[]`), // PDF URLs
  specifications: jsonb("specifications"), // { "Power": "500W", "Voltage": "220V" }
  listingStatus: text("listing_status").notNull().default('draft'), // draft, active, sold
  marketPriceRange: jsonb("market_price_range"), // { new_min, new_max, refurbished_min, refurbished_max, used_min, used_max }
  priceSource: text("price_source"), // real_data, ai_estimate
  priceBreakdown: jsonb("price_breakdown"), // detailed price data
  aiAnalysisData: jsonb("ai_analysis_data"), // AI suggestions from image analysis
  // Data enrichment fields - save all search results and marketplace listings
  savedMarketplaceListings: jsonb("saved_marketplace_listings"), // Array of { url, title, price, condition, source, savedAt }
  savedInternalMatches: jsonb("saved_internal_matches"), // Array of internal equipment IDs and details
  savedSearchResults: jsonb("saved_search_results"), // Full search results including PDF sources
  auctionReferences: jsonb("auction_references"), // Auction price data { url, title, soldPrice, condition, auctionDate }
  viewsCount: integer("views_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  listingStatusIdx: index("equipment_listing_status_idx").on(table.listingStatus),
  createdByIdx: index("equipment_created_by_idx").on(table.createdBy),
}));

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  viewsCount: true,
}).extend({
  askingPrice: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

// Surplus Projects (for grouping equipment)
export const surplusProjects = pgTable("surplus_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSurplusProjectSchema = createInsertSchema(surplusProjects).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export type InsertSurplusProject = z.infer<typeof insertSurplusProjectSchema>;
export type SurplusProject = typeof surplusProjects.$inferSelect;

// Equipment-Project association (many-to-many)
export const equipmentProjects = pgTable("equipment_projects", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  projectId: integer("project_id").notNull().references(() => surplusProjects.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueEquipmentProject: unique().on(table.equipmentId, table.projectId),
}));

export const insertEquipmentProjectSchema = createInsertSchema(equipmentProjects).omit({
  id: true,
});

export type InsertEquipmentProject = z.infer<typeof insertEquipmentProjectSchema>;
export type EquipmentProject = typeof equipmentProjects.$inferSelect;

// Wishlist Projects
export const wishlistProjects = pgTable("wishlist_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  totalBudget: decimal("total_budget", { precision: 12, scale: 2 }),
  deadline: timestamp("deadline"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWishlistProjectSchema = createInsertSchema(wishlistProjects).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export type InsertWishlistProject = z.infer<typeof insertWishlistProjectSchema>;
export type WishlistProject = typeof wishlistProjects.$inferSelect;

// Wishlist Items
export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => wishlistProjects.id, { onDelete: 'cascade' }),
  createdBy: text("created_by").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  category: text("category").notNull(),
  preferredCondition: text("preferred_condition").notNull().default('any'), // new, refurbished, used, any
  location: text("location").notNull(),
  maxBudget: decimal("max_budget", { precision: 10, scale: 2 }).notNull(),
  priority: text("priority").notNull().default('medium'), // high, medium, low
  requiredSpecs: jsonb("required_specs"), // { "Flow Rate": ">=5 mL/min" }
  notes: text("notes"),
  imageUrls: text("image_urls").array(),
  documentUrls: text("document_urls").array(),
  status: text("status").notNull().default('active'), // active, draft, found
  marketPriceRange: jsonb("market_price_range"), // price context for budget validation
  priceSource: text("price_source"),
  priceBreakdown: text("price_breakdown"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("wishlist_items_project_id_idx").on(table.projectId),
  statusIdx: index("wishlist_items_status_idx").on(table.status),
  createdByIdx: index("wishlist_items_created_by_idx").on(table.createdBy),
}));

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

// Matches (Wishlist to Equipment)
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  wishlistItemId: integer("wishlist_item_id").notNull().references(() => wishlistItems.id, { onDelete: 'cascade' }),
  equipmentId: integer("equipment_id").references(() => equipment.id, { onDelete: 'cascade' }), // nullable for external matches
  matchType: text("match_type").notNull(), // exact, variant, related, alternative
  confidenceScore: integer("confidence_score").notNull(), // 0-100
  matchDetails: jsonb("match_details"), // { matching_features: [], differences: [], spec_comparison: {} }
  // External match structured fields (for queryable access)
  externalSource: text("external_source"), // 'google_shopping', 'external_marketplace', etc.
  externalUrl: text("external_url"),
  externalTitle: text("external_title"),
  externalPrice: decimal("external_price", { precision: 10, scale: 2 }),
  externalCondition: text("external_condition"),
  externalListingData: jsonb("external_listing_data"), // additional metadata
  status: text("status").notNull().default('active'), // active, saved, dismissed
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  wishlistItemIdIdx: index("matches_wishlist_item_id_idx").on(table.wishlistItemId),
  statusIdx: index("matches_status_idx").on(table.status),
}));

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
});

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

// Bids table (for marketplace bidding on published equipment)
export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  bidderUserId: text("bidder_user_id").notNull(), // User ID who placed the bid
  bidAmount: decimal("bid_amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"), // Optional message from bidder
  status: text("status").notNull().default('pending'), // pending, accepted, rejected, expired
  expiresAt: timestamp("expires_at"), // Optional expiration date for bid
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  equipmentIdIdx: index("bids_equipment_id_idx").on(table.equipmentId),
  bidderUserIdIdx: index("bids_bidder_user_id_idx").on(table.bidderUserId),
  statusIdx: index("bids_status_idx").on(table.status),
}));

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  bidderUserId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;

// Price Context Cache (to avoid repeated API calls)
export const priceContextCache = pgTable("price_context_cache", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  category: text("category"),
  priceRanges: jsonb("price_ranges").notNull(), // { new_min, new_max, ... }
  priceSource: text("price_source").notNull(),
  priceBreakdown: jsonb("price_breakdown"),
  hasMarketplaceData: text("has_marketplace_data").notNull().default('false'), // 'true' if scraped from real marketplaces
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // cache expires: AI=15min, marketplace=3days
}, (table) => ({
  uniqueBrandModel: unique().on(table.brand, table.model, table.category),
  expiresAtIdx: index("price_context_cache_expires_at_idx").on(table.expiresAt),
}));

export const insertPriceContextCacheSchema = createInsertSchema(priceContextCache).omit({
  id: true,
  createdAt: true,
});

export type InsertPriceContextCache = z.infer<typeof insertPriceContextCacheSchema>;
export type PriceContextCache = typeof priceContextCache.$inferSelect;
