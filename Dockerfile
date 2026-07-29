# Build the Vite application in a reproducible Node image.
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve the SPA and persist application data with the Node standard library.
FROM node:22-alpine AS runtime

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
RUN mkdir -p /app/data && chown -R node:node /app

ENV PORT=3000
ENV DATA_FILE=/app/data/assessment.json
USER node
EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server.mjs"]

