# ==============================================================================
# Multi-Stage Production Dockerfile: MedVault Client (React + Vite)
# ==============================================================================

# --- Stage 1: Build Static Assets ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts || npm install

COPY . .

# Set build-time API fallback
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# --- Stage 2: High-Performance Nginx Alpine Runtime ---
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom security-hardened nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled production bundle from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
