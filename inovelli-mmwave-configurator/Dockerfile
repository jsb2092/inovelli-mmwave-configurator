ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install Node.js and nginx
RUN apk add --no-cache nodejs npm nginx

# Copy frontend source and build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Setup nginx to serve the built frontend
RUN mkdir -p /var/www/html
RUN cp -r /app/dist/* /var/www/html/

# Cleanup build files
RUN rm -rf /app

# Copy rootfs
COPY rootfs /
RUN chmod a+x /etc/s6-overlay/s6-rc.d/nginx/run
