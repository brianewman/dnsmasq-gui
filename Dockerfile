# Stage 1: Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (for build)
RUN npm install

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-slim

# Install dnsmasq, chrony, and curl for healthchecks
RUN apt-get update && apt-get install -y \
    dnsmasq \
    chrony \
    curl \
    ntpdate \
    dnsutils \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY package*.json ./
COPY examples/ ./examples/

# Install production dependencies only
RUN npm install --only=production

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Required directories
RUN mkdir -p /app/configs /app/data /var/log

# Expose ports (for documentation purposes, as we'll use network_mode: host)
# 53: DNS
# 67/68: DHCP
# 3000: GUI
EXPOSE 53/udp 67/udp 68/udp 3000/tcp

CMD ["./docker-entrypoint.sh"]
