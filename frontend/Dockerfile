# Multi-stage Dockerfile for Next.js Frontend
FROM node:20-alpine AS base

# Install security packages
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    libc6-compat

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production --silent

# Build stage
FROM base AS builder
COPY package*.json ./
RUN npm ci --silent

COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Build Next.js application
RUN npm run build

# Production image with Nginx
FROM nginx:alpine AS runner
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration with security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check for load balancer
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]