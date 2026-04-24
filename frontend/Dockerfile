FROM node:22-alpine AS base
WORKDIR /app

# --- Dependencies Stage ---
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# --- Development Stage ---
# Used by docker-compose for local hot-reloading
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
# Source code mounted via volume in docker-compose
CMD ["npm", "run", "dev"]

# --- Builder Stage ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Staging/Production Stage ---
# Optimized build for staging/production deployments
FROM base AS staging
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
