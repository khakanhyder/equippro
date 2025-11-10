# 🏭 SURPLUS & 🎯 WISHLIST - Complete Functionality Documentation

**EquipTradeV1 Research Equipment Marketplace**

This document provides complete functional specifications for the **Surplus** and **Wishlist** sections. The UI is already developed; this focuses on functionality, data flows, and user interactions.

---

## 🏭 SURPLUS SECTION - Complete Functionality

### Purpose
The Surplus section is where users submit, manage, and publish their equipment for sale. It features AI-powered auto-fill, real-time price validation, and draft management.

---

### Core Features

#### 1. Three-Tab Organization

**Tab 1: Drafts**
- Displays equipment with `listing_status = 'draft'`
- Visible only to owner
- Equipment not published to marketplace
- Can edit, delete, or publish
- No buyer visibility

**Tab 2: Active Listings**
- Displays equipment with `listing_status = 'active'`
- Published on marketplace
- Visible to all buyers
- Can edit (creates new draft for approval) or mark as sold
- Shows bid count and views

**Tab 3: Projects** (Bulk Grouping)
- Group related equipment into named projects
- Create bulk offers from projects
- Organize inventory by lab/department/grant
- Multi-equipment management

---

#### 2. Submit New Equipment - AI-Assisted Workflow

**Overview of Process:**
1. User uploads images
2. User manually triggers AI analysis (optional)
3. AI analyzes images to suggest brand/model
4. User reviews and edits form (manual entry supported)
5. User validates price with real market data (optional)
6. Save as draft or publish immediately

---

**STEP 1: Image Upload**

**Upload Interface:**
- Drag-and-drop zone (primary interaction)
- Click to browse alternative
- "Upload Equipment Images" heading
- Icon: Upload cloud icon
- Instructions: "Drag images here or click to browse"
- Subtext: "JPG, PNG, WebP up to 10MB each. Min 400x400px recommended."

**Upload Process:**

1. **File Selection**:
   - User drops files or selects via file picker
   - Multiple file selection supported (1-10 images)
   - Client-side validation:
     - Format: .jpg, .jpeg, .png, .webp only
     - Size: Max 10MB per file
     - Dimensions: Recommend ≥400x400px (warn if smaller)

2. **Upload to Wasabi**:
   - For each file:
     - Generate unique filename: `equipment_${timestamp}_${randomId}.${ext}`
     - Upload to Wasabi S3 bucket via Upload API
     - Progress indicator per file (0-100%)
     - Store Wasabi URL
   - Upload method:
     ```javascript
     const formData = new FormData();
     formData.append('file', imageFile);
     formData.append('type', 'equipment');
     
     const response = await fetch('/api/upload', {
       method: 'POST',
       body: formData
     });
     
     const { url } = await response.json();
     ```

3. **Image Preview Display**:
   - Grid layout of uploaded images
   - Each thumbnail shows:
     - Image preview (150x150px thumbnail)
     - Filename (truncated if long)
     - File size (formatted: "2.3 MB")
     - Delete button (X icon, top-right)
     - Drag handle for reordering
   - First image highlighted: "Primary Image" badge
   - Reorder by drag-and-drop to change primary image

4. **State Management**:
   ```javascript
   const [images, setImages] = useState([]);
   // images = [
   //   { url: 'https://wasabi.../img1.jpg', filename: '...', size: 2340000 },
   //   { url: 'https://wasabi.../img2.jpg', filename: '...', size: 1890000 }
   // ]
   ```

4. **State Management**:
   ```javascript
   const [images, setImages] = useState([]);
   ```

---

**STEP 2: AI Image Analysis (Optional, User-Triggered)**

**Trigger**: User clicks "Analyze Images" button (manual trigger, not automatic)
**Loading State**: "Analyzing images to identify equipment..."

**Process**:

1. **API Call**:
   - Frontend calls `/analyze-image` endpoint:
     ```javascript
     const response = await fetch('/analyze-image', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ image_urls: images })
     });
     const result = await response.json();
     ```

2. **Backend Analysis**:
   - Backend analyzes images using OpenAI Vision API
   - Extracts: brand, model, category, description, technical specifications
   - Returns suggestions (not auto-filled)

3. **Display Suggestions** (User Can Accept or Ignore):
   - Suggestions shown with "Apply" buttons
   - Brand suggestion: Shows extracted brand with confidence
   - Model suggestion: Shows extracted model with confidence  
   - Category suggestion: Shows detected category
   - Description suggestion: Shows generated description
   - Specifications suggestion: Shows extracted specs
   - **User must manually click "Apply" to populate fields**

4. **Success State**:
   - Suggestions panel appears
   - Each field shows: suggested value + confidence + "Apply" button
   - User can selectively apply suggestions or ignore them
   - User can manually edit any field regardless of suggestions

5. **Failure State**:
   - Message: "Could not extract information from images"
   - User proceeds with manual entry
   - Form remains empty, ready for manual input

**State Storage**:
```javascript
const [suggestions, setSuggestions] = useState({
  brand: null,
  model: null,
  category: null,
  description: null,
  technical_specifications: []
});
```

**NOTE**: This is the ONLY AI analysis step for Surplus. There is NO automatic PDF search, NO automatic spec extraction, NO automatic visual validation in the current implementation.

---

**STEP 3: Review & Edit Form**

User manually fills out equipment details or applies AI suggestions from Step 2.

**Form Layout**:

**Section 1: Equipment Details**

1. **Text Analysis with OpenAI**:
   - Model: GPT-4o-mini (cost-effective for text processing)
   - Prompt:
     ```
     Extract technical specifications from this equipment manual.
     
     Manual text: {pdf_text}
     
     Focus on extracting:
     - Dimensions (length, width, height)
     - Weight
     - Power requirements (voltage, wattage, phase)
     - Electrical specs (current, frequency)
     - Operating conditions (temperature, humidity)
     - Performance specs (capacity, flow rate, accuracy, precision)
     - Pressure ratings
     - Materials (construction materials)
     - Certifications (CE, UL, etc.)
     
     Return as JSON object with key-value pairs.
     Format values with units (e.g., "500W", "220V", "50x40x30 cm").
     Only include specifications explicitly mentioned in the manual.
     
     Example output:
     {
       "Power": "500W",
       "Voltage": "220V AC",
       "Dimensions": "50 x 40 x 30 cm",
       "Weight": "75 kg",
       "Operating Temperature": "15-30°C",
       "Flow Rate": "1-10 mL/min"
     }
     ```

2. **Parse Response**:
   - Extract JSON object from OpenAI response
   - Validate each key-value pair
   - Separate value and unit if possible:
     ```javascript
     // "500W" → { value: "500", unit: "W" }
     // "50x40x30 cm" → { value: "50x40x30", unit: "cm" }
     ```

**If No PDF (Web Fallback)**:

1. **Google Search for Specs**:
   - Query: "{brand} {model} specifications"
   - Extract text from top 3 product pages
   - Combine text (max 10,000 chars)

2. **OpenAI Extraction** (same as PDF method):
   - Send combined web text to GPT-4o-mini
   - Use same extraction prompt
   - Parse JSON response

3. **Success State**:
   - Green checkmark icon
   - Message: "✓ Extracted {count} specifications"
   - Specifications displayed in editable form:
     - Each spec as row with 3 inputs:
       - Key: "Power" (editable)
       - Value: "500" (editable)
       - Unit: "W" (editable)
     - Delete button per row (X icon)
   - "Add Specification" button (add custom spec)
   - User can:
     - Edit any spec (key, value, unit)
     - Delete incorrect specs
     - Add missing specs manually
     - Reorder specs (drag handles)

4. **Partial Success** (some specs extracted):
   - Warning icon
   - Message: "⚠ Extracted {count} specifications (may be incomplete)"
   - Same editable form
   - Suggestion: "Please review and add missing specs"

5. **Failure State** (no specs found):
   - Info icon
   - Message: "ℹ Could not extract specifications"
   - Empty spec form
   - "Add Specification" button to add manually
   - **Process continues** (non-blocking)

**State Storage**:
```javascript
setAiAnalysis(prev => ({
  ...prev,
  specifications: {
    extracted: true,
    count: 6,
    specs: {
      "Power": "500W",
      "Voltage": "220V",
      "Dimensions": "50x40x30 cm",
      "Weight": "75 kg",
      "Operating Temperature": "15-30°C",
      "Flow Rate": "1-10 mL/min"
    }
  }
}));
```

---

**Phase 2d: Visual Validation**

**Trigger**: Automatically if PDF manual found with images
**Loading State**: "Validating equipment with manual images..."

**Process**:

1. **Extract Images from PDF**:
   - Use PyMuPDF (fitz) to extract embedded images
   - Get first 10 images from manual
   - Filter out:
     - Diagrams (too schematic)
     - Icons/logos (too small)
     - Charts/graphs (not equipment photos)
   - Keep equipment photos (clear product images)

2. **Multi-Image Comparison** (User Image vs Manual Images):
   - For each user image (1-10 images):
     - For each manual image (1-10 images):
       - OpenAI GPT-4o Vision comparison:
         ```javascript
         const comparison = await openai.chat.completions.create({
           model: 'gpt-4o',
           messages: [{
             role: 'user',
             content: [
               { 
                 type: 'text', 
                 text: `Compare these equipment images:
                        1. User's uploaded image
                        2. Product manual image
                        
                        Identify:
                        - Are they the same equipment model?
                        - Matching visual features (control panel, display, ports, shape)
                        - Differences (color, accessories, configuration)
                        - Similarity score (0-100)
                        
                        Return JSON: {
                          similarity_score: 0-100,
                          matching_features: [],
                          differences: [],
                          match_category: "exact"|"variant"|"related"|"different"
                        }`
               },
               { type: 'image_url', image_url: { url: userImage.url } },
               { type: 'image_url', image_url: { url: manualImage.url } }
             ]
           }]
         });
         ```
       - Extract similarity score and features

3. **Calculate Best Match**:
   - Among all user-image × manual-image combinations
   - Select pair with highest similarity score
   - Use that for match categorization

4. **Match Categorization**:
   ```javascript
   if (similarity_score >= 90) {
     category = "exact"; // Same equipment, same configuration
   } else if (similarity_score >= 70) {
     category = "variant"; // Same base model, different accessories/options
   } else if (similarity_score >= 50) {
     category = "related"; // Similar equipment family
   } else {
     category = "alternative"; // Different but comparable
   }
   ```

5. **Success State**:
   - Visual match badge (color-coded):
     - **Exact Match** (Green ✓):
       - Icon: Checkmark
       - Text: "Images match product manual"
       - Confidence: High
     - **Variant** (Blue ℹ):
       - Icon: Info
       - Text: "Similar to manual, possible variant"
       - Confidence: Medium
     - **Related** (Yellow ⚠):
       - Icon: Warning
       - Text: "Related equipment detected"
       - Confidence: Low
     - **Alternative** (Red ✗):
       - Icon: X
       - Text: "Different from manual"
       - Confidence: Very Low
   
   - **Matching Features List**:
     - Bulleted list of similarities:
       - "Same control panel layout"
       - "Matching brand logo position"
       - "Identical display interface"
       - "Same port configuration"
   
   - **Differences Highlighted**:
     - Bulleted list of differences:
       - "Missing optional module visible in manual"
       - "Different color scheme (white vs gray)"
       - "Additional accessories shown"

6. **Failure State** (no manual images or comparison failed):
   - Info icon
   - Message: "ℹ Visual validation skipped (no manual images found)"
   - **Process continues** (non-blocking)

**State Storage**:
```javascript
setAiAnalysis(prev => ({
  ...prev,
  visualValidation: {
    completed: true,
    match_category: 'exact',
    similarity_score: 92,
    matching_features: [
      'Same control panel layout',
      'Matching brand logo position',
      'Identical display interface'
    ],
    differences: [
      'Different color scheme (white vs gray)'
    ]
  }
}));
```

---

**Phase 2e: Descriptive Fallback** (If Brand/Model Identification Failed)

**Trigger**: Only if Phase 2a failed to identify brand/model
**Loading State**: "Generating equipment description..."

**Process**:

1. **Image Description with OpenAI Vision**:
   - Analyze user's uploaded images
   - Model: GPT-4o Vision
   - Prompt:
     ```
     Describe this research/industrial equipment in detail.
     
     Include:
     - Equipment type and category
     - Visible components and features
     - Construction materials (metal, plastic, etc.)
     - Control interface (digital display, buttons, touchscreen)
     - Physical characteristics (size, color, shape)
     - Apparent function or purpose
     - Notable features or accessories
     
     Write as professional equipment description (2-3 paragraphs).
     Do not use "N/A" or "Unknown" - describe what you see.
     ```

2. **Generate Description**:
   - Extract generated text from OpenAI response
   - Example output:
     ```
     "Large analytical chromatography system with integrated detector 
     and autosampler module. Features digital control panel with 
     touchscreen interface and stainless steel construction. 
     The system includes multiple inlet ports, visible tubing 
     connections, and a compact footprint design suitable for 
     benchtop installation."
     ```

3. **Pre-fill Description Field**:
   - Populate equipment description textarea with generated text
   - User can edit/refine as needed
   - Ensures meaningful description instead of empty field or "N/A"

4. **Success State**:
   - Green checkmark icon
   - Message: "✓ Equipment description generated"
   - Subtext: "Please review and edit as needed"
   - Description appears in form (editable)

**Purpose**:
- Ensures users never see "N/A" or empty descriptions
- Provides starting point for manual entry
- Better than leaving brand/model empty
- Improves listing quality even when AI can't identify specific model

---

**STEP 3: Review & Edit Form**

After AI workflow completes, user reviews and edits pre-filled form.

**Form Layout**:

**Section 1: Equipment Details**

1. **Brand** (text input, required):
   - Auto-filled from Phase 2a (if successful)
   - Placeholder: "e.g., Thermo Fisher"
   - Validation: 2-100 characters
   - AI confidence indicator (if auto-filled):
     - High/Medium/Low badge
     - Edit icon hint: "Click to edit"

2. **Model** (text input, required):
   - Auto-filled from Phase 2a (if successful)
   - Placeholder: "e.g., TSQ Altis"
   - Validation: 1-100 characters
   - AI confidence indicator

3. **Category** (dropdown, required):
   - Options: Analytical, Chromatography, Spectrometry, Processing, Packaging, Testing, Production, Measurement, Safety, Automation, Other
   - AI may suggest category based on description
   - Default: "Other"

4. **Condition** (dropdown, required):
   - Options:
     - New: Never used, in original packaging
     - Refurbished: Professionally restored to like-new condition
     - Used: Previously used, functional
   - No default (user must select)
   - Important for pricing

5. **Asking Price** (number input, required):
   - Prefix: "$" (USD default)
   - Placeholder: "0.00"
   - Validation: Must be > 0
   - Format: Thousands separator (e.g., "50,000.00")
   - Help text: "Enter your asking price in USD"

6. **Location** (text input, required):
   - Format: "City, State" or "City, Country"
   - Placeholder: "e.g., Boston, MA"
   - Validation: 3-100 characters
   - Help text: "Where is the equipment currently located?"

7. **Description** (textarea, required):
   - Auto-filled from Phase 2e (if brand/model failed) or manual extraction
   - Minimum: 50 characters
   - Maximum: 5000 characters
   - Character counter: "X / 5000 characters"
   - Rich text support: Preserves line breaks
   - Placeholder:
     ```
     Describe the equipment in detail:
     - Current condition and age
     - Usage history
     - Included accessories
     - Any issues or repairs needed
     - Reason for selling
     ```

**Section 2: Specifications** (Dynamic Key-Value Pairs)

Auto-populated from Phase 2c (if successful).

**Display Format**:
- Table/grid layout with 3 columns:
  - **Key** (input): Specification name
  - **Value** (input): Specification value
  - **Unit** (input): Unit of measurement
  - **Actions**: Delete button

**Example Rows**:
| Key | Value | Unit | Actions |
|-----|-------|------|---------|
| Power | 500 | W | [Delete] |
| Voltage | 220 | V AC | [Delete] |
| Dimensions | 50x40x30 | cm | [Delete] |
| Weight | 75 | kg | [Delete] |

**Interactions**:
- Each field editable (text input)
- "Add Specification" button:
  - Adds empty row
  - User fills in key, value, unit
- Delete button per row:
  - Removes spec
  - Confirmation if user-added
- Drag handles for reordering (optional)

**Data Structure**:
```javascript
specifications = {
  "Power": "500W",
  "Voltage": "220V AC",
  "Dimensions": "50x40x30 cm",
  "Weight": "75 kg"
}
// Stored as JSONB in database
```

**Section 3: Images** (Already Uploaded)

**Display**:
- Grid of uploaded image thumbnails
- Each thumbnail:
  - Image preview (150x150px)
  - Filename
  - File size
  - Delete button (X icon)
  - Drag handle for reordering
- First image marked: "Primary Image" badge

**Actions**:
- **Reorder**: Drag thumbnails to change order
  - First image becomes primary (shown on marketplace cards)
- **Delete**: Remove individual image
  - Minimum 1 image required
- **Upload More**: "Add More Images" button
  - Opens upload dialog
  - Same upload process as initial

**Section 4: Documents** (Optional)

**Purpose**: Upload related PDFs (manuals, certificates, spec sheets, calibration reports)

**Upload Interface**:
- "Upload Documents" button
- Drag-and-drop zone
- Accepts: PDF files only
- Max size: 25MB per file
- Max count: 5 documents

**Display**:
- List of uploaded documents:
  - Filename
  - File size
  - Upload date
  - Delete button
- Documents stored in Wasabi
- URLs saved with equipment

---

**STEP 4: Price Context Validation** (CRITICAL Feature)

Before publishing, seller validates their asking price against real market data.

**"Get Price Context" Button**:
- Location: Below "Asking Price" field
- Style: Secondary button, blue
- Text: "Get Price Context"
- Icon: Chart icon

**When Clicked**:

1. **Validation**:
   - Brand and Model must be filled
   - If empty, show error: "Please enter brand and model first"

2. **API Call**:
   - Call Price API with equipment details:
     ```javascript
     const priceContext = await estimateEquipmentPrice({
       brand: formData.brand,
       model: formData.model,
       category: formData.category || 'industrial',
       location: formData.location || 'United States',
       specifications: specificationsObject
     });
     ```
   - Loading state: Button shows spinner, "Checking market prices..."
   - Process takes 30-60 seconds (Google search + URL fetching)

3. **Price Discovery Process** (Backend):

   **Step 1: Google Shopping Search** (via Apify)
   - Actor: `epctex/google-shopping-scraper`
   - Query: "{brand} {model}"
   - Extract structured product data with prices
   - Filter results: must contain both brand AND model
   - Group by condition

   **Step 2: Google Web Search** (via Apify)
   - Actor: `apify/google-search-scraper`
   - Query: "{brand} {model} (price OR cost OR buy) -pdf -manual"
   - Max 20 results
   - Extract URLs for product listing pages

   **Step 3: Pre-Filter Candidates**
   - **Fuzzy Model Matching**:
     ```python
     def normalize_model(model):
         return re.sub(r'[-\s/]', '', model.lower())
     ```
   - **Spare Parts Filter**: Exclude "pump head", "tubing", "parts kit", etc.
   - **Wrong Model Filter**: Exclude if model doesn't fuzzy-match

   **Step 4: URL Price Extraction**
   - Fetch HTML from filtered URLs
   - Parse with BeautifulSoup
   - Extract prices using PriceParser
   - Negative keyword filtering (shipping/eligibility)
   - Extract condition from page
   - Confidence scoring per price

   **Step 5: Snippet Fallback**
   - If URL fetch fails, use Apify snippet
   - Extract price from snippet text
   - Lower confidence score

   **Step 6: Price Grouping by Condition**
   - Group into: new_prices, refurbished_prices, used_prices
   - Store metadata per price

   **Step 7: Calculate Averages**
   - Per condition: min, max, avg, count

   **Step 8: AI Fallback**
   - If no real prices found, use OpenAI estimation

4. **Display Results**:

   **Price Source Badge**:
   - Real data: Green badge "✓ Real Market Data" + "Based on {count} listings"
   - AI estimate: Yellow badge "⚠ AI Estimate" + "No recent listings found"

   **Visual Price Bar** (PriceBar component):
   - Shows market ranges for new/refurbished/used as colored bars
   - Displays the user-entered price as a header chip above the bar (e.g., "Asking: $50,000"); no marker is rendered inside the bar itself
   - Range endpoints appear beneath the bar to show low/high market values

   **Price Intelligence Analysis**:
   - Compare asking_price to market averages
   - Recommendations:
     - Below Market: "✓ Good price - likely to sell quickly"
     - At Market: "Fair price - within market range"
     - Slightly Above: "⚠ Consider lowering to $XX,XXX for faster sale"
     - Significantly Above: "⚠ Your price is X% above market. Consider $XX,XXX"

   **Price Breakdown Table**:
   | Condition | Market Range | Avg | Your Price | Comparison |
   |-----------|--------------|-----|------------|------------|
   | New | $45K - $55K | $50K | - | - |
   | Refurbished | $30K - $40K | $35K | - | - |
   | Used | $20K - $28K | $24K | $XX,XXX | ±X% |

   **DEV MODE Debug Panel** (if enabled):
   - Google query used
   - Search method (real_data vs ai_estimate)
   - Total candidates, candidates with prices
   - First 3 URLs
   - Fallback reason
   - Timestamp

5. **Data Persistence**:
   ```javascript
   formData.market_price_range = {
     new_min, new_max,
     refurbished_min, refurbished_max,
     used_min, used_max
   };
   formData.price_source = priceContext.price_source;
   formData.price_breakdown = priceContext.price_breakdown;
   ```

---

**STEP 5: AI Analysis Summary Panel**

**Location**: Above form, collapsible
**Content**:
- Image Analysis: Status, Result, Confidence
- Manual Search: Status, PDF found or not
- Specifications: Count extracted
- Visual Validation: Match category, similarity
- Description: Generated or not
- Overall confidence indicator
- Edit buttons for each section

---

**STEP 6: Save or Publish**

**Option 1: Save as Draft**
- Minimum validation: brand, model, 1 image
- Save with `listing_status = 'draft'`
- Visible only in Surplus > Drafts
- NOT on marketplace
- Can edit/delete anytime

**Option 2: Publish**
- Strict validation: all required fields
- Confirmation dialog with summary
- Warning if priced above market
- Save with `listing_status = 'active'`
- Immediately visible on Marketplace
- Searchable and biddable

---

#### 3. Drafts Tab Management

**View Drafts**:
- Equipment with `listing_status = 'draft'`
- Grid/list view
- Completion percentage per draft (0-100%)
- Last edited date
- Actions: Edit, Publish (if 100%), Delete

**Bulk Actions**:
- Select multiple drafts
- "Delete Selected" button
- "Publish All" button (validates each)

---

#### 4. Active Listings Tab

**View Published Equipment**:
- Equipment with `listing_status = 'active'`
- Performance metrics: views, bids, highest bid
- Status badges: Active, Pending Sale, Sold
- Actions: View on Marketplace, Edit, Mark as Sold, Unpublish

---

#### 5. Projects Tab (Bulk Grouping)

**Create Projects**:
- Group related equipment
- Auto or custom names
- Multi-equipment management

**Project Management**:
- View project details
- Add/remove equipment
- Create bulk offers
- Delete projects

---

## 🎯 WISHLIST SECTION - Complete Functionality

### Purpose
The Wishlist section allows users to specify equipment they want to buy. The platform automatically searches for matching equipment using AI-powered multi-source search, then displays results with real market price context to help users make informed bidding decisions.

---

### Core Features

#### 1. Wishlist Projects Organization

**Purpose**: Group wishlist items by project, lab, or department for better organization.

**Create Project**:
- Click "Create New Project" button
- Dialog with fields:
  - **Project Name** (text input, required):
    - Placeholder: "e.g., Lab Expansion Q1 2025"
    - Validation: 3-100 characters
  - **Total Budget** (number input, optional):
    - For entire project
    - Helps track spending
  - **Timeline/Deadline** (date input, optional):
    - When equipment needed by
  - **Notes** (textarea, optional):
    - Additional context
- Save creates project

**Project Cards Display**:
- Card view showing all projects
- Each card:
  - Project name (heading)
  - Number of items: "X items in wishlist"
  - Budget tracking:
    - Total budget allocated
    - Budget spent (sum of matched equipment asking prices)
    - Budget remaining
    - Progress bar
  - Match status: "X of Y items matched"
  - Created date
  - "View Details" button

**Project Details**:
- Click card to view full project
- Shows all wishlist items in project
- Summary statistics
- Add new wishlist items to project
- Edit project details
- Delete project (keeps items)

---

#### 2. Add Wishlist Item

**Form to Add New Item**:

Click "Add to Wishlist" button → Opens dialog

**Form Fields**:

1. **Brand** (text input, required):
   - Placeholder: "e.g., Thermo Fisher"
   - Validation: 2-100 characters
   - Can use wildcards: "Thermo*" matches "Thermo Fisher", "Thermo Scientific"

2. **Model** (text input, required):
   - Placeholder: "e.g., TSQ Altis"
   - Validation: 1-100 characters
   - Can use wildcards: "TSQ*" matches any TSQ model

3. **Category** (dropdown, required):
   - Options: Analytical, Chromatography, Spectrometry, Processing, Packaging, Testing, Production, Measurement, Safety, Automation, Other
   - Helps narrow search

4. **Preferred Condition** (dropdown, required):
   - Options:
     - New only: Only search for new equipment
     - Refurbished only: Only refurbished
     - Used only: Only used
     - Any condition (default): Search all conditions
   - Affects search filters

5. **Maximum Budget** (number input, required):
   - Prefix: "$"
   - Placeholder: "0.00"
   - Validation: Must be > 0
   - Format: Thousands separator
   - Help text: "What's the most you'd pay for this equipment?"

6. **Priority** (dropdown, required):
   - Options:
     - High (urgent need): Search more frequently, top of match list
     - Medium (planned purchase): Normal search frequency
     - Low (nice to have): Lower priority in search
   - Default: Medium

7. **Required Specifications** (optional, dynamic key-value):
   - Add specific specs needed:
     - Key: Specification name (e.g., "Flow Rate")
     - Value: Required value (e.g., "≥5 mL/min")
   - "Add Specification" button
   - Used in AI matching to filter results

8. **Notes** (textarea, optional):
   - Placeholder: "Any specific requirements or preferences"
   - Max 1000 characters
   - Examples:
     - "Must include autosampler"
     - "Prefer models from 2018 or newer"
     - "Need CE certification"

9. **Assign to Project** (dropdown, required):
   - Options: List of existing projects + "Create New Project"
   - If "Create New": Inline project creation
   - Default: "Default Wishlist"

**Action Buttons**:
- **"Save & Find Matches"** (primary button, green):
  - Saves wishlist item
  - Immediately triggers AI matching workflow
  - User sees "Searching for matches..." loading state
- **"Save as Draft"** (secondary button, gray):
  - Saves wishlist item
  - Does NOT trigger matching (manual trigger later)
  - For incomplete criteria or future searches

**Save Action**:
```javascript
const wishlistItem = {
  brand: formData.brand,
  model: formData.model,
  category: formData.category,
  preferred_condition: formData.preferred_condition,
  max_budget: formData.max_budget,
  priority: formData.priority,
  required_specs: specificationsObject,
  notes: formData.notes,
  project_id: selectedProject.id,
  created_by: user.email,
  created_at: new Date(),
  status: 'active' // or 'draft'
};
await WishlistItem.create(wishlistItem);
```

---

#### 3. AI-Powered Matching (Automatic Background Process)

**CRITICAL**: Users NEVER see "jobs" - this is internal background processing.

**What User Sees**:
- Click "Save & Find Matches"
- Loading indicator appears: "Searching for matches..."
- Progress indicators:
  - "Searching internal database..." (0-30%)
  - "Searching external listings..." (30-70%)
  - "Analyzing specifications..." (70-100%)
- After 2-3 minutes: "Found X matches" (success message)
- Match results appear

**What Happens Behind the Scenes**:

**Step 1: Create Background Job** (Internal)
- System creates job record in database
- Job contains: wishlist_item_id, search_criteria, status: 'pending'
- Frontend polls job status every 2 seconds

**Step 2: Multi-Source Search** (2-3 minute process)

**2a. Internal Database Search**:
- Query PostgreSQL equipment table
- Filters:
  - `listing_status = 'active'` (only published equipment)
  - Brand match (exact + fuzzy):
    ```sql
    brand ILIKE '%{brand}%' 
    OR SIMILARITY(brand, '{brand}') > 0.6
    ```
  - Model match (exact + fuzzy):
    ```sql
    model ILIKE '%{model}%'
    OR SIMILARITY(model, '{model}') > 0.6
    ```
  - Category match: `category = '{category}'`
  - Condition match (if preferred_condition not "any")
- Return: List of equipment IDs

**2b. External Google Search** (via Apify):
- Actor: `apify/google-search-scraper`
- Query: "{brand} {model} buy {category}"
- Example: "Thermo Fisher TSQ Altis buy analytical"
- Max 20 results
- Extract:
  - Product URLs
  - Titles
  - Snippets (price, condition hints)
- Filter:
  - Must contain brand
  - Must contain model
  - Exclude PDFs, manuals
  - Exclude spare parts

**2c. PDF Manual Discovery** (via Apify):
- Actor: `apify/google-search-scraper`
- Query: "{brand} {model} (manual OR specification OR datasheet) filetype:pdf"
- Download top 3 PDFs
- Extract text for specification comparison

**2d. Specification Extraction** (OpenAI GPT-4o-mini):
- For each candidate equipment (internal + external):
  - If has manual PDF:
    - Extract specs from PDF text
  - If no PDF:
    - Search Google for "{brand} {model} specifications"
    - Extract specs from web pages
  - Parse to structured format:
    ```javascript
    specifications = {
      "Power": "500W",
      "Voltage": "220V",
      "Flow Rate": "5-10 mL/min"
      // ...
    }
    ```

**2e. Visual Analysis** (OpenAI GPT-4o Vision):
- For candidates with images:
  - If PDF manual has images:
    - Extract images from PDF
    - Compare equipment images with manual images
    - Calculate visual similarity (0-100)
  - If no manual images:
    - Analyze equipment images only
    - Extract visual features for comparison

**2f. AI Similarity Scoring** (OpenAI GPT-4o):
- For each candidate, calculate weighted similarity score

**Weighted Scoring Algorithm**:
```javascript
function calculateMatchScore(wishlistItem, candidateEquipment) {
  // Brand Match (25% weight)
  const brandScore = compareBrands(
    wishlistItem.brand, 
    candidateEquipment.brand
  );
  // 100: Exact match
  // 75: Parent company/subsidiary
  // 0: Different brand
  
  // Model Match (30% weight)
  const modelScore = compareModels(
    wishlistItem.model,
    candidateEquipment.model
  );
  // 100: Exact match
  // 80: Model variant (e.g., "TSQ Altis" vs "TSQ Altis Plus")
  // 50: Similar model series (e.g., "TSQ Altis" vs "TSQ 8000")
  // 0: Different model
  
  // Visual Similarity (35% weight)
  const visualScore = visualAnalysis.similarity_score; // 0-100
  // From OpenAI Vision comparison
  
  // Technical Specs (10% weight)
  const specsScore = compareSpecifications(
    wishlistItem.required_specs,
    candidateEquipment.specifications
  );
  // Semantic similarity of key specs
  // 100: All required specs match
  // 0: No specs match
  
  // Weighted Total
  const totalScore = (
    (brandScore * 0.25) +
    (modelScore * 0.30) +
    (visualScore * 0.35) +
    (specsScore * 0.10)
  );
  
  return totalScore; // 0-100
}
```

**2g. Match Categorization**:
```javascript
function categorizeMatch(score) {
  if (score >= 90) return "exact";       // Exact Match
  if (score >= 70) return "variant";     // Variant
  if (score >= 50) return "related";     // Related
  if (score >= 30) return "alternative"; // Alternative
  return null; // Too low, exclude
}
```

**Match Categories**:
- **Exact Match** (90-100 score):
  - Same brand
  - Same model
  - High visual similarity (>90)
  - Specifications match requirements
- **Variant** (70-89 score):
  - Same brand
  - Model variant (e.g., Plus, Pro version)
  - Similar specifications
  - Moderate visual similarity
- **Related** (50-69 score):
  - Same brand OR similar model
  - Partial specification match
  - Related equipment family
- **Alternative** (30-49 score):
  - Different brand
  - Similar function/category
  - Some specification overlap
  - Comparable alternative

**Step 3: Save Results** (Internal)
- Save all matches to database
- Link to wishlist_item_id
- Update job status: 'completed'
- Store match metadata

**Step 4: Frontend Display**
- Polling detects job completion
- Fetch match results
- Display to user
- Loading indicator disappears

---

#### 4. Match Results Display

**Match Count Indicator**:
- After search completes: "Found X matches for {brand} {model}"
- If 0 matches: "No matches found. We'll keep searching and notify you."

**Match Cards** (sorted by confidence, highest first):

Each match card displays:

**Equipment Information**:
- Primary image thumbnail
- Brand + Model (heading)
- Condition badge (color-coded)
- Asking price (large, bold)
- Location (with distance if user location set)

**Match Information**:
- **Match Type Badge** (top-right corner):
  - Exact Match: Green badge, checkmark icon
  - Variant: Blue badge, info icon
  - Related: Yellow badge, link icon
  - Alternative: Gray badge, sparkles icon
- **Confidence Score**:
  - Display: "85% Match"
  - Progress bar:
    - High (80-100%): Green bar
    - Medium (50-79%): Yellow bar
    - Low (30-49%): Red bar
- **Brief Explanation**:
  - Example: "Same brand and model, visual match confirmed"
  - Auto-generated from scoring details

**Price Intelligence** (CRITICAL):

**Visual Price Bar** (PriceBar component):
- Horizontal bar divided into 3 color zones:
  - Green (left): Used price range
  - Yellow (middle): Refurbished price range
  - Red (right): New price range
- **Two markers on bar**:
  1. **Equipment Asking Price** (vertical line):
     - Shows where seller's asking price sits in market
  2. **Your Budget** (vertical dashed line):
     - Shows your max budget position
- **Visual Feedback**:
  - If both markers in same zone: Clear comparison
  - If budget < asking price: Red highlight "Over Budget"
  - If budget ≥ asking price: Green highlight "Within Budget"

**Price Source Indicator**:
- If `price_source = "aggregated_from_products"`:
  - Green badge: "Based on X real market listings"
  - Checkmark icon
- If `price_source = "ai_estimate"`:
  - Yellow badge: "AI estimated prices"
  - Info icon

**Budget Analysis**:
- If asking_price ≤ max_budget:
  - Green text: "✓ Within Budget"
  - Subtext: "This is $X under your budget"
  - Encouragement: "Great deal!"
- If asking_price ≤ max_budget * 1.1 (within 10%):
  - Yellow text: "~ Near Budget"
  - Subtext: "This is $X over your budget (within 10%)"
  - Suggestion: "Consider negotiating"
- If asking_price > max_budget * 1.1:
  - Red text: "✗ Over Budget"
  - Subtext: "This is $X over your budget"
  - Warning: "Significantly above your budget"

**Price Breakdown** (expandable):
- Click "View Price Details" to expand
- Table showing:
  | Condition | Market Range | Avg | Equipment Price | Your Budget |
  |-----------|--------------|-----|-----------------|-------------|
  | New | $45K-$55K | $50K | - | - |
  | Refurbished | $30K-$40K | $35K | - | - |
  | Used | $20K-$28K | $24K | $XX,XXX | $XX,XXX |

**Match Details** (expandable):

Click "View Match Details" to expand:

**Key Matching Features**:
- Bulleted list with checkmarks:
  - "✓ Brand match: Thermo Fisher"
  - "✓ Model match: TSQ Altis"
  - "✓ Visual confirmation from manual (92% similarity)"
  - "✓ Specifications match: 8 of 10 required specs"
  - "✓ Category match: Analytical"

**Key Differences** (if any):
- Bulleted list with warning icons:
  - "⚠ Condition: Used (you prefer New)"
  - "⚠ Location: 500 miles from your location"
  - "⚠ Price: $5,000 over your budget"
  - "⚠ Missing spec: Flow Rate not specified"

**Specification Comparison** (if required_specs provided):
- Table comparing required vs actual:
  | Specification | Required | Actual | Match |
  |---------------|----------|--------|-------|
  | Flow Rate | ≥5 mL/min | 5-10 mL/min | ✓ |
  | Power | 500W | 500W | ✓ |
  | Voltage | 220V | 220V AC | ✓ |

**Action Buttons** (on each match card):

1. **"View Full Details"** (primary button):
   - Opens equipment detail dialog (5-tab modal)
   - Automatically shows Match Details tab
   - Full equipment information + match comparison

2. **"Place Bid"** (secondary button, green):
   - Opens bid dialog
   - Pre-fills bid amount with wishlist max_budget
   - Shows price context in dialog
   - One-click to submit bid

3. **"Save Match"** (icon button, bookmark icon):
   - Saves match to "Saved Matches"
   - Appears in Dashboard > Saved Matches
   - For later review

4. **"Dismiss"** (icon button, X icon):
   - Removes match from list
   - Confirmation: "Dismiss this match? You can re-run search later."
   - Match hidden but not deleted

5. **"Request Updated Prices"** (icon button, refresh icon):
   - Re-fetches market price context
   - Updates price bar
   - Shows timestamp: "Prices updated 2 minutes ago"

---

#### 5. Wishlist Item Management

**View All Wishlist Items**:

**List/Grid View Toggle**:
- Grid view: Cards showing key info
- List view: Table with all details

**Each Wishlist Item Card Shows**:

**Equipment Criteria**:
- Brand + Model (heading)
- Category badge
- Preferred condition badge
- Max budget (large, prominent)
- Priority indicator:
  - High: Red dot + "Urgent"
  - Medium: Yellow dot + "Planned"
  - Low: Green dot + "Optional"

**Match Status**:
- Match count: "X matches found"
- Best match preview:
  - If matches exist: Show thumbnail + price of top match
  - If no matches: "No matches yet"
- Last matched date: "Last searched: 2 days ago"

**Price Context** (CRITICAL - NEW Feature):

**"Get Price Context" Button** (per wishlist item):
- Purpose: Check typical market prices for equipment you WANT
- Helps validate if budget is realistic
- Process:
  1. Click "Get Price Context"
  2. Loading: "Checking market prices..."
  3. Call Price API with wishlist criteria
  4. Display results:

**Visual Price Bar**:
- Shows market ranges (new/refurbished/used) as colored bars
- Displays your budget as a header chip above the bar (e.g., "Your Budget: $50,000")
- Budget recommendations based on position relative to market ranges:
  - If budget in used range: "Budget realistic for used equipment"
  - If budget in refurb range: "Budget suitable for refurbished"
  - If budget in new range: "Budget appropriate for new equipment"
  - If budget below all ranges: "⚠ Budget may be too low. Market range: $XX,XXX - $XX,XXX"
  - If budget above all ranges: "✓ Budget is generous. Expect excellent options."

**Budget Intelligence**:
- Based on real market data
- Recommendations:
  - "Your budget of $XX,XXX is realistic for used equipment"
  - "Consider increasing budget to $XX,XXX for refurbished options"
  - "Your budget aligns with market prices for {condition} equipment"
  - "⚠ Market prices start at $XX,XXX. Consider adjusting budget."

**Price Source Badge**:
- Green: "Based on X real listings"
- Yellow: "AI estimated"

**Purpose**:
- Helps users set realistic budgets BEFORE matching
- Prevents wasted searches with too-low budgets
- Guides budget adjustments
- Educates users on market reality

**Actions per Wishlist Item**:

1. **"Edit"** button:
   - Opens edit dialog
   - Modify any criteria:
     - Budget
     - Preferred condition
     - Required specs
     - Notes
   - "Save Changes" triggers new search

2. **"Re-run Matching"** button:
   - Manual refresh trigger
   - Useful if:
     - New equipment added to marketplace
     - Criteria edited
     - Want fresh results
   - Same matching process
   - Updates existing matches

3. **"View Matches"** button:
   - Jumps to match results for this item
   - Filters match list
   - Shows only matches for this wishlist item

4. **"Mark as Found"** button:
   - When equipment purchased (on or off platform)
   - Changes status to 'found'
   - Removes from active wishlist
   - Moves to "Purchased History" (optional feature)
   - Keeps historical data

5. **"Delete"** button:
   - Remove wishlist item
   - Confirmation: "Delete this wishlist item? Associated matches will be archived."
   - Deletes wishlist item
   - Archives matches (not deleted, for history)

---

#### 6. Filter & Sort Matches

**Filter Options** (applied to match results):

1. **Match Type**:
   - Exact Match only
   - Variant
   - Related
   - Alternative
   - Multiple selection (checkboxes)

2. **Confidence Level**:
   - High (80-100%)
   - Medium (50-79%)
   - Low (30-49%)
   - Slider or checkboxes

3. **Price vs Budget**:
   - Under budget
   - Near budget (within 10%)
   - Over budget
   - Radio buttons

4. **Condition**:
   - New
   - Refurbished
   - Used
   - Checkboxes

5. **Location Proximity** (if user location set):
   - Within 50 miles
   - Within 100 miles
   - Within 500 miles
   - Any location
   - Dropdown

6. **Date Found**:
   - Today
   - Last 7 days
   - Last 30 days
   - All time
   - Dropdown

**Sort Options**:

1. **Confidence** (default):
   - Highest score first
   - Shows best matches at top

2. **Price (Low to High)**:
   - Cheapest equipment first
   - Good for budget-conscious users

3. **Price (High to Low)**:
   - Most expensive first
   - Shows premium options

4. **Date Found (Newest)**:
   - Recently matched equipment first
   - Default for new matches

5. **Date Found (Oldest)**:
   - Oldest matches first
   - Review unaddressed matches

6. **Distance** (if location available):
   - Closest equipment first
   - Minimizes shipping costs

**Filter/Sort UI**:
- Horizontal filter bar above match results
- Dropdown selectors for each filter
- Active filter count: "3 filters applied"
- "Clear All Filters" button
- Sort dropdown (right-aligned)
- Results update in real-time

---

#### 7. Wishlist Analytics

**Summary Statistics Dashboard**:

**Overview Card**:
- Total wishlist items: Count of active items
- Total budget allocated: Sum of all max_budgets
- Items with matches: Count with ≥1 match
- Items without matches: Count with 0 matches
- Average match confidence: Mean of all match scores
- High-priority items: Count with priority = "high"

**Price Intelligence Summary** (CRITICAL):
- **Total Estimated Cost** (based on market prices):
  - For each wishlist item:
    - Use market average for preferred condition
    - If no market data, use AI estimate
  - Sum all estimated costs
  - Display: "Estimated total cost: $XXX,XXX"
  - Compare to total budget allocated
- **Budget vs Market Reality Gap**:
  - Calculate: `total_allocated_budget - total_estimated_cost`
  - If positive: "✓ Budget surplus: $XX,XXX (you're well-funded)"
  - If negative: "⚠ Budget shortfall: $XX,XXX (consider adjusting budgets)"
  - Percentage: "Your budget is X% of estimated market cost"
- **Recommendations**:
  - "Consider increasing budgets for 3 items with unrealistic budgets"
  - "Your budgets align well with market prices"
  - "Focus on used/refurbished to stay within budget"

**Match Success Rate**:
- Percentage of items with matches
- Display: "Match rate: X% (Y of Z items matched)"
- Progress bar visual

**Budget Utilization**:
- How much of budget used (if bids placed/purchases made)
- Display: "$XX,XXX of $XXX,XXX budget used (X%)"
- Remaining budget: "$XX,XXX"

**Visual Charts** (optional):
- Pie chart: Match types distribution (Exact, Variant, Related, Alternative)
- Bar chart: Matches per wishlist item
- Line chart: Match confidence over time

---

## 🔑 Critical Data Flows

### Equipment Lifecycle (Surplus)

```
1. User uploads images → Wasabi storage
   ↓
2. AI analyzes ALL images → Weighted scoring → Best result
   ↓
3. AI searches for manual → PDF download → Text extraction
   ↓
4. AI extracts specs from PDF/web
   ↓
5. AI validates visually (images vs manual)
   ↓
6. User reviews/edits auto-filled form
   ↓
7. User requests price context → Real market prices fetched
   ↓
8. User validates asking price vs market
   ↓
9. Save as draft (listing_status = 'draft')
   ↓
10. Publish → listing_status = 'active' → Marketplace visibility
```

### Wishlist Matching Flow

```
User creates wishlist item → "Save & Find Matches"
  ↓
Background job created (internal, user sees "Searching...")
  ↓
Multi-source search (2-3 minutes):
  1. Internal database query (active equipment)
  2. Google Shopping search (Apify)
  3. Google web search (Apify)
  4. PDF manual discovery (Apify)
  5. Specification extraction (OpenAI)
  6. Visual analysis (OpenAI Vision)
  7. AI similarity scoring (weighted algorithm)
  8. Match categorization (Exact/Variant/Related/Alternative)
  ↓
Save match results to database
  ↓
User sees: "Found X matches"
  ↓
Match cards display:
  - Equipment info
  - Match type + confidence
  - Asking price display
  - Budget comparison (over/under budget shown as text)
  ↓
User actions:
  - View full details
  - Place bid (pre-filled with budget)
  - Save match
  - Dismiss
```

### Price Context Request Flow (Wishlist Item)

```
User clicks "Get Price Context" on wishlist item
  ↓
Frontend calls Price API with wishlist criteria
  ↓
Backend price discovery (same as Surplus/Marketplace)
  ↓
Return market price ranges
  ↓
Frontend displays:
  - Visual Price Bar (user's budget marked)
  - Budget intelligence:
    - "Budget realistic for used equipment"
    - "Consider increasing to $XX,XXX for refurbished"
  - Price source badge (real data vs AI)
  - Recommendations for budget adjustment
  ↓
User adjusts budget if needed
  ↓
Re-run matching with new budget
```

---

## ✅ Success Criteria

**Surplus Section**:
1. ✅ Image upload works (multiple files, drag-drop, Wasabi storage)
2. ✅ AI workflow completes all phases:
   - Multi-image analysis (analyzes ALL images, weighted scoring)
   - Manual search (PDF discovery)
   - Specification extraction (PDF or web)
   - Visual validation (image comparison)
   - Descriptive fallback (if ID fails)
3. ✅ Form pre-fills with AI data
4. ✅ User can edit all fields
5. ✅ Price context request fetches real market prices
6. ✅ PriceBar shows asking price vs market
7. ✅ Price intelligence provides recommendations
8. ✅ Save as draft works (listing_status = 'draft')
9. ✅ Publish validates and publishes (listing_status = 'active')
10. ✅ Drafts tab management functional
11. ✅ Active listings tab functional
12. ✅ Projects tab allows grouping

**Wishlist Section**:
13. ✅ Create wishlist projects
14. ✅ Add wishlist items with all criteria
15. ✅ "Save & Find Matches" triggers background matching
16. ✅ Multi-source search finds equipment (internal + external)
17. ✅ AI scoring calculates match confidence (weighted algorithm)
18. ✅ Match categorization works (Exact/Variant/Related/Alternative)
19. ✅ **Price context request per wishlist item**:
    - "Get Price Context" button functional
    - Shows if budget is realistic
    - Recommendations for budget adjustment
20. ✅ Match results display with all information
21. ✅ Actions work: View Details, Place Bid, Save, Dismiss
22. ✅ Filter and sort matches functional
23. ✅ Wishlist item management (edit, re-run, delete, mark found)
24. ✅ Wishlist analytics show budget vs market reality

---

**This documentation covers COMPLETE functionality for Surplus and Wishlist sections. UI is already built; this specifies how features work, data flows, and user interactions.**
