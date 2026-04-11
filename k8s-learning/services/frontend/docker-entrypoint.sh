#!/bin/sh
set -e

# Substitute only our env vars — leave nginx variables ($uri, $host, etc.) intact
envsubst '${ORDER_API_URL} ${ALERTING_SERVICE_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
