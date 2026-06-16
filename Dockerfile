# syntax=docker/dockerfile:1
# Production web: static Expo export + `serve`.
# Railway uses this Dockerfile when present (see https://docs.railway.com/deploy/dockerfiles).
# Map the same EXPO_PUBLIC_* service variables as Docker build arguments so `expo export` inlines them.

FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_SITE_URL
ARG EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL
ARG EXPO_PUBLIC_FUNCTIONS_URL

ENV NODE_ENV=production \
    EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL} \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY} \
    EXPO_PUBLIC_SITE_URL=${EXPO_PUBLIC_SITE_URL} \
    EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL=${EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL} \
    EXPO_PUBLIC_FUNCTIONS_URL=${EXPO_PUBLIC_FUNCTIONS_URL}

RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["sh", "-c", "serve dist -l tcp://0.0.0.0:${PORT:-8080} --no-clipboard"]
