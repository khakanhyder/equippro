# Equipment Pro - Industrial Equipment Marketplace

## Overview
Equipment Pro is a professional B2B marketplace platform for buying and selling research and industrial equipment. It features AI-powered equipment matching, real-time price discovery, and intelligent automation for trading workflows. The platform aims to connect scientific and industrial organizations for surplus equipment transactions, offering a comprehensive solution for managing equipment lifecycles from listing to sale.

## Recent Updates (November 28, 2025)
- **PDF Document Selection Fix**: Fixed infinite loop ("Maximum update depth exceeded") when selecting PDF search results by replacing Shadcn Checkbox with custom styled div and using array state with useEffect sync to form state
- **Document Persistence**: Selected documents now persist through form validation errors and correctly display when editing saved equipment

## Previous Updates (November 20, 2025)
- **Enhanced AI Analysis**: AI now extracts brand, model, category, **description** (2-3 sentence equipment description), and technical specifications from images
- **Redesigned Equipment Cards**: Complete UI rebuild with always-visible action buttons, prominent image carousel, and cleaner card layout using CardHeader/CardContent/CardFooter
- **Improved UX**: Eliminated expand/collapse pattern in favor of optional "Show more" toggle for extra details only

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **UI Component System**: shadcn/ui components (Radix UI primitives) with a "New York" style variant, optimized for data-dense enterprise layouts.
- **Styling**: Tailwind CSS with custom design tokens (CSS variables), supporting light/dark modes and a neutral color palette. Uses Inter font for readability.
- **State Management**: TanStack Query (React Query) for server state, caching, and synchronization, utilizing hierarchical query keys.
- **Routing**: Wouter for lightweight client-side navigation.
- **Layout System**: Sidebar layout (`AppSidebar`) for persistent navigation, responsive design.

### Backend Architecture
- **Framework**: Express.js with TypeScript on Node.js.
- **API Design**: RESTful API endpoints organized by resource type (equipment, projects, wishlist items, matches).
- **Development Server**: Vite middleware integrated with Express for HMR.
- **Request Processing**: Middleware for JSON parsing, URL-encoded data, and request logging.

### Data Storage
- **Database**: PostgreSQL (configured via `DATABASE_URL`).
- **ORM**: Drizzle ORM for type-safe database access and schema-first design.
- **Schema Design**: Tables for users, equipment listings (draft/active states), surplus projects, wishlist projects, wishlist items, matches, and price context cache.
- **Migrations**: Drizzle Kit manages database migrations.

### Authentication and Authorization
- **Current Implementation**: Local username/password authentication.
- **Authentication System**:
    - **Password Hashing**: bcryptjs (10 salt rounds).
    - **Session Management**: Express-session with in-memory `MemoryStore` (for development, production recommends `connect-pg-simple`).
    - **Auth Service**: `server/services/auth-service.ts` for signup, login, password changes, user management.
    - **API Endpoints**: POST `/api/auth/signup`, POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/user`, PATCH `/api/auth/password`, PATCH `/api/auth/profile`.
- **Frontend Auth State**: `useAuth` React Query hook, handles 401 responses by returning `null`.
- **Access Control & Security (November 2025 Update)**:
    - **Complete User Isolation**: All endpoints now require authentication via `requireAuth` middleware.
    - **Auto-Set User Context**: Backend automatically sets `createdBy` from `req.session.userId` on all POST operations, preventing client-side spoofing.
    - **Ownership Verification**: All GET/PATCH/DELETE operations verify ownership before allowing access. Returns 403 for unauthorized cross-user access attempts.
    - **Query Filtering**: All list endpoints (equipment, projects, wishlist items, matches) automatically filter by logged-in user.
    - **Protected Endpoints**: Equipment detail views, match queries, and status updates all verify the requesting user owns the related resources.
    - **Schema Security**: `createdBy` field omitted from all insert schemas, enforced server-side only.
    - **End-to-End Tested**: Multi-user isolation verified via automated Playwright tests.

### Design System
- **Typography**: Defined hierarchy for headers, body text, labels, and captions.
- **Spacing**: Tailwind spacing units for consistent padding and gaps.
- **Container Widths**: Content constrained to 7xl max-width; sidebars fixed 256px.
- **Grid Patterns**: Responsive grids (1 to 4 columns) for cards and data displays.
- **Color System**: HSL-based custom color tokens (CSS variables) for primary, secondary, muted, accent, destructive variants, supporting theming.
- **Interactive States**: `hover-elevate` and `active-elevate-2` classes for consistent elevation changes.

### Key Architectural Decisions
- **Monorepo Structure**: Shared directory for common TypeScript types/schemas ensures type safety across client/server.
- **Type Safety**: Zod schemas for runtime validation and TypeScript type inference.
- **Image-First Equipment Entry**: AI-powered pre-population of form fields from images in surplus listing workflow.
- **Price Context Integration**: Real-time market price estimates for equipment, cached for performance.
- **Project-Based Organization**: Grouping surplus and wishlist items into projects for bulk management.
- **Match Confidence Scoring**: AI-generated matches include confidence levels and match types.

## External Dependencies

- **OpenAI Integration**: GPT-4 Vision (gpt-4o) for AI-powered equipment analysis:
    - **Equipment Image Analysis**: Extracts brand, model, category, description, specifications from images.
    - **Price Estimation**: Generates market price estimates based on equipment details.
    - Services centralized in `server/services/ai-service.ts`.
- **Apify Integration**: Used for external data collection:
    - **PDF and Web Search**: Searches for equipment documentation and specifications.
    - Service centralized in `server/services/apify-service.ts`.
- **File Storage**: Replit Object Storage for image and document uploads (JPEG, PNG, WebP, PDF, Excel, Word).
    - Files served via backend proxy endpoint (`/api/files/:filename`) for secure access and AI analysis.
    - `DEFAULT_OBJECT_STORAGE_BUCKET_ID` environment variable for configuration.
    - `@aws-sdk/client-s3` is included, indicating a future migration path.