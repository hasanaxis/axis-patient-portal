# Dockerfile for React Native Build Environment
FROM node:20-alpine AS base

# Install dependencies for React Native builds
RUN apk add --no-cache \
    git \
    curl \
    ca-certificates \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production --silent

# Development/Build environment
FROM base AS builder
COPY package*.json ./
RUN npm ci --silent

COPY . .
COPY --from=deps /app/node_modules ./node_modules

# For Metro bundler and React Native builds
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8081/status || exit 1

CMD ["npm", "start"]