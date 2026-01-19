# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies including devDependencies (required for vite build)
ENV NODE_ENV=development
# Add ONLY this memory optimization - less aggressive
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm ci

# Copy source code
COPY . .

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Build production server separately (doesn't import vite)
RUN npx esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy drizzle config for migrations
COPY drizzle.config.ts ./
COPY shared ./shared

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the production server (doesn't import vite)
CMD ["node", "dist/production.js"]
