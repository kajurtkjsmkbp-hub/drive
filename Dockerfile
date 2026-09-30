# Multi-stage Dockerfile for AetherDrive Cloud Storage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./
RUN npm ci

# Copy client files and build frontend
COPY client/package*.json ./client/
RUN npm --prefix client ci

COPY . .
RUN npm --prefix client run build

# Production image
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server and built frontend
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist

# Expose WebDAV and HTTP port
EXPOSE 5000

# Persistent data volume for SQLite & files
VOLUME ["/app/data"]

CMD ["node", "server/server.js"]
