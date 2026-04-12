#!/bin/sh
set -e

# Substitute only our env vars — leave nginx variables ($uri, $host, etc.) intact
envsubst '${ORDER_API_URL} ${ALERTING_SERVICE_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Inject runtime environment variables into a JS file the browser can read
# (CRA bakes REACT_APP_* at build time, so env vars set in K8s ConfigMaps
#  won't take effect unless we inject them at container startup)
cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  REACT_APP_ENVIRONMENT: "${REACT_APP_ENVIRONMENT:-local}"
};
EOF

exec nginx -g 'daemon off;'
