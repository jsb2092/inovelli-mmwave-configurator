ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install Node.js and npm
RUN apk add --no-cache nodejs npm

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Setup server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./

# Create data directory for SQLite
RUN mkdir -p /data

WORKDIR /app/server

ENV PORT=8099
ENV DATA_DIR=/data

EXPOSE 8099

CMD ["node", "index.js"]
