# 🚀 EquipTradeV1 - Complete Research Equipment Marketplace Platform

Build a professional **Research Equipment Marketplace** with AI-powered features, real-time price discovery from actual market data, and intelligent automation. This platform enables scientific and industrial equipment trading with multi-modal AI assistance.

---

## 🎯 Platform Overview - 5 Core Sections

The platform consists of **5 main user-facing sections**, each with comprehensive functionality:

1. **📦 Marketplace** - Browse and buy equipment with real market price context
2. **📊 Dashboard** - Track bids, offers, and wishlist matches
3. **🎯 Wishlist** - AI-powered equipment matching with price intelligence
4. **🏭 Surplus** - Sell equipment with AI auto-fill and price validation
5. **👤 Profile** - Account settings and preferences

---

## 1️⃣ MARKETPLACE Section - Complete Functionality

### Core Features

**Equipment Browsing:**
- Grid view (cards) or List view toggle
- Equipment cards display:
  - Brand and Model (prominent heading)
  - Condition badge (New/Refurbished/Used with color coding)
  - Asking price (large, bold)
  - Location with pin icon
  - Category tag
  - Primary image thumbnail
  - AI price variance indicator (e.g., "+15% vs market" in red/yellow/green)
  - Checkbox for bulk selection

**Advanced Search & Filters:**
- **Text Search**: Search across brand, model, description (real-time)
- **Category Filter**: Dropdown with options (Analytical, Processing, Packaging, Testing, Production, Measurement, Safety, Automation, Other)
- **Condition Filter**: New, Refurbished, Used, All Conditions
- **Price Range**: Min and Max price sliders
- **Location Filter**: Text input for location search
- Real-time filtering as user types/selects

**Equipment Detail View (5-Tab Modal):**

*Tab 1: Overview*
- Key information card:
  - Brand, Model, Category
  - Condition badge
  - Location
  - Asking price (prominent)
- Quick Summary (first 200 characters of description)
- Top 4 specifications preview
- Navigation links to other tabs ("View Full Description →", "See All Specs →")

*Tab 2: Description*
- Full product description with preserved formatting
- Professional prose layout
- Read more/less for long descriptions

*Tab 3: Specifications*
- All technical specs in responsive grid (3-4 columns)
- Each spec in its own card with:
  - Label (e.g., "Power")
  - Value (e.g., "500W")
- Empty state: "No specifications available" if none

*Tab 4: Pricing* (CRITICAL - Real Market Price Intelligence)
- Large asking price display at top
- **"Request Price Context" button**:
  - When clicked, calls Price API to fetch real market prices
  - Shows loading spinner: "Searching real market prices..."
  - Price discovery process:
    1. Search Google Shopping for product (Apify)
    2. Search Google for "{brand} {model} (price OR cost OR buy) -pdf" (Apify)
    3. Extract URLs from search results
    4. Filter irrelevant products (spare parts, wrong models)
    5. Fetch actual prices from product listing URLs (HTML parsing)
    6. Fallback to snippet extraction if URL fetch fails
    7. Group prices by condition (new/refurbished/used)
    8. Calculate averages per condition
    9. If no real prices found, fallback to AI estimation (OpenAI)
  - Price source badge:
    - **"Real Market Data"** (green) if aggregated from actual products
    - **"AI Estimate"** (yellow) if using OpenAI fallback
- **Visual Price Bar** (PriceBar component):
  - Horizontal bar divided into 3 color zones:
    - Green: Used price range (left)
    - Yellow: Refurbished price range (middle)
    - Red: New price range (right)
  - Asking price marker showing where seller's price sits
  - Price labels at boundaries: Min Used, Max Used, Max Refurbished, Max New
- Price breakdown:
  - **New**: $XX,XXX - $XX,XXX
  - **Refurbished**: $XX,XXX - $XX,XXX
  - **Used**: $XX,XXX - $XX,XXX
- Estimated crating cost
- Estimated shipping cost
- Market notes (context about pricing)
- **DEV MODE**: Debug panel showing:
  - Google query used
  - Search method (real data vs AI)
  - Total candidates found
  - Candidates with prices
  - First 3 URLs with titles
  - Fallback reason (if AI used)
  - Timestamp

*Tab 5: Match Details* (Only if equipment from wishlist)
- Side-by-side comparison:
  - Left: "Your Requirements" (wishlist criteria)
  - Right: "This Equipment" (actual equipment)
- Match indicators:
  - Brand: ✓ or ✗
  - Model: ✓ or ✗
  - Condition: Match or Different with color coding
  - Budget: Within/Over budget with color coding
- Match score percentage
- Match type badge (Exact Match, Variant, Related, Alternative)
- Key matching features list
- Key differences highlighted
- Recommendation text

**Bidding System:**
- "Place Bid" button on each equipment card
- Bid dialog with:
  - Equipment summary (brand, model, asking price)
  - Bid amount input (number)
  - Notes textarea (optional)
  - 30-day validity period (auto-calculated)
  - Submit button
- Optimistic UI update: Bid button changes to "Bid Placed" immediately
- Actual bid saved to database
- Error handling with rollback if submission fails

**Bulk Operations:**
- Checkbox selection on equipment cards
- Selected count indicator: "X items selected"
- "Create Bulk Offer" button when items selected
- Bulk offer dialog:
  - List of selected equipment
  - Individual asking prices
  - Total asking price sum
  - Your bulk offer amount (single input)
  - Discount percentage calculation (auto-calculated)
  - Notes for seller
  - Submit button
- Bulk offer tracked in Dashboard

**Listing Status Filter:**
- **CRITICAL**: Only show equipment with `listing_status = 'active'`
- Draft equipment (not yet published) NEVER appears on marketplace
- This prevents incomplete/test listings from being visible

**Empty States:**
- No equipment found: Helpful message with "Try adjusting filters" suggestion
- No results for search: "No matches for [search term]" with reset button

---

## 2️⃣ DASHBOARD Section - Complete Functionality

### Core Features

**Quick Stats Cards (Top Row):**
- **Total Active Bids**: Count of pending bids
  - Icon: Gavel
  - Click to view bids section
- **Total Wishlist Items**: Count of items in all wishlists
  - Icon: Target
  - Click to navigate to wishlist
- **New Matches Today**: Count of new wishlist matches
  - Icon: Sparkles
  - Click to view matches section
- **Total Bid Value**: Sum of all pending bid amounts
  - Icon: Dollar Sign
  - Formatted as currency

**Priority Actions Section (Alerts):**
- **Expiring Bids Alert**:
  - Red alert box
  - "X bids expiring in 7 days"
  - List of expiring bids with equipment details
  - Quick action: "Renew" or "Withdraw"
- **High Confidence Matches Alert**:
  - Green alert box
  - "X high-confidence wishlist matches found"
  - Preview of top 3 matches
  - Quick action: "View All Matches"

**Active Bids Section:**
- List/table view of all pending bids
- Each bid shows:
  - Equipment thumbnail image
  - Equipment name (brand + model)
  - Your bid amount (bold)
  - Asking price (for comparison)
  - Bid status badge:
    - **Pending** (yellow): Awaiting seller response
    - **Accepted** (green): Seller accepted
    - **Rejected** (red): Seller rejected
    - **Outbid** (orange): Another bidder offered more
  - Days until expiration
  - Created date
- Actions per bid:
  - **View Equipment**: Opens equipment detail modal
  - **Withdraw Bid**: Cancel bid (with confirmation)
- Sort options: Date, Amount, Status
- Filter by status

**Bulk Offers Section:**
- List of created bulk offers
- Each offer shows:
  - Offer name (auto-generated: "Bulk Offer #X")
  - Number of items included (e.g., "5 items")
  - Total offer amount
  - Total asking price (for comparison)
  - Discount percentage (calculated)
  - Status badge:
    - **Pending**: Awaiting seller response
    - **Partially Accepted**: Seller accepted some items
    - **Accepted**: All items accepted
    - **Rejected**: Offer declined
  - Created date
- Click to expand offer details:
  - List of individual equipment items
  - Individual asking prices
  - Seller response per item
  - Your notes to seller
- Actions:
  - **View Items**: Show all equipment in offer
  - **Modify Offer**: Edit amount or notes (if still pending)
  - **Withdraw Offer**: Cancel (with confirmation)

**Wishlist Matches Section:**
- Real-time match notifications
- Each match shows:
  - Wishlist item name (from your wishlist)
  - Matched equipment (brand + model)
  - Match confidence level:
    - **High** (80-100%): Green indicator
    - **Medium** (50-79%): Yellow indicator
    - **Low** (< 50%): Red indicator
  - Match type badge (Exact/Variant/Related/Alternative)
  - Brief match explanation ("Same brand and model, similar specs")
  - Equipment price vs your budget
  - Days since match found
- Actions per match:
  - **View Details**: Opens equipment detail modal with match tab
  - **Place Bid**: Pre-fills bid form with budget amount
  - **Save Match**: Bookmark for later
  - **Dismiss**: Remove from list
- Filter by:
  - Confidence level
  - Match type
  - Wishlist project
  - Date found

**Saved Matches Overview:**
- Equipment you've bookmarked for later review
- Card view with:
  - Equipment thumbnail
  - Brand + Model
  - Asking price
  - Why saved (notes)
  - Date saved
- Quick actions:
  - View full details
  - Place bid
  - Remove from saved

**Recent Activity Feed:**
- Timeline of recent actions with timestamps
- Activity types:
  - **Bid Placed**: "You bid $X on [Equipment]"
  - **Bid Status Change**: "Your bid on [Equipment] was accepted"
  - **Bulk Offer Created**: "You created Bulk Offer #X (Y items)"
  - **Match Found**: "New match: [Equipment] for your [Wishlist Item]"
  - **Equipment Published**: "Your [Equipment] is now live on marketplace"
  - **Equipment Sold**: "Your [Equipment] was purchased"
- Each activity shows:
  - Icon representing action type
  - Description text
  - Timestamp (e.g., "2 hours ago", "Yesterday", "3 days ago")
  - Link to relevant item
- "View All Activity" button for complete history

**View Modes:**
- **Overview Tab** (default): Quick stats + priority actions + recent bids + saved matches
- **Bids Tab**: Full list of all bids (active, expired, rejected)
- **Matches Tab**: All wishlist matches with advanced filtering
- **Saved Matches Tab**: All bookmarked equipment

---

## 3️⃣ WISHLIST Section - Complete Functionality

### Core Features

**Wishlist Projects:**
- Organize wishlist items into named projects
- Create new project:
  - Project name input (e.g., "Lab Expansion Q1 2025")
  - Optional budget for entire project
  - Optional timeline/deadline
  - Save button
- View all projects:
  - Card view showing:
    - Project name
    - Number of items in project
    - Total budget spent vs allocated
    - Match status: "X of Y items matched"
    - Created date
  - Click to view project details

**Add Wishlist Item:**
- Form fields:
  - **Brand** (text input, required)
  - **Model** (text input, required)
  - **Category** (dropdown: Analytical, Processing, etc.)
  - **Preferred Condition** (dropdown):
    - New only
    - Refurbished only
    - Used only
    - Any condition (default)
  - **Maximum Budget** (number input, required)
  - **Priority** (dropdown):
    - High (urgent need)
    - Medium (planned purchase)
    - Low (nice to have)
  - **Notes** (textarea, optional): Specific requirements or preferences
  - **Assign to Project** (dropdown): Select existing project or "Create New"
- "Save & Find Matches" button
- "Save as Draft" button (save without triggering matching)

**AI-Powered Matching (Automatic Background Process):**

When user saves wishlist item with "Save & Find Matches":

*Step 1: Create Matching Job* (user doesn't see "job", it's internal)
- System creates background processing job
- User sees loading indicator: "Searching for matches..."
- Progress indicators:
  - "Searching internal database..." (0-30%)
  - "Searching external listings..." (30-70%)
  - "Analyzing specifications..." (70-100%)

*Step 2: Multi-Source Search* (Background - 2-3 minutes)
1. **Internal Database Search**:
   - Query PostgreSQL for existing equipment
   - Match on: brand (exact + fuzzy), model (exact + fuzzy), category
   - Calculate initial similarity scores

2. **External Google Search** (via Apify):
   - Google Shopping scraper for "{brand} {model}"
   - General Google search for equipment listings
   - Extract product URLs, titles, snippets
   - Filter relevant results (remove spare parts, accessories)

3. **PDF Manual Discovery** (via Apify):
   - Search Google for "{brand} {model} (manual OR specification OR datasheet) filetype:pdf"
   - Download relevant PDFs
   - Extract text from PDFs

4. **Specification Extraction** (OpenAI GPT-4o-mini):
   - Analyze PDF text to extract technical specs
   - Focus on: dimensions, power, voltage, capacity, weight, accuracy
   - Structure specs as key-value pairs

5. **Visual Analysis** (OpenAI GPT-4o Vision):
   - If images available, extract images from PDFs
   - Compare equipment images with PDF manual images
   - Calculate visual similarity score (0-100)

6. **AI Similarity Scoring** (OpenAI GPT-4o):
   - Compare wishlist criteria with found equipment
   - Weighted scoring algorithm:
     - **Brand Match**: 25% weight
       - Exact match: 100 points
       - Parent company/subsidiary: 75 points
       - Different brand: 0 points
     - **Model Match**: 30% weight
       - Exact match: 100 points
       - Model variant (e.g., 620Bp vs 620B): 80 points
       - Similar model series: 50 points
       - Different model: 0 points
     - **Visual Similarity**: 35% weight
       - From OpenAI Vision comparison (0-100)
     - **Technical Specs**: 10% weight
       - Semantic similarity of specifications (0-100)
   - **Total Score**: Weighted average (0-100)

7. **Match Categorization**:
   - **Exact Match** (90-100 score): Same brand, same model, high visual similarity
   - **Variant** (70-89 score): Same brand, model variant, similar specs
   - **Related** (50-69 score): Same brand OR similar model, partial spec match
   - **Alternative** (30-49 score): Different brand, similar function/specs

8. **Price Context Enrichment** (Critical Feature):
   - For EACH matched equipment, automatically fetch real market prices:
     - Call Price API with equipment brand/model
     - Google Shopping search (Apify)
     - Google search for "{brand} {model} (price OR cost OR buy) -pdf" (Apify)
     - Extract prices from product listing URLs
     - Group by condition (new/refurbished/used)
     - Calculate averages per condition
     - Fallback to AI estimation if no real prices
   - Store price context with match:
     - `new_min`, `new_max`
     - `refurbished_min`, `refurbished_max`
     - `used_min`, `used_max`
     - `price_source`: "aggregated_from_products" or "ai_estimate"
     - `price_breakdown`: Details of price sources

*Step 3: Results Display*
- Loading spinner disappears
- Match count appears: "Found X matches"
- Matches displayed as cards, sorted by confidence (highest first)

**Match Results Display:**

Each match card shows:
- Equipment thumbnail image
- Brand + Model
- Condition badge
- Asking price (bold)
- **Match Information**:
  - Match type badge with icon:
    - Exact Match (green, checkmark icon)
    - Variant (blue, info icon)
    - Related (yellow, link icon)
    - Alternative (gray, sparkles icon)
  - Confidence score:
    - High (80-100%): Green progress bar
    - Medium (50-79%): Yellow progress bar
    - Low (30-49%): Red progress bar
  - Brief explanation: "Same brand and model, visual match confirmed"
- **Price Intelligence** (CRITICAL):
  - **Visual Price Bar** showing market context:
    - Used range (green)
    - Refurbished range (yellow)  
    - New range (red)
    - Budget marker showing wishlist max budget position
  - Price source indicator:
    - "Based on X real market listings" (green badge)
    - "AI estimated prices" (yellow badge)
  - Price comparison:
    - Equipment asking price vs your budget
    - Color coding:
      - Green: Under budget
      - Yellow: Near budget (within 10%)
      - Red: Over budget
  - Budget analysis: "This is $X under/over your budget"
- **Match Details**:
  - Key matching features:
    - "✓ Brand match: [Brand]"
    - "✓ Model match: [Model]"
    - "✓ Visual confirmation from manual"
    - "✓ Specifications match: [X of Y specs]"
  - Key differences:
    - "⚠ Condition: Used (you prefer New)"
    - "⚠ Location: 500 miles away"
    - "⚠ Price: $X over budget"

**Actions per Match:**
- **View Full Details**: Opens equipment detail dialog
  - Automatically shows Match Details tab
  - Full 5-tab view with pricing context
- **Place Bid**: 
  - Pre-fills bid form with your budget amount
  - Shows price context in bid dialog
  - One-click to marketplace bidding
- **Save Match**: Bookmark for later review (appears in Dashboard)
- **Dismiss**: Remove from match list
- **Request Updated Prices**: Re-fetch market price context

**Wishlist Item Management:**
- View all items in list/grid
- Each item shows:
  - Brand + Model
  - Category, Condition preference
  - Max budget
  - Priority level
  - Match count: "X matches found"
  - Last matched date
  - **Price Context** (CRITICAL):
    - "Request Price Context" button for each wishlist item
    - Shows typical market prices for the equipment you want
    - Visual price bar showing if your budget is realistic
    - Price source badge (real data vs AI estimate)
    - Helps user adjust budget if needed
- Actions per item:
  - **Edit**: Modify criteria (budget, condition, notes)
  - **Re-run Matching**: Trigger new search (manual refresh)
  - **View Matches**: Jump to matches for this item
  - **Mark as Found**: When purchased (changes status, keeps history)
  - **Delete**: Remove wishlist item

**Filter & Sort Matches:**
- Filter by:
  - Match type (Exact, Variant, Related, Alternative)
  - Confidence level (High, Medium, Low)
  - Price (Under budget, Near budget, Over budget)
  - Condition
  - Location proximity
  - Date found
- Sort by:
  - Confidence (default)
  - Price (low to high / high to low)
  - Date found (newest / oldest)
  - Distance (if location set)

**Wishlist Analytics:**
- Summary statistics:
  - Total items in wishlist
  - Total budget allocated
  - Items with matches
  - Items without matches
  - Average match confidence
- Price intelligence summary:
  - Total estimated cost based on market prices
  - Budget vs market reality gap
  - Recommendations for budget adjustments

---

## 4️⃣ SURPLUS Section - Complete Functionality

### Core Features

**Three Tabs:**
- **Drafts**: Unpublished equipment (private, editable)
- **Active Listings**: Published equipment (live on marketplace)
- **Projects**: Grouped equipment (bulk offers)

**Submit New Equipment (3-Step AI Workflow):**

*Step 1: Image Upload*
- Drag-and-drop zone or click to browse
- Multiple image upload supported (1-10 images)
- Image preview thumbnails with:
  - Image preview
  - File name
  - File size
  - Delete button (X icon)
  - Reorder capability (drag thumbnails)
- File validation:
  - Accepted formats: JPG, PNG, WebP
  - Max size: 10MB per image
  - Min dimensions: 400x400px recommended
- Upload to Wasabi cloud storage
- Progress indicators for each upload

*Step 2: AI-Powered Auto-Fill Workflow* (CRITICAL)

**2a. Image Analysis** (First AI step):
- Trigger: Automatically when images uploaded
- Loading state: "Analyzing images..."
- Process:
  1. **Analyze ALL uploaded images** (not just first one):
     - For each image, call Apify Image-to-JSON for initial extraction
     - Fallback to OpenAI GPT-4o Vision for enhancement
     - Extract: Brand name, Model number, Confidence score
  2. **Weighted Scoring Algorithm**:
     ```
     Score = (brand_confidence * 2.0) + (model_confidence * 1.0) + overall_confidence
     ```
     - Brand detection weighted higher (2.0x) because it's more reliable
     - Model detection weighted (1.0x)
     - Overall confidence added
  3. **Select Best Result**:
     - Choose image analysis with highest score
     - Use that result to pre-fill brand and model
- Success state:
  - ✓ "Found: [Brand] [Model]"
  - Confidence indicator: Green (high) / Yellow (medium) / Red (low)
  - Auto-populated fields:
    - Brand input
    - Model input
- Failure state:
  - ⚠ "Could not identify equipment from images"
  - Fields left empty for manual entry
  - Continue to next step anyway (non-blocking)

**2b. Manual Search** (Second AI step):
- Trigger: Automatically after image analysis completes
- Loading state: "Searching for product manual..."
- Process:
  1. Google PDF search via Apify:
     - Query: "{brand} {model} (manual OR specification OR datasheet) filetype:pdf"
     - Example: "Thermo Fisher TSQ Altis (manual OR specification OR datasheet) filetype:pdf"
     - Max 10 PDF results
  2. Download and verify relevant PDFs
  3. Extract text from PDFs using pdfplumber/PyMuPDF
- Success state:
  - ✓ "Manual found: [PDF filename]"
  - PDF link shown (clickable to view)
  - Proceed to Step 2c
- Partial success:
  - ⚠ "Manual not found - using web search fallback"
  - Still proceed (non-blocking)
- Failure state:
  - ℹ "No manual found (you can still proceed)"
  - User can manually upload PDF or continue
  - Process continues to Step 2c

**2c. Specification Extraction** (Third AI step):
- Trigger: Automatically if manual found OR web fallback
- Loading state: "Extracting specifications..."
- Process:
  1. **If PDF manual found**:
     - Extract full text from PDF
     - Send to OpenAI GPT-4o-mini with prompt:
       ```
       Extract technical specifications from this equipment manual.
       Focus on: dimensions, power, voltage, capacity, weight, accuracy,
       temperature range, flow rate, pressure, materials.
       Return as JSON key-value pairs.
       ```
  2. **If no PDF (web fallback)**:
     - Search Google for "{brand} {model} specifications"
     - Extract text from top 3 product pages
     - Send to OpenAI GPT-4o-mini for extraction
  3. Parse JSON response
  4. Auto-populate specification fields
- Success state:
  - ✓ "Extracted X specifications"
  - Specs shown in editable key-value pairs:
    - Power: 500W
    - Voltage: 220V
    - Dimensions: 50x40x30 cm
    - etc.
  - User can edit, add, or remove

**2d. Visual Validation** (Fourth AI step):
- Trigger: Automatically if PDF manual found
- Loading state: "Validating equipment with manual..."
- Process:
  1. Extract images from PDF manual (first 10 images)
  2. For each PDF image, compare with user's uploaded images
  3. OpenAI GPT-4o Vision analysis:
     - Input: User image + PDF manual image
     - Prompt: "Compare these equipment images. Identify matching features, differences, and similarity."
     - Output: Similarity score (0-100), matching features, differences
  4. Calculate match category:
     - Exact Match (90-100): Same equipment, same configuration
     - Variant (70-89): Same base model, different accessories/options
     - Related (50-69): Similar equipment family
     - Alternative (30-49): Different but comparable equipment
- Success state:
  - Visual match badge:
    - **Exact Match** (Green ✓): "Images match product manual"
    - **Variant** (Blue ℹ): "Similar to manual, possible variant"
    - **Related** (Yellow ⚠): "Related equipment detected"
    - **Alternative** (Red ✗): "Different from manual"
  - Confidence indicator
  - Matching features listed:
    - "Same control panel layout"
    - "Matching brand logo position"
    - "Identical display interface"
  - Differences highlighted:
    - "Missing optional module visible in manual"
    - "Different color scheme"
- Failure state:
  - ℹ "Visual validation skipped (no manual images found)"

**2e. Descriptive Fallback** (If brand/model extraction fails):
- Trigger: If image analysis couldn't identify brand/model
- Process:
  - OpenAI GPT-4o Vision analyzes images
  - Generates descriptive equipment summary:
    - "Large analytical chromatography system with integrated detector and autosampler module. Features digital control panel and stainless steel construction."
  - Pre-fills description field
  - User can edit as needed
- Ensures users always get meaningful text, never "N/A" placeholders

*Step 3: Review & Edit Form*

After AI workflow completes, show pre-filled form:

**Equipment Details:**
- **Brand** (text input, auto-filled, editable, required)
- **Model** (text input, auto-filled, editable, required)
- **Category** (dropdown, suggested or manual select, required):
  - Analytical, Chromatography, Spectrometry, Processing, Packaging, Testing, Production, Measurement, Safety, Automation, Other
- **Condition** (dropdown, required):
  - New
  - Refurbished
  - Used
- **Asking Price** (number input, required)
  - Currency: USD (default)
  - Validation: Must be positive number
- **Location** (text input, required)
  - Format: "City, State" or "City, Country"
- **Description** (textarea, auto-filled or generated, required)
  - Minimum 50 characters
  - Supports paragraphs
  - AI-generated fallback if extraction failed

**Specifications** (Dynamic Key-Value Pairs):
- Auto-populated from PDF extraction
- Each spec shows as row:
  - Key input (e.g., "Power")
  - Value input (e.g., "500")
  - Unit input (e.g., "W")
  - Delete button
- "Add Specification" button:
  - Adds empty row
  - User can add custom specs
- Specs stored as JSON object in database

**Images**:
- Uploaded images displayed as thumbnails
- Reorder by drag-and-drop
- Delete individual images
- Upload additional images
- First image used as primary thumbnail

**Documents** (Optional):
- Upload related PDFs (manuals, certificates, etc.)
- Each document shows:
  - Filename
  - File size
  - Delete button
- Stored in Wasabi cloud storage

**Price Context Validation** (CRITICAL):
- **"Request Price Context" button**:
  - Calls Price API with entered brand/model
  - Fetches real market prices from Google Shopping + web search
  - Shows loading: "Checking market prices..."
  - Displays results:
    - **Visual Price Bar**:
      - Shows market ranges for new/refurbished/used
      - Your asking price marked on bar
      - Color coding:
        - Green: Competitively priced (within market range)
        - Yellow: Slightly above market
        - Red: Significantly above market
    - Price source badge:
      - "Based on X real listings" (green)
      - "AI estimated" (yellow)
    - Price intelligence:
      - "Your price is X% below/above market average for [condition]"
      - Recommendations:
        - "Good price - likely to sell quickly"
        - "Consider lowering to $X for faster sale"
        - "Priced high - may take longer to sell"
  - Market price data saved with equipment:
    - `market_price_range`: { new_min, new_max, refurbished_min, refurbished_max, used_min, used_max }
    - `price_source`: "aggregated_from_products" or "ai_estimate"
    - `price_breakdown`: Array of individual prices found
  - **DEV MODE**: Shows debug info:
    - Google queries used
    - Number of listings found
    - URLs scraped
    - Prices extracted
    - Fallback reasons if AI used

**AI Analysis Summary Panel** (Collapsible):
- Shows complete AI workflow results:
  - Image analysis: Brand + Model + Confidence
  - Manual search: PDF found or not
  - Specs extracted: Count
  - Visual validation: Match type + Confidence
  - Description generated: Yes/No
- Confidence scores for each step
- Edit button to manually override any AI-filled field

*Step 4: Save or Publish*

**Save as Draft**:
- Saves equipment to database with `listing_status = 'draft'`
- Equipment visible only in your Surplus > Drafts tab
- NOT visible on public marketplace
- Can edit anytime
- Can delete if not needed
- Can publish later when ready

**Publish**:
- Validation:
  - All required fields filled
  - At least 1 image uploaded
  - Asking price > 0
  - Location specified
- Confirmation dialog:
  - "Publish [Brand] [Model]?"
  - Summary:
    - Images: X
    - Specs: X
    - Price: $X
    - Market comparison: [competitive/above/below market]
  - "Publish" button (green)
  - "Cancel" button
- On publish:
  - Sets `listing_status = 'active'`
  - Equipment immediately appears on Marketplace
  - Searchable and biddable by all users
  - Can still edit (but requires re-approval/validation)
- Success message: "Equipment published successfully!"

**Drafts Tab Features:**
- View all draft equipment (grid or list)
- Each draft shows:
  - Thumbnail
  - Brand + Model
  - Category, Condition
  - Asking price (if set)
  - Completion percentage:
    - 25%: Only brand/model
    - 50%: + Category/condition
    - 75%: + Price/location
    - 100%: All fields + image
  - Last edited date
- Actions per draft:
  - **Edit**: Open edit dialog, continue editing
  - **Publish**: Validate and publish (if complete)
  - **Delete**: Remove draft
- Bulk actions:
  - Select multiple drafts
  - "Delete Selected" button
  - "Publish All" button (validates each)

**Active Listings Tab Features:**
- View all published equipment
- Same grid/list view as marketplace
- Each listing shows:
  - All marketplace card info
  - **Plus**:
    - Views count
    - Bids count
    - Status: Active, Pending Sale, Sold
- Actions per listing:
  - **Edit**: Modify details (creates new draft for approval)
  - **View on Marketplace**: See how buyers see it
  - **Mark as Sold**: If sold outside platform
  - **Unpublish**: Revert to draft

**Projects Tab (Bulk Grouping):**
- Group related equipment for bulk offers
- Create project:
  - Project name (auto or manual)
  - Select equipment to include
  - Save
- Project cards show:
  - Project name
  - Equipment count
  - Total asking price (sum)
  - Total equipment value
- Bulk actions:
  - **Create Bulk Offer**: Package all equipment
  - **Edit Project**: Add/remove equipment
  - **Delete Project**: Ungroup equipment

---

## 5️⃣ PROFILE Section - Complete Functionality

### Core Features

**Personal Information Card:**
- **First Name** (text input)
- **Last Name** (text input)
- **Email Address** (text input, read-only)
  - Note: "Authentication managed by Replit OpenID Connect"
- **Organization/Company** (text input, optional)
- **Phone Number** (text input, optional)
  - Format validation: (XXX) XXX-XXXX
- **Save Changes** button
- Success toast: "Profile updated successfully"

**Account Settings Card:**
- **Email Notifications**:
  - Toggle switches for each notification type:
    - ✓ New wishlist matches found
    - ✓ Bid status updates (accepted, rejected, outbid)
    - ✓ Price alerts (market price changes for wishlist items)
    - ✓ Weekly activity summary
  - Email frequency dropdown:
    - Immediate (real-time emails)
    - Daily digest (once per day at 9 AM)
    - Weekly summary (Mondays at 9 AM)
    - Off (no emails)
- **Save Preferences** button

**User Preferences Card:**
- **Default Location** (text input):
  - Used for equipment searches
  - Pre-fills location in surplus submission
  - Format: "City, State"
- **Preferred Currency** (dropdown):
  - USD ($) - default
  - EUR (€)
  - GBP (£)
  - All prices displayed in selected currency
- **Default Condition Preference** (dropdown):
  - For wishlist items
  - Options: New, Refurbished, Used, Any (default)
- **Marketplace View** (radio buttons):
  - Grid view (cards) - default
  - List view (table)
  - Saves preference for future visits
- **Save Preferences** button

**Security Card:**
- **Authentication**:
  - Connected via: Replit OpenID Connect
  - Email shown: [user@example.com]
  - Last login: [timestamp]
  - "Manage Authentication" button → Opens Replit auth settings
- **Logout** button (red, prominent)
  - Confirmation dialog: "Are you sure you want to logout?"
  - Clears session
  - Redirects to login page

**Activity Statistics Card:**
- Read-only dashboard showing:
  - **Total Equipment Listed**: Count of all equipment you've submitted
    - Active listings: X
    - Sold: X
    - Drafts: X
  - **Total Bids Placed**: Count of all bids (pending + historical)
    - Accepted: X
    - Pending: X
    - Rejected: X
  - **Active Wishlist Items**: Current wishlist count
    - With matches: X
    - Without matches: X
  - **Successful Purchases**: Equipment bought through platform
  - **Total Spent**: Sum of successful purchase bids
  - **Member Since**: Account creation date
  - **Account Score**: Reputation score (0-100)
    - Based on: response rate, successful transactions, reviews
- Visual charts/graphs (optional):
  - Bid success rate pie chart
  - Activity timeline
  - Spending over time

---

## 🏗️ Technical Architecture

### Frontend (Port 5000)
- **React 18** with Vite build tool
- **TypeScript** for type safety
- **UI Components**: Radix UI (Dialog, Tabs, Select, etc.)
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router DOM
- **Icons**: Lucide React

**CRITICAL Vite Configuration:**
```javascript
// vite.config.js
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true // REQUIRED for Replit preview, users see blank screen without this
  }
})
```

### Backend Services (7 Microservices)

All services communicate via localhost within Replit environment.

**1. Auth Server** (Node.js Express, Port 3000):
- Replit OpenID Connect integration (use Replit auth integration)
- Session management with PostgreSQL
- Equipment, wishlist, saved matches CRUD
- Drizzle ORM for type-safe database operations

**2. Analysis API** (Python Flask, Port 8080):
- Image analysis with Apify Image-to-JSON + OpenAI GPT-4o
- Complete 3-step AI workflow orchestration
- PDF text extraction and spec extraction
- Equipment validation via manual search

**3. Enhanced Matching API** (Python Flask, Port 6000):
- **Background job processing** (users never see "jobs" UI)
- Multi-source equipment search:
  - Internal database query
  - Google search via Apify
  - PDF manual discovery
  - Specification extraction
- AI-powered scoring with weighted algorithm
- Visual validation with OpenAI Vision
- Match categorization (Exact/Variant/Related/Alternative)

**4. Price API** (Python Flask, Port 8000):
- **Real market price aggregation** (CRITICAL):
  - Google Shopping scraper (Apify: `epctex/google-shopping-scraper`)
  - Google search for listings (Apify: `apify/google-search-scraper`)
  - URL price extraction from actual product pages
  - Snippet fallback when URL fetch fails
  - Price grouping by condition (new/refurbished/used)
  - Average calculation per condition
- **AI price estimation fallback**:
  - DSPy + OpenAI GPT-4o when no real prices found
  - Provides realistic estimates based on equipment specs
- **Price accuracy features**:
  - Fuzzy model matching (normalizes spaces/hyphens/slashes)
  - Spare parts filtering
  - eBay shipping policy text filtering
  - Negative keyword filtering (shipping, eligibility, etc.)
  - Confidence scoring for each price

**5. Upload Server** (Node.js Express, Port 3001):
- Wasabi cloud storage integration (S3-compatible)
- AWS SDK v3 for S3 operations
- Presigned URL generation for file retrieval
- Image upload with validation

**6. Asset Manifest Server** (Node.js Express, Port 3002):
- Replit Object Storage for manifest persistence
- Asset CRUD operations
- Version tracking

**7. Frontend Dev Server** (Vite, Port 5000):
- Hot module replacement
- Optimized bundling
- Serves React application

### Database Configuration (CRITICAL)

**Two Separate Database Environments:**

**Development Database (Replit PostgreSQL)**:
- **When**: During development and testing on Replit
- **Setup**: Use Replit PostgreSQL integration (auto-configured)
- **Connection**: Automatic via `DATABASE_URL` environment variable
- **Auto-generated variables**:
  ```
  DATABASE_URL=postgresql://...
  PGHOST=...
  PGPORT=...
  PGUSER=...
  PGPASSWORD=...
  PGDATABASE=...
  ```
- **Benefits**:
  - Fast iteration
  - Included in Replit environment
  - Safe to reset/break during development
  - Automatic checkpoints/rollback
  - Free tier available

**Production Database (External PostgreSQL)**:
- **When**: Deployed to production
- **Setup**: Create external PostgreSQL instance:
  - Options: Neon, Supabase, AWS RDS, Google Cloud SQL, Azure Database
  - Get connection string
- **Configuration**:
  1. Add **new environment variable**:
     ```
     PRODUCTION_DATABASE_URL=postgresql://user:password@host:5432/database?ssl=true
     ```
  2. Update backend services to detect environment:
     ```javascript
     // Node.js example (server/index.js)
     const isDevelopment = process.env.NODE_ENV !== 'production';
     const dbUrl = isDevelopment 
       ? process.env.DATABASE_URL 
       : process.env.PRODUCTION_DATABASE_URL;
     
     const db = drizzle(neon(dbUrl));
     ```
     ```python
     # Python example (equipment_id-main/database.py)
     import os
     is_development = os.getenv('NODE_ENV') != 'production'
     db_url = os.getenv('DATABASE_URL') if is_development else os.getenv('PRODUCTION_DATABASE_URL')
     ```
- **Benefits**:
  - Dedicated resources
  - Better performance at scale
  - Professional backup/monitoring
  - Independent of Replit platform
  - Can upgrade capacity independently

**Database Schema** (Same for both environments):

Tables:
- `users`: User accounts
- `equipment`: Equipment listings
  - Fields: id, brand, model, category, condition, asking_price, location, description, specifications (JSONB), market_price_range (JSONB), price_source, price_breakdown (JSONB), listing_status (draft/active), created_by, created_at, updated_at
- `wishlists`: Wishlist projects
- `wishlist_items`: Individual wishlist items
  - Fields: id, wishlist_id, brand, model, category, preferred_condition, max_budget, priority, notes, market_price_range (JSONB), price_source, created_at
- `saved_matches`: User-saved equipment matches
- `search_jobs`: Background matching jobs (internal, not displayed to users)
- `match_candidates`: Match results from jobs
- `sessions`: Authentication sessions

**Migration Management**:
- Use Drizzle ORM for schema changes
- Run `npm run db:push` to sync schema
- Force sync if needed: `npm run db:push --force`
- Never manually write SQL migrations
- Test schema changes in dev before production

---

## 🤖 AI/API Integration Summary

### OpenAI API Usage

**Models Used**:
- **GPT-4o Vision**: Image analysis, visual validation, description generation
- **GPT-4o**: Semantic matching, price estimation
- **GPT-4o-mini**: Specification extraction (cost-effective for text)

**Use Cases**:
1. **Image Analysis**: Extract brand/model from equipment photos
2. **Visual Validation**: Compare user images with PDF manual images
3. **Specification Extraction**: Extract tech specs from PDFs/web pages
4. **Description Generation**: Create meaningful text when identification fails
5. **Price Estimation**: Fallback when no real market prices found
6. **Semantic Matching**: Calculate equipment similarity for wishlist matching

**Required Environment Variable**: `OPENAI_API_KEY`

### Apify API Usage

**Actors Used**:
1. **`apify/google-search-scraper`**: General Google search (equipment listings, PDFs, price discovery)
2. **`epctex/google-shopping-scraper`**: Structured product price data
3. **`apify/image-to-json`**: Initial image analysis (fallback to OpenAI)

**Use Cases**:
1. **Price Discovery**: Find real market prices from actual product listings
2. **PDF Manual Discovery**: Search for product documentation
3. **Equipment Search**: Find available equipment for wishlist matching
4. **Market Research**: Aggregate pricing data across sources

**Required Environment Variable**: `APIFY_TOKEN`

### Wasabi Cloud Storage

**Purpose**: Store uploaded equipment images and documents

**Required Environment Variables**:
- `WASABI_ACCESS_KEY_ID`
- `WASABI_SECRET_ACCESS_KEY`
- `WASABI_ENDPOINT` (e.g., s3.us-east-1.wasabisys.com)
- `WASABI_BUCKET_NAME`
- `WASABI_REGION` (e.g., us-east-1)

**SDK**: AWS SDK v3 for S3 (@aws-sdk/client-s3, @aws-sdk/s3-request-presigner)

---

## 🎨 UI/UX Design System

### Color Palette
- **Primary Text**: Slate 900 (#0f172a)
- **Secondary Text**: Slate 600 (#475569)
- **Background**: White (#ffffff)
- **Card Background**: White with slate-200 border
- **Success**: Green 500 (#22c55e)
- **Warning**: Yellow 500 (#eab308)
- **Danger**: Red 500 (#ef4444)
- **Info**: Blue 500 (#3b82f6)

### Component Styling

**Condition Badges**:
- New: Red background (#fef2f2), red text (#991b1b), red border
- Refurbished: Yellow background (#fefce8), yellow text (#854d0e), yellow border
- Used: Green background (#f0fdf4), green text (#166534), green border

**Match Type Badges**:
- Exact Match: Green (#22c55e) with checkmark icon
- Variant: Blue (#3b82f6) with info icon
- Related: Yellow (#eab308) with link icon
- Alternative: Gray (#64748b) with sparkles icon

**Confidence Indicators**:
- High (80-100%): Green progress bar
- Medium (50-79%): Yellow progress bar
- Low (< 50%): Red progress bar

**Price Source Badges**:
- Real Market Data: Green badge with "Based on X listings"
- AI Estimate: Yellow badge with "AI estimated prices"

### Key Components

**PriceBar Component** (CRITICAL):
- Horizontal bar showing market price ranges
- Three color zones:
  - Green (left): Used price range
  - Yellow (middle): Refurbished price range
  - Red (right): New price range
- User's asking price/budget marked with vertical line
- Price labels at key points: Min, Max for each condition
- Props:
  - `marketRange`: { used_min, used_max, refurbished_min, refurbished_max, new_min, new_max }
  - `value`: User's price/budget (number)
  - `valueLabel`: "Asking Price" or "Budget" (string)
  - `showBudgetHeader`: Display value above bar (boolean)

**EquipmentDetailDialog Component**:
- 5-tab modal (Overview, Description, Specifications, Pricing, Match Details)
- Width: 1200px
- Height: 90vh
- Gradient header per tab
- Smooth tab transitions
- Props:
  - `equipment`: Equipment object
  - `wishlistData`: Wishlist item for match comparison (optional)
  - `onBid`: Callback to place bid

**SearchFilters Component**:
- Horizontal filter bar
- Grid layout: 2 columns on mobile, 6 columns on desktop
- Inputs: search text, category dropdown, condition dropdown, location text, price range, custom filters
- Real-time filtering (debounced 300ms)

**MatchCard Component**:
- Equipment card with match information overlay
- Match type badge (top-right corner)
- Confidence progress bar
- Price bar showing budget comparison
- Action buttons: View, Bid, Save, Dismiss

### Professional Polish
- Smooth transitions: 200-300ms duration
- Loading states: Spinners with descriptive text
- Skeleton loaders during data fetch
- Toast notifications for actions (success/error)
- Empty states with helpful CTAs
- Error boundaries with user-friendly messages
- Responsive design (mobile-first approach)
- Card-based layouts throughout
- Gradient backgrounds for section headers
- Lucide React icons (consistent style)
- Hover effects on interactive elements
- Focus states for accessibility

---

## 🔐 Security & Data Integrity

### Price Extraction Accuracy

**Fuzzy Model Matching**:
```python
def normalize_model(model):
    # Remove spaces, hyphens, slashes
    return re.sub(r'[-\s/]', '', model.lower())

# "620Bp" matches "620 Bp", "620-Bp", "620/Bp"
```

**Negative Keyword Filtering**:
- Filter out shipping/eligibility prices:
  - Keywords: shipping, freight, eligibility, minimum, handling, delivery, postage
  - Penalty score: -100 per keyword in context
- eBay-specific filtering:
  - "Eligible for PayPal Credit" phrases
  - "$150 minimum order" shipping text
  - "Ships within X days" service text

**Currency Detection**:
- Proper "US $" pattern matching
- Avoid false matches in words like "must" containing "us"
- Context-aware extraction (50 chars before/after price)

**Spare Parts Filtering**:
- Exclude listings with keywords:
  - "pump head", "tubing", "parts kit", "replacement", "spare"
- Filter BEFORE fetching URLs (saves API calls)

**Confidence Scoring**:
- Each extracted price gets confidence score (0-1):
  - High context match: 0.9-1.0
  - Medium context: 0.6-0.8
  - Low context: 0.3-0.5
- Use highest confidence price per listing

### SSRF Protection

**URL Fetching Safety**:
```python
def is_safe_url(url):
    # Block private IP ranges
    blocked_ranges = [
        '127.0.0.0/8',    # Localhost
        '192.168.0.0/16', # Private network
        '10.0.0.0/8',     # Private network
        '172.16.0.0/12',  # Private network
        '169.254.0.0/16', # Link-local
    ]
    # Validate hostname
    # Set 10-second timeout
    # Use spoofed User-Agent
```

### Database Safety

- Use Drizzle ORM (type-safe queries)
- Parameterized queries only (prevent SQL injection)
- JSONB fields for flexible data (specifications, price ranges)
- Proper indexing: brand, model, category, listing_status
- Session cleanup on logout
- Row-level security (RLS) for multi-tenant isolation

---

## 📦 Required Dependencies

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-label": "latest",
    "@radix-ui/react-separator": "latest",
    "@radix-ui/react-checkbox": "latest",
    "@radix-ui/react-progress": "latest",
    "tailwindcss": "^3.4.0",
    "lucide-react": "latest",
    "axios": "^1.6.0",
    "class-variance-authority": "latest",
    "tailwind-merge": "latest",
    "clsx": "latest",
    "date-fns": "^2.30.0"
  }
}
```

### Backend Node.js (package.json)
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "express-session": "^1.17.0",
    "drizzle-orm": "latest",
    "@neondatabase/serverless": "latest",
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0",
    "@replit/object-storage": "latest",
    "connect-pg-simple": "latest"
  }
}
```

### Backend Python (requirements.txt)
```
flask==3.0.0
flask-cors==4.0.0
openai==1.0.0
apify-client==1.5.0
aiohttp==3.9.0
pdfplumber==0.10.0
pymupdf==1.23.0
dspy-ai==2.4.0
sqlalchemy==2.0.0
psycopg2-binary==2.9.0
beautifulsoup4==4.12.0
```

---

## 🚀 Workflows (Run Commands)

Configure 7 workflows:

1. **Frontend**: `npm run dev` 
   - Port: 5000
   - Output: webview (CRITICAL for user to see website)

2. **Auth Server**: `cd server && node index.js`
   - Port: 3000
   - Output: console

3. **Upload API**: `cd backend && node upload-server.js`
   - Port: 3001
   - Output: console

4. **Asset Manifest API**: `cd backend && node asset-manifest-server.js`
   - Port: 3002
   - Output: console

5. **Analysis API**: `cd equipment_id-main && python equipment_analysis_api_simple.py`
   - Port: 8080
   - Output: console

6. **Enhanced Matching API**: `cd equipment_id-main && python enhanced_matching_api.py`
   - Port: 6000
   - Output: console

7. **Price API**: `cd equipment_id-main && python price_api.py`
   - Port: 8000
   - Output: console

**Port Configuration**:
- Port 5000 MUST be exposed for frontend web preview
- All other ports are internal for inter-service communication

---

## ✅ Success Criteria

Platform is complete when ALL these work:

**Marketplace**:
1. ✅ Browse equipment with filters (category, condition, price, location)
2. ✅ Equipment detail modal with 5 tabs functional
3. ✅ **Pricing tab shows real market prices** from Google Shopping/search
4. ✅ PriceBar visualizes market ranges correctly
5. ✅ Bidding system works (place bid, track on dashboard)
6. ✅ Bulk offers can be created from selected items
7. ✅ Only active listings shown (drafts hidden)

**Dashboard**:
8. ✅ Quick stats cards display correct counts
9. ✅ Active bids list shows all pending bids with status
10. ✅ Bulk offers tracked with item count and status
11. ✅ Wishlist matches alert shows new matches
12. ✅ Recent activity feed displays user actions
13. ✅ Saved matches overview functional

**Wishlist**:
14. ✅ Create wishlist items with all fields
15. ✅ **AI matching finds equipment automatically** (background job)
16. ✅ **Each wishlist item shows real market price context**
17. ✅ Match results display with confidence levels
18. ✅ **PriceBar shows budget vs market reality**
19. ✅ Match cards show price source (real data vs AI)
20. ✅ Actions work: View Details, Place Bid, Save, Dismiss

**Surplus**:
21. ✅ Image upload works (multiple files, drag-drop)
22. ✅ **AI 3-step workflow completes**:
    - Step 1: Image analysis extracts brand/model
    - Step 2: Manual search finds PDFs
    - Step 3: Specs extracted from PDFs
23. ✅ Multi-image analysis selects best result
24. ✅ Visual validation compares with PDF manual
25. ✅ Descriptive fallback generates text when ID fails
26. ✅ **Price context request fetches real market prices**
27. ✅ **PriceBar shows asking price vs market**
28. ✅ Form validation works before publish
29. ✅ Save as draft vs publish immediately functional
30. ✅ Drafts tab shows unpublished equipment
31. ✅ Active listings tab shows published equipment

**Profile**:
32. ✅ Personal information can be edited and saved
33. ✅ Email notification preferences work
34. ✅ User preferences save correctly
35. ✅ Activity statistics display accurately
36. ✅ Logout works properly

**Cross-Cutting**:
37. ✅ All 7 workflows run without errors
38. ✅ Database switches between dev/production correctly
39. ✅ Real market prices preferred over AI estimates
40. ✅ Price source badges display correctly everywhere
41. ✅ DEV MODE shows debug info for price API

---

## 🎯 Critical Implementation Notes

### 1. Real Market Price Discovery (CRITICAL)

This is THE KEY differentiator. Users must see REAL prices, not AI guesses.

**Priority**: Real market data > AI estimates

**Implementation Flow**:
```
User clicks "Request Price Context"
  ↓
Frontend calls /get-price-context API
  ↓
Backend (Price API):
  1. Search Google Shopping (Apify)
  2. Search Google "{brand} {model} (price OR cost OR buy) -pdf" (Apify)
  3. For each URL result:
     a. Filter wrong models BEFORE fetching (saves API calls)
     b. Filter spare parts ("pump head", "tubing")
     c. Fetch HTML from URL
     d. Extract price from HTML (PriceParser)
     e. Fallback to snippet if URL fails
  4. Group prices by condition (new/refurbished/used)
  5. Calculate averages per group
  6. If NO real prices found → Call AI estimator
  ↓
Return:
  {
    new_min, new_max,
    refurbished_min, refurbished_max,
    used_min, used_max,
    price_source: "aggregated_from_products" OR "ai_estimate",
    price_breakdown: [ {url, price, condition, source} ],
    _debug: { google_query, total_candidates, first_3_urls, ... }
  }
  ↓
Frontend displays:
  - PriceBar with market ranges
  - Price source badge (green for real, yellow for AI)
  - Price intelligence ("Your price is 15% below market")
```

**Where This Appears**:
- **Marketplace > Equipment Detail > Pricing Tab**: Click "Request Price Context"
- **Wishlist > Item Cards**: "Request Price Context" button per item
- **Wishlist > Match Cards**: Automatic for each matched equipment
- **Surplus > Edit Equipment**: "Request Price Context" button in form

### 2. Background Job Processing

**Users NEVER see "jobs"** - it happens automatically.

**What Users See**:
- "Searching for matches..." (loading spinner)
- Progress: 30% → 70% → 100%
- "Found X matches" (success message)

**What Happens Behind the Scenes**:
- POST /v1/match-jobs creates job
- Job processes in background (2-3 minutes)
- Frontend polls GET /v1/match-jobs/{id} every 2 seconds
- When status = "completed", GET /v1/match-jobs/{id}/results
- Display matches to user

**Implementation**:
```javascript
// Frontend automatically handles job polling
const { matches, loading } = useWishlistMatching({
  brand, model, category, budget
});

// User just sees: loading → matches appear
```

### 3. Database Environment Switching

**CRITICAL**: Must support both dev and prod databases.

**Implementation**:
```javascript
// Node.js
const isDev = process.env.NODE_ENV !== 'production';
const dbUrl = isDev ? process.env.DATABASE_URL : process.env.PRODUCTION_DATABASE_URL;

// Python
import os
is_dev = os.getenv('NODE_ENV') != 'production'
db_url = os.getenv('DATABASE_URL') if is_dev else os.getenv('PRODUCTION_DATABASE_URL')
```

**Environment Variables**:
- Development: `DATABASE_URL` (auto-set by Replit PostgreSQL integration)
- Production: `PRODUCTION_DATABASE_URL` (user provides external DB connection)

### 4. Snippet Fallback (CRITICAL FIX)

Apify returns `snippet` or `richSnippet`, NOT `description`.

**Correct Implementation**:
```python
def extract_snippet(apify_result):
    return (
        apify_result.get('snippet') or 
        apify_result.get('richSnippet') or 
        apify_result.get('description') or 
        ''
    )
```

### 5. Marketplace Publication Filter

**CRITICAL**: Only show published equipment.

```javascript
// Correct
const equipment = await db.query.equipment.findMany({
  where: eq(equipment.listing_status, 'active')
});

// WRONG - shows drafts!
const equipment = await db.query.equipment.findMany();
```

---

## 🔑 Required Environment Secrets

**Ask user for these API keys**:

1. **OPENAI_API_KEY**: "We need an OpenAI API key for AI-powered image analysis, specification extraction, visual validation, and price estimation. Get yours at https://platform.openai.com/api-keys"

2. **APIFY_TOKEN**: "We need an Apify API token for web scraping (Google search, PDF discovery, real market price discovery). Sign up at https://apify.com/settings/integrations"

3. **WASABI_ACCESS_KEY_ID, WASABI_SECRET_ACCESS_KEY, WASABI_ENDPOINT, WASABI_BUCKET_NAME, WASABI_REGION**: "We need Wasabi cloud storage credentials for uploading equipment images. Create an account at https://wasabi.com and create a bucket"

4. **PRODUCTION_DATABASE_URL** (for production only): "For production deployment, provide your external PostgreSQL connection string (e.g., from Neon, Supabase, AWS RDS)"

**Auto-configured via Replit integrations**:
- PostgreSQL (development database)
- Replit Object Storage
- Replit OpenID Connect (authentication)

---

**Build this as a production-ready platform with professional UI, real market price intelligence (not AI guesses), and seamless user experience across all 5 sections. Every feature must work end-to-end with real data.**
