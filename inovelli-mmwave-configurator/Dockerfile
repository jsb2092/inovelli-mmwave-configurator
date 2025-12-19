ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install Node.js and nginx
RUN apk add --no-cache nodejs npm nginx

# Copy frontend source
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Setup nginx to serve the built frontend
RUN mkdir -p /var/www/html
RUN cp -r /app/dist/* /var/www/html/

# Configure nginx
COPY nginx.conf /etc/nginx/http.d/default.conf

# Create s6-overlay service directory
RUN mkdir -p /etc/services.d/nginx

# Copy run script for s6
COPY run.sh /etc/services.d/nginx/run
RUN chmod a+x /etc/services.d/nginx/run
