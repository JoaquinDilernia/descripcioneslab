# DescripcionesLab

## Descripción del proyecto

App SaaS para el ecosistema de Tienda Nube que resuelve un problema común en ecommerce: las descripciones de productos suelen estar desordenadas, sin estructura HTML consistente y sin SEO.

DescripcionesLab permite que un merchant:
- Analice todas sus descripciones de productos
- Detecte estructuras inconsistentes y problemas de SEO
- Aplique una estructura visual estándar de forma masiva
- Mejore contenido con IA (OpenAI gpt-4o-mini)
- Genere SEO automáticamente (meta title, meta description, URL handle)
- Optimice URLs de productos de forma masiva

## Arquitectura general

```
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│   Client (React) │───────▶│  Server (Express) │───────▶│  Tienda Nube API │
│   Vite + JSX     │◀───────│  Node.js          │◀───────│  REST v1         │
└──────────────────┘        └──────────────────┘        └──────────────────┘
        │                          │
        ▼                          ▼
┌──────────────────┐        ┌──────────────────┐
│   Firestore       │        │   Analyzer        │
│   (backups,       │        │   (quality score,  │
│    settings)      │        │    HTML parsing)   │
└──────────────────┘        └──────────────────┘
```

- **Client**: React + Vite (JSX + CSS). Interfaz de usuario.
- **Server**: Express. Proxy de TN API, motor de análisis, lógica de negocio.
- **Firestore**: Backups de descripciones, settings del usuario, templates de estructura.
- **Tienda Nube API**: Fuente de verdad de productos. Se consulta on-demand.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, JSX, CSS modular |
| Backend | Node.js, Express |
| Base de datos | Firebase Firestore (client-side) |
| API externa | Tienda Nube API v1 (REST, OAuth2) |
| IA | OpenAI API (gpt-4o-mini) |
| HTTP Client | fetch nativo (Node 18+) |

## Estructura de carpetas

```
DescripcionesLab/
├── client/
│   ├── src/
│   │   ├── components/            # Componentes reutilizables
│   │   │   ├── Header.jsx/.css
│   │   │   ├── ProductCard.jsx/.css
│   │   │   ├── QualityBadge.jsx/.css
│   │   │   └── StructureEditor.jsx/.css
│   │   ├── pages/                 # Páginas/vistas
│   │   │   ├── Dashboard.jsx/.css
│   │   │   ├── Products.jsx/.css
│   │   │   ├── Structure.jsx/.css
│   │   │   ├── Preview.jsx/.css
│   │   │   ├── Apply.jsx/.css
│   │   │   ├── Seo.jsx/.css
│   │   │   └── Auth.jsx/.css
│   │   ├── services/              # Llamadas al backend
│   │   │   └── api.js
│   │   ├── config/
│   │   │   └── firebase.js
│   │   ├── App.jsx / App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── products.js
│   │   ├── services/
│   │   │   ├── tiendanube.js      # Comunicación con TN API
│   │   │   ├── analyzer.js        # Motor de análisis de descripciones
│   │   │   ├── structureEngine.js # Motor de estructura HTML
│   │   │   ├── seoEngine.js       # Motor de SEO algorítmico
│   │   │   ├── openai.js          # Integración con OpenAI
│   │   │   ├── backupStore.js     # Sistema de backups
│   │   │   └── tokenStore.js      # Persistencia del token
│   │   └── app.js
│   ├── .env / .env.example
│   └── package.json
├── .gitignore
├── PROJECT_CONTEXT.md
└── DEV_LOG.md
```

## Endpoints

### Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/exchange` | Intercambia code OAuth por access_token |
| POST | `/auth/token` | Guarda token manualmente |
| GET | `/auth/status` | Estado de conexión |

### Productos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/products` | Lista productos con análisis (paginado) |
| GET | `/api/products/stats` | Estadísticas globales (dashboard) |
| GET | `/api/products/:id` | Producto individual con análisis |
| GET | `/api/categories` | Categorías de la tienda |
| POST | `/api/products/preview` | Preview de estructura aplicada a productos |
| POST | `/api/products/apply` | Aplicar cambios masivos a TN |
| POST | `/api/backups` | Crear backup antes de aplicar |
| GET | `/api/backups` | Listar backups disponibles |
| POST | `/api/backups/:id/rollback` | Restaurar backup |

### SEO

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/products/seo/status` | Estado de integración con OpenAI |
| POST | `/api/products/seo/preview` | Preview de mejoras SEO (algorítmico + IA) |
| POST | `/api/products/seo/apply` | Aplicar cambios SEO a TN |

## Modelo de datos

### Token (server/data/token.json)

```json
{
  "store_id": "6854698",
  "access_token": "589294750b...",
  "scope": "read_products,write_products",
  "connected_at": "2026-03-10T...",
  "active": true
}
```

### Producto enriquecido (respuesta del backend)

```json
{
  "id": 301576340,
  "name": { "es": "Remera Basic" },
  "description": { "es": "<p>Remera de algodón</p>" },
  "seo_title": "Remera Basic",
  "seo_description": "...",
  "tags": "remera, basica",
  "categories": [{ "id": 123, "name": { "es": "Remeras" } }],
  "analysis": {
    "has_description": true,
    "description_length": 24,
    "is_short": true,
    "has_html_structure": false,
    "has_seo_title": true,
    "has_seo_description": true,
    "quality_score": 35
  }
}
```

### Quality Score (fórmula)

| Criterio | Puntos | Condición |
|---|---|---|
| Tiene descripción | 20 | `description` no vacío |
| Largo adecuado (>100 chars) | 15 | `description_length > 100` |
| Tiene estructura HTML | 20 | Contiene `<h`, `<ul`, `<strong>`, etc. |
| Tiene SEO title | 15 | `seo_title` no vacío |
| Tiene SEO description | 15 | `seo_description` no vacío |
| Tiene tags | 10 | `tags` no vacío |
| Tiene categoría | 5 | `categories.length > 0` |
| **Total** | **100** | |

### Template de estructura (Firestore)

```json
{
  "sections": [
    { "key": "short_desc", "label": "Descripción corta", "required": true },
    { "key": "benefits", "label": "Beneficios", "required": false },
    { "key": "materials", "label": "Materiales", "required": false },
    { "key": "size_guide", "label": "Guía de talles", "required": false },
    { "key": "shipping", "label": "Envíos", "required": false }
  ]
}
```

### Backup (Firestore)

```json
{
  "created_at": "2026-03-10T...",
  "expires_at": "2026-03-10T...",
  "product_count": 150,
  "products": {
    "301576340": {
      "description": { "es": "descripción anterior" },
      "seo_title": "...",
      "seo_description": "..."
    }
  }
}
```

## Flujos clave del sistema

### Flujo 1: Instalación y conexión OAuth (Fase 1 - COMPLETADA)

1. Usuario instala la app desde Tienda Nube
2. TN redirige a partners con un `code`
3. Se ejecuta cURL o se usa la app para intercambiar code por token
4. Token almacenado → integración completa

### Flujo 2: Sync y análisis (Fase 2)

1. Usuario hace click en "Sincronizar"
2. Backend trae TODOS los productos de TN API (con paginación automática)
3. Backend analiza cada producto y genera quality_score
4. Frontend muestra dashboard con estadísticas y lista de productos

### Flujo 3: Unificación de estructura (Fase 3)

1. Usuario define template de estructura (secciones)
2. Selecciona productos (todos / categoría / manual)
3. Backend genera preview: mapea descripción existente a la nueva estructura
4. Usuario revisa el antes/después
5. Confirma → backend crea backup → pushea cambios a TN API

### Flujo 4: Rollback (Fase 4)

1. Usuario detecta problema después de aplicar cambios
2. Va a Settings → Backups
3. Selecciona backup → Rollback
4. Backend restaura descripciones originales via TN API

## Fases de desarrollo

| Fase | Contenido | Estado |
|---|---|---|
| Fase 1 | OAuth + conexión TN | **Completada** |
| Fase 2 | Sync productos + análisis + dashboard | **En progreso** |
| Fase 3 | Editor de estructura + preview | Pendiente |
| Fase 4 | Aplicación masiva + backup/rollback | **Completada** |
| Fase 5 | SEO + IA (OpenAI) | **Completada** |

## Decisiones técnicas

| # | Decisión | Razón |
|---|---|---|
| 1 | Monorepo `client/` + `server/` | Un solo repo, simplicidad |
| 2 | React + Vite (JSX + CSS) | Stack pedido. Rápido, sin TS overhead |
| 3 | Express como backend | Liviano, migrable a Cloud Functions 1:1 |
| 4 | Firestore desde el client | Backups y settings. Sin necesidad de Admin SDK |
| 5 | Productos on-demand desde TN | No se cachean en Firestore. TN es la fuente de verdad |
| 6 | Análisis en el server | El backend enriquece los productos con quality_score |
| 7 | Header `Authentication: bearer` | TN usa `Authentication` (no `Authorization`), `bearer` en minúsculas |
| 8 | Token no expira | Solo se invalida al desinstalar o generar nuevo |
| 9 | Score con fórmula fija | 7 criterios, 100 puntos. Transparente y predecible |

## Credenciales

- **App ID**: `TN_APP_ID` en `server/.env`
- **Client Secret**: `TN_CLIENT_SECRET` en `server/.env`
- **Firebase**: `VITE_FIREBASE_*` en `client/.env`
- **Store ID conectado**: `6854698`
- **NUNCA commitear .env**

## API de Tienda Nube - Referencia

- **Base URL**: `https://api.tiendanube.com/v1/{store_id}/`
- **Auth header**: `Authentication: bearer {token}`
- **Content-Type**: `application/json`
- **User-Agent**: Requerido
- **Descripciones**: Objeto multilingüe con HTML `{ "es": "<p>...</p>" }`
- **Paginación**: `?page=1&per_page=200` (máx 200)
- **Campos producto**: `id, name, description, seo_title, seo_description, tags, categories, variants, images`
