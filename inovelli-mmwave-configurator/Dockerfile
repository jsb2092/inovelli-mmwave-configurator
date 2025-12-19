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

# Copy run script
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
