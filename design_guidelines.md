# EquipTradeV1 Design Guidelines

## Design Approach: Enterprise Design System

**Rationale**: Industrial B2B marketplace requiring data-dense layouts, complex workflows, and professional trust signals. Drawing from enterprise patterns (Material Design for data tables, Salesforce for dashboards) while maintaining custom industrial aesthetic.

**Reference Points**: 
- Alibaba/ThomasNet for industrial marketplace patterns
- Linear for clean data hierarchy
- Stripe Dashboard for transaction management
- Notion for project organization (Wishlist projects)

---

## Core Design Elements

### A. Typography

**Font Family**: Inter (Google Fonts) - excellent for data-heavy interfaces
- Primary: `font-family: 'Inter', sans-serif`
- Fallback system fonts for performance

**Hierarchy**:
- Page Headers: `text-3xl font-bold` (30px, 700 weight)
- Section Headers: `text-xl font-semibold` (20px, 600 weight)
- Card Titles: `text-lg font-medium` (18px, 500 weight)
- Body Text: `text-base font-normal` (16px, 400 weight)
- Labels/Metadata: `text-sm font-medium` (14px, 500 weight)
- Captions: `text-xs font-normal` (12px, 400 weight)

### B. Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16**
- Tight spacing (within cards): `p-4, gap-2`
- Standard spacing (between elements): `p-6, gap-4`
- Section spacing: `p-8, gap-6`
- Page margins: `p-12` or `p-16`

**Container Widths**:
- Full-width app shell: `w-full`
- Content max-width: `max-w-7xl mx-auto`
- Sidebar: `w-64` (256px fixed)
- Modal dialogs: `max-w-4xl` for detail views, `max-w-md` for forms

**Grid Systems**:
- Equipment cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Dashboard stats: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Spec sheets: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

---

## Component Library

### Navigation & Shell

**Sidebar** (Fixed Left, Dark Theme):
- Dark navy background (primary brand color - will be defined later)
- Width: `w-64`
- Logo at top: `p-6`
- Navigation items: `px-4 py-3 rounded-lg` with icon + label
- Active state: Subtle highlight background
- Section dividers between main sections

**Top Bar** (Optional for mobile):
- Mobile hamburger menu
- User profile dropdown (right aligned)
- Breadcrumbs for deep navigation

### Cards & Containers

**Equipment Card** (Marketplace):
- Aspect ratio image: `aspect-video` or `aspect-square`
- Checkbox overlay (top-left): `absolute top-2 left-2`
- Condition badge (top-right): `absolute top-2 right-2`
  - New: Green background
  - Refurbished: Yellow/amber background  
  - Used: Gray background
- Content padding: `p-4`
- Brand/Model: `text-lg font-semibold`
- Price: `text-2xl font-bold`
- Location/Category: `text-sm` with icons
- AI price indicator: Small badge with +/- percentage

**Dashboard Stat Card**:
- Border with subtle shadow
- Icon (large, left aligned): `w-12 h-12`
- Metric number: `text-3xl font-bold`
- Label: `text-sm font-medium`
- Hover: Slight elevation increase
- Click area: Entire card

**Data Table Rows**:
- Zebra striping for readability
- Row height: `py-4`
- Hover state: Background highlight
- Action buttons (right aligned): Icon buttons `w-8 h-8`

### Forms & Inputs

**Input Fields**:
- Border with rounded corners: `rounded-lg border-2`
- Padding: `px-4 py-3`
- Focus state: Border emphasis (will define colors later)
- Label above: `text-sm font-medium mb-2`
- Helper text below: `text-xs`

**Dropdowns/Selects**:
- Same styling as inputs
- Chevron icon (right): `absolute right-4`
- Custom dropdown menu with scrolling for long lists

**Search Bar**:
- Icon prefix (magnifying glass): `absolute left-4`
- Text input: `pl-12 pr-4` to accommodate icon
- Clear button (X) when text present: `absolute right-4`

**Buttons**:
- Primary: `px-6 py-3 rounded-lg font-semibold`
- Secondary: Same size, different treatment
- Icon buttons: `w-10 h-10 rounded-lg` with centered icon
- Disabled state: Reduced opacity

### Modals & Dialogs

**Equipment Detail Modal** (5-Tab Structure):
- Full-screen overlay with backdrop blur
- Modal container: `max-w-4xl` centered
- Tab navigation: Horizontal pills at top
- Tab content: `p-8` with scrolling
- Close button: `absolute top-4 right-4`

**Bid/Offer Dialog**:
- Centered modal: `max-w-md`
- Equipment summary card at top
- Form fields below
- Action buttons: Full-width at bottom

### Data Visualization

**Price Bar Component**:
- Horizontal gradient bar
- Three zones (Used/Refurbished/New)
- Asking price marker: Triangle or line indicator
- Labels at boundaries
- Height: `h-12`

**Match Confidence Indicator**:
- Circular progress or percentage badge
- High (80-100%): Green
- Medium (50-79%): Yellow
- Low (<50%): Red

**Status Badges**:
- Pill shape: `rounded-full px-3 py-1`
- Text: `text-xs font-semibold uppercase tracking-wide`
- Icon prefix optional
- Color-coded by status type

---

## Authentication Screens

**Login/Signup Pages**:
- Split layout on desktop: `grid-cols-1 lg:grid-cols-2`
- Left side: Branding, hero image, value proposition
- Right side: Form (centered vertically)
- Form container: `max-w-md p-8`
- Logo at top of form
- Social login buttons (Replit Auth): Icon + text, `w-full mb-4`
- Divider: "OR" with horizontal lines
- Email/password inputs stacked
- Primary action button: Full-width
- Link to alternate action: "Don't have an account? Sign up"

**Hero Image** (Login/Signup Left Panel):
- Full-height image: `h-screen`
- Overlay gradient for text readability
- Tagline/benefit text: Large, bold typography
- 3-4 key benefits listed with icons

---

## Section-Specific Layouts

### Marketplace
- Filter sidebar (left or collapsible): `w-64`
- Equipment grid (right): Remaining space
- View toggle (grid/list): Top right
- Sort dropdown: Top right next to view toggle
- Bulk action bar (sticky bottom): Appears when items selected

### Dashboard
- 4-column stat cards (top row)
- Alert boxes below stats (full width)
- Content sections: 2-column layout where appropriate
- Activity feed: Single column, timeline style on right

### Wishlist
- Project selector dropdown (top)
- Add item button (prominent, top right)
- Wishlist items: List view with match indicators
- Match cards: Include confidence badges and comparison preview

### Surplus
- Listing status tabs: Draft / Active / Sold
- Equipment form: Multi-step or single long form with sections
- Bulk import: Drag-drop area with file upload
- Preview cards: Show how listing will appear in marketplace

---

## Icons
**Library**: Heroicons (outline for secondary, solid for primary actions)
- Navigation: Home, Package, Target, PlusCircle, User
- Actions: Search, Filter, Edit, Trash, Check, X
- Status: CheckCircle, XCircle, Clock, AlertTriangle

---

## Responsive Behavior
- Mobile (<768px): Single column, collapsible sidebar → hamburger menu
- Tablet (768-1024px): 2-column grids, sidebar persistent
- Desktop (>1024px): Multi-column grids, fixed sidebar, full features

---

## Animation
Use sparingly - only for:
- Page transitions: Fade in content
- Modal open/close: Scale + fade
- Loading states: Spinner or skeleton screens
- Success confirmations: Check mark animation
- Optimistic UI: Instant state change with subtle feedback