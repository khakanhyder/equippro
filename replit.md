# Equipment Pro - Industrial Equipment Marketplace

## Overview

Equipment Pro is a professional B2B marketplace platform for buying and selling research and industrial equipment. The platform features AI-powered equipment matching, real-time price discovery from market data, and intelligent automation for equipment trading workflows. It targets scientific and industrial organizations looking to buy surplus equipment or sell excess inventory.

## Recent Changes

**November 18, 2025** - Completed Surplus Equipment Management Workflow:
- Implemented expandable surplus item cards with collapsed/expanded states matching wishlist design pattern
- Added external source search integration using Apify service for PDFs and web documentation
- Enhanced price context display with safe parsing for currency symbols and numeric validation
- Integrated complete publish workflow: draft → active → marketplace listing flow
- Fixed API response normalization for external sources (url/title structure)
- Added comprehensive error handling and type safety throughout surplus components

The application provides five core user-facing sections:
1. **Marketplace** - Browse and purchase equipment with real-time market pricing context
2. **Dashboard** - Track bids, offers, and AI-generated equipment matches
3. **Wishlist** - Create project-based equipment wishlists with AI-powered matching
4. **Surplus** - List equipment for sale with AI-assisted data entry and price validation
5. **Profile** - Manage account settings and preferences

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: The application uses shadcn/ui components (Radix UI primitives) with a custom "New York" style variant. The design system is based on enterprise patterns optimized for data-dense layouts, drawing inspiration from industrial marketplace platforms like Alibaba/ThomasNet and enterprise dashboards like Linear and Stripe.

**Styling**: Tailwind CSS with custom design tokens defined in CSS variables. The application supports both light and dark modes with a neutral color palette. Typography uses the Inter font family for optimal readability in data-heavy interfaces.

**State Management**: TanStack Query (React Query) handles all server state, caching, and synchronization. The application uses custom hooks to encapsulate data fetching logic for equipment, projects, wishlist items, and matches.

**Routing**: Wouter provides lightweight client-side routing for navigation between the five main sections.

**Layout System**: The application uses a sidebar layout with the AppSidebar component providing persistent navigation. The sidebar is responsive and uses the SidebarProvider context for state management.

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful API endpoints organized by resource type (equipment, projects, wishlist items, matches). The API handles CRUD operations, file uploads, and AI analysis requests.

**Development Server**: Vite middleware is integrated into Express for hot module replacement during development. The production build serves static assets from the dist directory.

**Request Processing**: The server uses middleware for JSON parsing, URL-encoded data, and request logging. Custom middleware tracks response times and logs API requests.

### Data Storage

**Database**: PostgreSQL with environment-based configuration
- **Development**: Replit's built-in PostgreSQL database (automatically configured via DATABASE_URL)
- **Production**: Any PostgreSQL provider (Neon, Supabase, AWS RDS, Azure, Google Cloud SQL)
  - Configure production DATABASE_URL in environment variables
  - Compatible with any standard PostgreSQL database (version 12+)

**ORM**: Drizzle ORM provides type-safe database access with schema-first design. The schema defines tables for users, equipment listings, surplus projects, wishlist projects, wishlist items, matches, and price context cache.

**Schema Design**: 
- Equipment listings support draft and active states with fields for brand, model, category, condition, pricing, location, images, documents, specifications, and AI analysis data
- Projects group related equipment (both surplus and wishlist) for bulk management
- Wishlist items track desired equipment with budget constraints and matching status
- Matches connect wishlist items to marketplace equipment with confidence scores
- Price context cache stores AI-generated market price estimates

**Migrations**: Drizzle Kit manages database migrations with schema changes tracked in the migrations directory.

### Authentication and Authorization

**Current Implementation**: The application currently uses a placeholder authentication system with a MemStorage implementation for user data. Users are mocked as authenticated by default.

**Planned Integration**: Comments indicate Replit Auth will handle authentication via Google, GitHub, or email providers. Session management will use connect-pg-simple for PostgreSQL-backed sessions.

**Access Control**: Equipment listings, projects, and wishlist items are filtered by the `createdBy` field to ensure users only see their own data. The `createdBy` field stores user identifiers (currently "demo-user" placeholder).

### External Dependencies

**OpenAI Integration**: The application integrates GPT-4 Vision (gpt-4o model) for AI-powered equipment analysis:

1. **Equipment Image Analysis**: Analyzes uploaded equipment photos to extract brand, model, category, description, and specifications. Returns structured data with confidence scores.

2. **Price Estimation**: Generates market price estimates for equipment based on brand, model, category, and condition. Provides price ranges for new, refurbished, and used conditions with sourcing information.

The AI service functions are centralized in `server/services/ai-service.ts` with methods:
- `analyzeEquipmentFromImages()` - Image analysis for equipment identification
- `estimatePrice()` - Market price estimation

**Apify Integration**: The application uses Apify for external data collection:

1. **PDF and Web Search**: Searches for equipment manuals, datasheets, and specifications from Google results and PDF documents.

The Apify service is centralized in `server/services/apify-service.ts` with method:
- `searchPDFsAndWeb()` - Searches external sources for equipment documentation

**Shared Client Services**: Common client-side utilities are organized in `client/src/lib/`:
- `ai-service.ts` - Client-side AI analysis and search functions
- `file-upload.ts` - File upload utilities with validation for images and documents

**File Storage**: Replit Object Storage handles image and document uploads. The upload system supports:
- Images: JPEG, PNG, WebP (max 10MB)
- Documents: PDF, Excel, Word (max 25MB)

Files are validated for type and size, then stored with unique identifiers. The storage client is configured via the `DEFAULT_OBJECT_STORAGE_BUCKET_ID` environment variable.

**File Access**: Replit Object Storage does not support public URLs or signed URLs. Files are served through a backend proxy endpoint (`/api/files/:filename`) that streams files from object storage to clients. This enables:
- OpenAI Vision API to analyze uploaded images
- Browser display of equipment photos and documents
- Secure file access without exposing storage credentials

The upload service generates proxy URLs in the format: `{baseUrl}/api/files/{filename}` where baseUrl is determined from environment variables (REPL_SLUG/REPL_OWNER for production, localhost for development).

**AWS S3**: The @aws-sdk/client-s3 package is included but not currently implemented in the codebase. This suggests planned integration for production file storage migration from Replit Object Storage.

### Design System

**Typography Hierarchy**:
- Page Headers: 30px bold
- Section Headers: 20px semibold  
- Card Titles: 18px medium
- Body Text: 16px normal
- Labels/Metadata: 14px medium
- Captions: 12px normal

**Spacing System**: Uses Tailwind spacing units (2, 4, 6, 8, 12, 16) with consistent padding and gap patterns across cards, sections, and page layouts.

**Container Widths**: Content is constrained to 7xl max-width (80rem) for optimal readability on large screens. Sidebars use fixed 256px width.

**Grid Patterns**: Responsive grids adapt from single column on mobile to 2-4 columns on desktop, optimized for equipment cards, dashboard stats, and specification sheets.

**Color System**: Custom HSL-based color tokens defined in CSS variables support theming with primary, secondary, muted, accent, and destructive variants. Each variant includes DEFAULT, foreground, and border colors.

**Interactive States**: Custom CSS classes `hover-elevate` and `active-elevate-2` provide consistent elevation changes on user interaction using CSS variables `--elevate-1` and `--elevate-2`.

### Key Architectural Decisions

**Monorepo Structure**: The codebase uses a shared directory for common TypeScript types and schemas, enabling type safety across client and server boundaries without code duplication.

**Type Safety**: Zod schemas validate all data at runtime while providing TypeScript types through Drizzle's type inference. This ensures data integrity from API requests through database operations.

**Image-First Equipment Entry**: The surplus listing workflow prioritizes image upload, allowing AI to pre-populate form fields. This reduces data entry friction while maintaining flexibility for manual input.

**Price Context Integration**: Equipment listings and wishlist items can fetch real-time market price estimates, storing results in a cache table to minimize API costs and improve performance.

**Project-Based Organization**: Both surplus and wishlist items can be grouped into projects, enabling bulk operations and better organization for users managing multiple equipment acquisitions or disposals.

**Match Confidence Scoring**: AI-generated matches between wishlist items and marketplace equipment include confidence levels (high/medium/low) and match types (exact/variant/related/alternative) to help users prioritize opportunities.