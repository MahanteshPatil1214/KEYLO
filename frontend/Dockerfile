# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies (better layer caching)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# ------------------------------------------------------------
# Development stage: Vite dev server with HMR via volume mounts
# ------------------------------------------------------------
FROM base AS dev

ENV VITE_API_BASE_URL=http://backend:8000/api/v1

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ------------------------------------------------------------
# Build stage: production assets
# ------------------------------------------------------------
FROM base AS build

ENV VITE_API_BASE_URL=http://localhost:8000/api/v1

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------
# Production stage: Nginx serving static assets
# ------------------------------------------------------------
FROM nginx:alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
