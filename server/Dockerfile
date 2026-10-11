# ==============================================================================
# Multi-Stage Production Dockerfile: MedVault Core Backend
# Strict Zero Data Exposure Invariant Enforced
# ==============================================================================

# --- Stage 1: Dependencies & Prisma Generation ---
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts || npm install
RUN npx prisma generate

# --- Stage 2: Minimal Production Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for clean PID 1 signal management (SIGTERM/SIGINT)
RUN apk add --no-cache dumb-init openssl libc6-compat curl

ENV NODE_ENV=production
ENV PORT=3001

# Copy files with proper non-root ownership
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node . .

# Ensure storage blobs directory exists and has correct permissions
RUN mkdir -p /app/storage_blobs && chown -R node:node /app/storage_blobs

# Switch to non-privileged node user
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
