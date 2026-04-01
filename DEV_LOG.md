# DEV_LOG - DescripcionesLab

## 2026-03-10 — Fase 1: Arquitectura y estructura base

### Qué se implementó
- Definición de arquitectura del proyecto (monorepo client/server)
- Creación de `PROJECT_CONTEXT.md` con documentación completa
- Creación de `DEV_LOG.md`

### Archivos creados
- `PROJECT_CONTEXT.md`
- `DEV_LOG.md`

### Decisiones técnicas
- Stack definido: React + Vite (JSX/CSS) / Node.js + Express / Firebase Firestore
- Flujo OAuth de Tienda Nube verificado contra documentación oficial
- Redirect URL inicial apunta a partners.tiendanube.com para obtener el code manualmente
- El backend manejará el intercambio code → token
- App ID: 27465, credenciales en .env

---

## 2026-03-10 — Fase 1: Integración OAuth con Tienda Nube (completa)

### Qué se implementó

**Backend (server/)**
- Express server con CORS configurado
- Ruta POST `/auth/exchange` — intercambia code de OAuth por access_token
- Ruta POST `/auth/token` — permite ingresar token manualmente
- Ruta GET `/auth/status` — consulta estado de conexión
- Servicio `tiendanube.js` — funciones para interactuar con la API de TN (`tnGet`, `tnPut`)
- Servicio `tokenStore.js` — persistencia de token en JSON (Fase 1)
- Configuración de entorno con las credenciales de la app (App ID: 27465)

**Frontend (client/)**
- React + Vite configurado con JSX + CSS
- Firebase inicializado (Firestore listo para usar)
- Página de Auth con 3 tabs:
  - **Usar code**: pega el code de OAuth → el backend lo intercambia por token
  - **Token manual**: ingresa access_token + store_id directamente
  - **Ver cURL**: muestra el cURL de referencia con las credenciales
- Indicador de estado de conexión (conectado/desconectado)
- Servicio `api.js` para comunicación con el backend

### Archivos creados
- `server/package.json`, `server/.env`, `server/.env.example`
- `server/src/app.js`
- `server/src/config/env.js`
- `server/src/routes/auth.js`
- `server/src/services/tiendanube.js`
- `server/src/services/tokenStore.js`
- `client/package.json`, `client/.env`, `client/.env.example`
- `client/index.html`, `client/vite.config.js`
- `client/src/main.jsx`, `client/src/App.jsx`, `client/src/App.css`
- `client/src/config/firebase.js`
- `client/src/services/api.js`
- `client/src/pages/Auth.jsx`, `client/src/pages/Auth.css`
- `.gitignore`

### Decisiones técnicas
- Header `Authentication: bearer` (no `Authorization`) — requisito de Tienda Nube
- Token almacenado en JSON file por ahora, migrable a Firestore
- Server en puerto 3001, client en 5173 (Vite default)
- Dos formas de conectar: intercambio automático de code o ingreso manual de token
- Se verificó que la documentación actual de TN confirma que tokens no expiran

---

## 2026-03-10 — Fase 2: Sync de productos + análisis + dashboard

### Qué se implementó

**Backend**
- Motor de análisis `analyzer.js`: analiza cada producto y genera un quality_score (0-100) basado en 7 criterios (descripción, largo, estructura HTML, SEO title, meta description, tags, categoría)
- Ruta GET `/api/products` — lista productos paginados con análisis enriquecido
- Ruta GET `/api/products/stats` — trae TODOS los productos, los analiza y devuelve estadísticas globales
- Ruta GET `/api/products/:id` — producto individual con análisis
- Ruta GET `/api/products/categories/list` — categorías de la tienda
- Paginación automática para traer todos los productos de TN (200 por página)
- Middleware `requireAuth` que verifica token activo antes de cada request

**Frontend**
- Componente `Header` con navegación entre páginas y estado de conexión
- Componente `QualityBadge` con colores por nivel (good/regular/poor)
- Página `Dashboard` con:
  - Botón de sincronización manual
  - Score promedio con indicador visual (círculo de color)
  - Grid de stats: total, sin descripción, descripción corta, sin estructura, sin SEO, sin tags
  - Barra de distribución de calidad (bueno/regular/bajo)
- Página `Products` con:
  - Buscador por nombre/tag/SKU
  - Lista de productos con: nombre, preview de descripción, issues detectados, quality_score
  - Paginación
- `App.jsx` con navegación entre Dashboard, Productos y Settings
- `api.js` actualizado con endpoints de productos

**Documentación**
- `PROJECT_CONTEXT.md` reescrito con la visión completa del producto, modelo de datos, fórmula de quality_score, flujos y fases

### Archivos creados
- `server/src/services/analyzer.js`
- `server/src/routes/products.js`
- `client/src/components/Header.jsx`, `Header.css`
- `client/src/components/QualityBadge.jsx`, `QualityBadge.css`
- `client/src/pages/Dashboard.jsx`, `Dashboard.css`
- `client/src/pages/Products.jsx`, `Products.css`

### Archivos modificados
- `server/src/app.js` — registradas rutas de productos
- `client/src/App.jsx` — navegación con Header, páginas dinámicas, check de auth
- `client/src/services/api.js` — nuevos endpoints de productos y stats

### Decisiones técnicas
- Quality score con fórmula fija de 7 criterios / 100 puntos (transparente, sin IA)
- Productos se traen on-demand de TN API, no se cachean en Firestore (TN es fuente de verdad)
- Para stats se paginan todos los productos en el backend (fetchAllProducts)
- Frontend sin router de terceros (navegación por estado simple, suficiente para MVP)
- Build verificado: 0 errores

---

## 2026-03-10 — Fase 3: Paleta de colores + editor de estructura + preview

### Qué se implementó

**Paleta de colores (dark theme)**
- Variables CSS en `:root` (App.css): primary #7C5CFF, accent #00E5FF, bg-main #0B0F1F, bg-card #12172A
- Todos los CSS actualizados: Header, QualityBadge, Dashboard, Products, Auth
- Gradiente en botones principales, logo con gradient text
- Estados: success #22C55E, warning #F59E0B, error #EF4444

**Editor de estructura (Structure.jsx)**
- Secciones por defecto: Descripción corta, Beneficios, Materiales, Guía de talles, Envíos
- Agregar/quitar secciones personalizadas
- Reordenar secciones (mover arriba/abajo)
- Toggle requerida/opcional por sección
- Preview en tiempo real del HTML que se generaría
- Botón "Ver preview con productos" que navega a Preview

**Motor de estructura (structureEngine.js)**
- Genera HTML estructurado con `<h3>` por sección
- La primera sección recibe el contenido original del producto
- Las demás quedan como placeholders editables
- Preparado para integrar IA post-MVP

**Preview (Preview.jsx)**
- Vista comparativa antes/después por producto
- Muestra los primeros 5 productos con la estructura aplicada
- Columna "Actual" (borde rojo) vs "Nuevo" (borde verde)
- Botón para regenerar preview

**Endpoint POST /api/products/preview**
- Recibe `sections` y opcionalmente `product_ids`
- Trae productos de TN API
- Ejecuta el motor de estructura
- Devuelve array de previews con original y generado

### Archivos creados
- `server/src/services/structureEngine.js`
- `client/src/pages/Structure.jsx`, `Structure.css`
- `client/src/pages/Preview.jsx`, `Preview.css`

### Archivos modificados
- `client/src/App.css` — Variables CSS de la paleta
- `client/src/components/Header.css` — Dark theme
- `client/src/components/QualityBadge.css` — Dark theme
- `client/src/pages/Dashboard.css` — Dark theme
- `client/src/pages/Products.css` — Dark theme
- `client/src/pages/Auth.css` — Dark theme
- `client/src/App.jsx` — Nuevas páginas Structure/Preview + estado de secciones
- `client/src/components/Header.jsx` — Nuevos links: Estructura, Preview
- `client/src/services/api.js` — Nuevo endpoint previewStructure
- `server/src/routes/products.js` — Ruta POST /preview

### Decisiones técnicas
- CSS variables para la paleta: un solo lugar para cambiar colores
- Gradiente en botones principales via `var(--primary-gradient)`
- Secciones como estado compartido entre Structure y Preview (via App.jsx)
- structureEngine mapea descripción existente a la primera sección, las demás son placeholder
- Preview trae solo 5 productos por defecto para no sobrecargar
- Build verificado: 0 errores

---

## 2026-03-10 — Fase 4: Aplicación masiva + backup/rollback

### Qué se implementó

**Backend**
- Sistema de backups (`backupStore.js`): crear, listar y obtener backups para rollback
  - Backups almacenados como JSON en `server/data/backups/`
  - Expiración automática a los 30 minutos
  - Limpieza automática de backups expirados al listar
- Endpoint POST `/api/products/apply`: aplica estructura masivamente
  - Soporta 3 alcances: `all`, `category`, `selection`
  - Crea backup automático antes de aplicar
  - Itera producto por producto con manejo de errores individual
  - Devuelve conteo de aplicados, errores y ID de backup
- Endpoint GET `/api/products/backups/list`: lista backups no expirados
- Endpoint POST `/api/products/backups/:id/rollback`: restaura descripciones originales

**Frontend**
- Página **Aplicar** (`Apply.jsx`):
  - Resumen de la estructura que se va a aplicar (chips de secciones)
  - Selector de alcance: todos los productos o por categoría
  - Flujo de confirmación en 2 pasos (seguridad contra clicks accidentales)
  - Resultado con conteo de productos actualizados + info de backup
- Sección de **Backups** en Settings (tab nueva en `Auth.jsx`):
  - Lista de backups disponibles con fecha, cantidad de productos y minutos restantes
  - Botón de rollback por backup con confirmación
  - Mensaje de éxito con cantidad de productos restaurados
- `api.js` actualizado con `applyStructure`, `getBackups`, `rollbackBackup`
- Header actualizado con link "Aplicar"

### Archivos creados
- `server/src/services/backupStore.js`
- `client/src/pages/Apply.jsx`, `Apply.css`

### Archivos modificados
- `server/src/routes/products.js` — Rutas de apply, backups/list, backups/rollback
- `client/src/App.jsx` — Página Apply registrada
- `client/src/components/Header.jsx` — Link "Aplicar" en nav
- `client/src/services/api.js` — Funciones apply y backups
- `client/src/pages/Auth.jsx` — Tab de backups con rollback
- `client/src/pages/Auth.css` — Estilos de backups

### Decisiones técnicas
- Backups en JSON files (server/data/backups/) — consistente con tokenStore, migrable a Firestore
- Expiración de 30 min como dice el spec del producto
- Apply itera secuencialmente (no en paralelo) para no exceder rate limits de TN API
- Confirmación en 2 pasos: primero "Entiendo", después "Aplicar cambios ahora"
- Rollback restaura solo `description` (campo principal del producto)
- Build verificado: 0 errores

---

## 2026-03-10 — Fase 5: SEO + IA (OpenAI)

### Qué se implementó

**Backend — Motor de SEO algorítmico (`seoEngine.js`)**
- `generateHandle(name)`: genera URL slug SEO-friendly (lowercase, sin acentos, sin caracteres especiales)
- `generateMetaTitle(product)`: meta title optimizado (max 60 chars, incluye categoría si cabe)
- `generateMetaDescription(product)`: meta description (120-160 chars, basada en descripción existente o nombre+tags)
- `generateSeo(product)`: devuelve objeto con handle, seo_title, seo_description (cada uno con current/generated/changed)

**Backend — Integración OpenAI (`openai.js`)**
- `callOpenAI(systemPrompt, userPrompt)`: función interna para llamar a la API de chat completions
- `improveDescription(productName, currentDescription, sections)`: mejora descripciones con IA (gpt-4o-mini)
- `generateSeoWithAI(productName, description, tags)`: genera meta title y meta description con IA
- `isConfigured()`: verifica si hay OPENAI_API_KEY configurada
- Modelo: gpt-4o-mini, temperatura 0.7, max 500 tokens
- Si no hay API key configurada, las funciones devuelven null (fallback a algorítmico)

**Backend — Endpoints SEO**
- GET `/api/products/seo/status`: indica si OpenAI está configurado
- POST `/api/products/seo/preview`: escanea productos y genera preview de mejoras SEO
  - Genera sugerencias algorítmicas para todos los productos
  - Si `use_ai: true` y OpenAI configurado, también genera sugerencias con IA
  - Trae 10 productos por defecto o los IDs específicos solicitados
- POST `/api/products/seo/apply`: aplica cambios SEO seleccionados a Tienda Nube
  - Recibe array de cambios con ID + campos a actualizar (handle, seo_title, seo_description)
  - Crea backup automático antes de aplicar
  - Envía updates a TN API como objetos multilingüe `{ es: "..." }`

**Frontend — Página SEO (`Seo.jsx`)**
- Botón "Analizar productos" que escanea los primeros 10 productos
- Toggle "Usar IA" con badge OpenAI (visible solo si AI está configurada)
- Por cada producto, muestra 3 campos: Handle/URL, Meta Title, Meta Description
- Para cada campo: valor actual vs sugerido (algorítmico)
- Si IA habilitada: tercer valor con sugerencia IA
- Botones "Usar sugerido" / "Usar IA" para seleccionar fuente por campo
- Badge "mejorable" / "ok" por campo
- Contador de caracteres con indicador de rango ideal
- Sección de aplicar con conteo de cambios seleccionados
- Resultado con info de backup para rollback

### Archivos creados
- `server/src/services/seoEngine.js`
- `server/src/services/openai.js`
- `client/src/pages/Seo.jsx`, `Seo.css`

### Archivos modificados
- `server/.env` — OPENAI_API_KEY agregada
- `server/src/config/env.js` — Variable openaiKey
- `server/src/routes/products.js` — Imports de seoEngine, openai + 3 rutas SEO + handle en fetchAllProducts
- `client/src/services/api.js` — getSeoStatus, previewSeo, applySeo
- `client/src/App.jsx` — Import y routing de Seo page
- `client/src/components/Header.jsx` — Link "SEO" en navegación
- `PROJECT_CONTEXT.md` — Actualizado con endpoints SEO, archivos nuevos, fases

### Decisiones técnicas
- Dual-source SEO: algorítmico siempre disponible, IA opcional (por si la key no está o se agota el crédito)
- El usuario elige por campo cuál fuente usar (no es todo o nada)
- Handle/URL se puede optimizar de forma masiva (resuelve limitación de TN de cambiar 1x1)
- Los campos SEO se envían a TN como objetos multilingüe `{ es: "..." }` (formato requerido por la API)
- Backup automático antes de aplicar SEO (mismo sistema de backups de Fase 4)
- Build verificado: 0 errores

---
