#!/usr/bin/with-contenv bashio

bashio::log.info "Starting Inovelli mmWave Zone Configurator..."

# Start nginx
nginx -g "daemon off;"
