# Multi-stage Dockerfile for production-ready Node.js backend
FROM node:20-alpine AS base

# Install security and healthcare compliance tools
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    libc6-compat

WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production --silent

# Rebuild the source code only when needed
FROM base AS builder
COPY package*.json ./
RUN npm ci --silent

COPY . .
COPY --from=deps /app/node_modules ./node_modules

RUN npm run prisma:generate
RUN npm run build

# Production image, copy all the files and run
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Create logs directory for audit logs (healthcare compliance requirement)
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Health check for load balancer
COPY --chown=nodejs:nodejs healthcheck.js ./
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

USER nodejs

EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/simple-server.js"]