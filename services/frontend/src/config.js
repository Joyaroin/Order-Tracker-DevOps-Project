// At runtime in Docker/K8s, env-config.js sets window._env_ from container env vars.
// In local dev (npm start), window._env_ won't exist, so we fall back to CRA's build-time value.
export const ENVIRONMENT =
  window._env_?.REACT_APP_ENVIRONMENT ||
  process.env.REACT_APP_ENVIRONMENT ||
  'local';
