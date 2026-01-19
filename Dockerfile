# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies with memory optimization
# Critical: Limit Node.js heap to 1GB to prevent OOM on 4GB server
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV NODE_ENV=development
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build using your package.json build script
# This runs: vite build && esbuild server/index.ts
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies with optimizations
ENV NODE_OPTIONS="--max-old-space-size=512"
RUN npm ci --omit=dev --prefer-offline --no-audit

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

# Start using your package.json start script (runs dist/index.js)
CMD ["npm", "start"]
