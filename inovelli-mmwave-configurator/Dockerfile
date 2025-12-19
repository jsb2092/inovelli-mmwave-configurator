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

# Copy nginx config
COPY rootfs/etc/nginx/http.d/default.conf /etc/nginx/http.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
