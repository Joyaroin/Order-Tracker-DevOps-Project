# Frontend Visual Map

A picture of how the Order Tracker frontend is wired together.

## 1. File tree

```
services/frontend/src/
├── index.js                  ← React entry point (mounts <App /> into DOM)
├── index.css                 ← Tailwind base
├── config.js                 ← runtime config reader (window._env_)
├── setupProxy.js             ← dev-only proxy: /api/* → backend services
├── App.js                    ← root component, composes the page
├── components/
│   ├── EnvironmentBanner.js  ← top banner (dev / staging / prod color)
│   ├── HealthPanel.js        ← health of both backends
│   ├── CreateOrderForm.js    ← form to POST a new order
│   ├── OrdersList.js         ← list of current orders (+ delete)
│   ├── AlertsFeed.js         ← list of alerts from alerting-service
│   └── Toast.js              ← popup for success / error messages
└── hooks/
    └── usePolling.js         ← custom hook: fetch a URL every N ms
```

## 2. Component tree (what renders inside what)

```
<App>
├── <EnvironmentBanner/>                      ← top of page
└── <main>
    ├── <HealthPanel/>                        ← polls health every 10s
    │   ├── HealthIndicator "Order API"        → /api/orders/health
    │   └── HealthIndicator "Alerting Service" → /api/alerts/health
    │
    ├── <div grid 2-col>
    │   ├── Left column
    │   │   ├── <CreateOrderForm/>            ← POST /api/orders/orders
    │   │   └── <OrdersList/>                 ← GET  /api/orders/orders (5s)
    │   │                                       DELETE /api/orders/orders/:id
    │   └── Right column
    │       └── <AlertsFeed/>                 ← GET /api/alerts/alerts (5s)
    │
    └── <Toast/>  (conditional)               ← shown when toast state ≠ null
```

## 3. State ownership

```
App
 └─ toast: { message, type } | null          ← only state App owns
     ▲                       │
     │ showToast(msg, type)  │ <Toast onClose={...} />
     │                       ▼
   CreateOrderForm        Toast component
   OrdersList             (auto-dismisses, calls onClose)
       (both call showToast on success/error)
```

Each polling component owns its **own** state via `usePolling`:

```
HealthPanel.HealthIndicator → { data, error, loading, responseTime }
OrdersList                  → { data, error, loading }
AlertsFeed                  → { data, error, loading }
```

## 4. usePolling lifecycle

```
Component mounts
      │
      ▼
useEffect runs ──► fetchData() ──► fetch(url)
      │                                │
      │                                ▼
      │                       setData / setError
      │                                │
      │                                ▼
      │                       component re-renders
      │
      └──► setInterval(fetchData, intervalMs)
                    │
                    ▼  every N ms
              fetchData() again ──► ... (loop)

Component unmounts
      │
      ▼
cleanup ──► clearInterval()    ← prevents memory leaks
```

## 5. Data flow per user action

### Page load
```
Browser → index.js → <App/> renders
                       │
                       ├─ HealthPanel mounts  → polls every 10s
                       ├─ OrdersList mounts   → polls every 5s
                       └─ AlertsFeed mounts   → polls every 5s
```

### Creating an order
```
User types + clicks "Create"
        │
        ▼
CreateOrderForm.handleSubmit()
        │
        ▼ fetch POST /api/orders/orders
nginx (prod) or setupProxy (dev)
        │
        ▼
order-api (Express, port 3000) ──► POSTs alert to alerting-service
        │
        ▼ 201 Created
CreateOrderForm.onSuccess("Order created")
        │
        ▼ showToast(msg, 'success')
App.setToast({...}) → <Toast/> appears
        │
        ▼ (~5s later)
OrdersList polling tick → new order shows up
AlertsFeed polling tick → new alert shows up
```

### Deleting an order
```
User clicks Delete in OrdersList
        │
        ▼ DELETE /api/orders/orders/:id
order-api removes order, POSTs alert
        │
        ▼
OrdersList.onSuccess("Order deleted")
        │
        ▼ next 5s tick → row disappears, alert appears
```

## 6. Network layer

```
┌──────────────── Browser ────────────────┐
│  React app fetches relative paths       │
│  e.g. fetch('/api/orders/orders')       │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   dev mode               prod mode
   (npm start)            (Docker / k8s)
        │                     │
        ▼                     ▼
  setupProxy.js          nginx.conf.template
  (http-proxy-middleware) (envsubst at startup
   reads localhost env)    writes proxy_pass)
        │                     │
        ▼                     ▼
   /api/orders/*  →  order-api  (Service: order-api:3000)
   /api/alerts/*  →  alerting-service (Service: alerting-service:3001)
```

## 7. Runtime env injection (the `window._env_` trick)

```
CRA build time:          docker run / k8s start:
─────────────────        ─────────────────────────
npm run build            docker-entrypoint.sh
   │                          │
   │ bakes static JS          │ reads $REACT_APP_* env vars
   │                          │
   ▼                          ▼
build/                  writes /usr/share/nginx/html/env-config.js:
                          window._env_ = { REACT_APP_ENVIRONMENT: "dev" }
                              │
                              ▼
                        index.html loads env-config.js BEFORE bundle.js
                              │
                              ▼
                        config.js reads window._env_.REACT_APP_ENVIRONMENT
                              │
                              ▼
                        EnvironmentBanner shows "DEV" with right color
```

This is why the **same image** can run in dev and staging — the env is read at container start, not at build time.

## 8. Putting it all together

```
┌────────────────────────────────────────────────────────┐
│                       BROWSER                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ <App/>                                           │  │
│  │  EnvironmentBanner | HealthPanel                 │  │
│  │  ┌───────────────────┬─────────────────────────┐ │  │
│  │  │ CreateOrderForm   │                         │ │  │
│  │  │ OrdersList ⟲ 5s   │  AlertsFeed ⟲ 5s        │ │  │
│  │  └───────────────────┴─────────────────────────┘ │  │
│  │  Toast (conditional)                             │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │ fetch /api/*
                            ▼
                ┌───────────────────────┐
                │ nginx (in container)  │
                │  or webpack-dev-proxy │
                └─────┬───────────┬─────┘
                      │           │
              /api/orders/    /api/alerts/
                      │           │
                      ▼           ▼
              ┌──────────┐  ┌────────────────┐
              │ order-api│─►│ alerting-service│
              │  :3000   │  │     :3001       │
              └──────────┘  └────────────────┘
```

**Legend:** `⟲ Ns` = polled every N seconds via `usePolling`.
