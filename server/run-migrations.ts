import pg from 'pg';

const migrationSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT
);

-- Session store table (for connect-pg-simple)
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON user_sessions (expire);

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  created_by TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  asking_price DECIMAL(10,2) NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  images TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  documents TEXT[] DEFAULT ARRAY[]::text[],
  specifications JSONB,
  listing_status TEXT NOT NULL DEFAULT 'draft',
  market_price_range JSONB,
  price_source TEXT,
  price_breakdown JSONB,
  ai_analysis_data JSONB,
  saved_marketplace_listings JSONB,
  saved_internal_matches JSONB,
  saved_search_results JSONB,
  auction_references JSONB,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS equipment_listing_status_idx ON equipment (listing_status);
CREATE INDEX IF NOT EXISTS equipment_created_by_idx ON equipment (created_by);

-- Surplus projects
CREATE TABLE IF NOT EXISTS surplus_projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Equipment projects association
CREATE TABLE IF NOT EXISTS equipment_projects (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES surplus_projects(id) ON DELETE CASCADE,
  UNIQUE(equipment_id, project_id)
);

-- Wishlist projects
CREATE TABLE IF NOT EXISTS wishlist_projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  total_budget DECIMAL(12,2),
  deadline TIMESTAMP,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Wishlist items
CREATE TABLE IF NOT EXISTS wishlist_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES wishlist_projects(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  preferred_condition TEXT NOT NULL DEFAULT 'any',
  location TEXT NOT NULL DEFAULT '',
  max_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  required_specs JSONB,
  notes TEXT,
  image_urls TEXT[],
  document_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  market_price_range JSONB,
  price_source TEXT,
  price_breakdown TEXT,
  saved_marketplace_listings JSONB,
  saved_internal_matches JSONB,
  saved_search_results JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS wishlist_items_project_id_idx ON wishlist_items (project_id);
CREATE INDEX IF NOT EXISTS wishlist_items_status_idx ON wishlist_items (status);
CREATE INDEX IF NOT EXISTS wishlist_items_created_by_idx ON wishlist_items (created_by);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  wishlist_item_id INTEGER NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
  equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  confidence_score INTEGER NOT NULL DEFAULT 0,
  match_details JSONB,
  external_source TEXT,
  external_url TEXT,
  external_title TEXT,
  external_price DECIMAL(10,2),
  external_condition TEXT,
  external_listing_data JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS matches_wishlist_item_id_idx ON matches (wishlist_item_id);
CREATE INDEX IF NOT EXISTS matches_status_idx ON matches (status);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  bidder_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS bids_equipment_id_idx ON bids (equipment_id);
CREATE INDEX IF NOT EXISTS bids_bidder_id_idx ON bids (bidder_id);

-- Price context cache
CREATE TABLE IF NOT EXISTS price_context_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  price_data JSONB NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS price_context_cache_key_idx ON price_context_cache (cache_key);
CREATE INDEX IF NOT EXISTS price_context_cache_expires_idx ON price_context_cache (expires_at);
`;

export async function runMigrations(): Promise<void> {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('[Migration] Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('[Migration] Running migrations...');
      await client.query(migrationSQL);
      console.log('[Migration] All tables created successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Migration] Error running migrations:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
