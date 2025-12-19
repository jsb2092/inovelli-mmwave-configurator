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

# s6-overlay v3 service structure
RUN mkdir -p /etc/s6-overlay/s6-rc.d/nginx
RUN mkdir -p /etc/s6-overlay/s6-rc.d/user/contents.d

COPY run.sh /etc/s6-overlay/s6-rc.d/nginx/run
RUN chmod a+x /etc/s6-overlay/s6-rc.d/nginx/run
RUN echo "longrun" > /etc/s6-overlay/s6-rc.d/nginx/type
RUN touch /etc/s6-overlay/s6-rc.d/user/contents.d/nginx
