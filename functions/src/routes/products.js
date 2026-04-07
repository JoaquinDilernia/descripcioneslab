const express = require('express');
const { tnGet, tnPut } = require('../services/tiendanube.js');
const { getStoredToken } = require('../services/tokenStore.js');
const { analyzeProduct, analyzeStats } = require('../services/analyzer.js');
const { generatePreview, generatePreviewWithAI } = require('../services/structureEngine.js');
const { createBackup, listBackups, getBackup } = require('../services/backupStore.js');
const { generateSeo } = require('../services/seoEngine.js');
const { isConfigured: aiConfigured, generateSeoWithAI, callOpenAI } = require('../services/openai.js');
const { saveDefaultStructure, getDefaultStructure } = require('../services/structureStore.js');
const { generateTags } = require('../services/tagEngine.js');
const { generateAltForProduct, analyzeAltStatus } = require('../services/altEngine.js');

const router = express.Router();

/**
 * Middleware: verifica que haya un token activo.
 */
async function requireAuth(req, res, next) {
  const token = await getStoredToken();
  if (!token || !token.active) {
    return res.status(401).json({ error: 'No hay tienda conectada' });
  }
  req.store = token;
  next();
}

router.use(requireAuth);

/**
 * Trae TODOS los productos de TN paginando automáticamente.
 */
async function fetchAllProducts(storeId, accessToken) {
  const allProducts = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const products = await tnGet(
      storeId,
      accessToken,
      `/products?page=${page}&per_page=${perPage}&fields=id,name,handle,description,seo_title,seo_description,tags,categories`
    );

    if (!products || products.length === 0) break;
    allProducts.push(...products);

    // Si trajo menos de perPage, es la última página
    if (products.length < perPage) break;
    page++;
  }

  return allProducts;
}

/**
 * Enriquece un producto con su análisis.
 */
function enrichProduct(product) {
  return {
    ...product,
    analysis: analyzeProduct(product),
  };
}

/**
 * GET /api/products/stats
 * Estadísticas globales para el dashboard.
 * Trae TODOS los productos y los analiza.
 */
router.get('/stats', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const products = await fetchAllProducts(store_id, access_token);
    const enriched = products.map(enrichProduct);
    const stats = analyzeStats(enriched);

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products
 * Lista productos paginados con análisis.
 * Query params: page (default 1), per_page (default 30), category_id, q
 */
router.get('/', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const page = req.query.page || 1;
    const perPage = req.query.per_page || 30;

    let path = `/products?page=${page}&per_page=${perPage}&fields=id,name,description,seo_title,seo_description,tags,categories`;

    if (req.query.category_id) path += `&category_id=${req.query.category_id}`;
    if (req.query.q) path += `&q=${encodeURIComponent(req.query.q)}`;

    const products = await tnGet(store_id, access_token, path);
    const enriched = products.map(enrichProduct);

    res.json({ success: true, products: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/:id
 * Producto individual con análisis.
 */
router.get('/:id', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const product = await tnGet(store_id, access_token, `/products/${req.params.id}`);
    const enriched = enrichProduct(product);

    res.json({ success: true, product: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/categories
 * Categorías de la tienda.
 */
router.get('/categories/list', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const categories = await tnGet(store_id, access_token, '/categories');

    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/preview
 * Genera preview de cómo quedarían las descripciones con la estructura definida.
 * Body: { sections: [...], product_ids: [] (opcional), use_ai: false }
 */
router.post('/preview', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const { sections, product_ids, use_ai, font } = req.body;

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requieren secciones' });
    }

    let products;
    if (product_ids && product_ids.length > 0) {
      products = await Promise.all(
        product_ids.map((id) =>
          tnGet(store_id, access_token, `/products/${id}`)
        )
      );
    } else {
      products = await tnGet(
        store_id,
        access_token,
        '/products?per_page=5&fields=id,name,description,seo_title,seo_description,tags,categories'
      );
    }

    const previews = [];
    for (const product of products) {
      let generated;
      if (use_ai && aiConfigured()) {
        generated = await generatePreviewWithAI(product, sections, font || '');
      } else {
        generated = generatePreview(product, sections, font || '');
      }
      previews.push({
        id: product.id,
        name: product.name,
        original: product.description,
        generated,
        analysis_before: analyzeProduct(product),
      });
    }

    res.json({ success: true, previews, ai_used: use_ai && aiConfigured() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/apply
 * Aplica la estructura a los productos en Tienda Nube.
 * Body: { sections: [...], scope: "all" | "category" | "selection", category_id?, product_ids? [], use_ai? }
 */
router.post('/apply', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const { sections, scope, category_id, product_ids, use_ai, font } = req.body;

    if (!sections || sections.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requieren secciones' });
    }

    // 1. Obtener productos según el alcance
    let products;
    if (scope === 'selection' && product_ids && product_ids.length > 0) {
      products = await Promise.all(
        product_ids.map((id) => tnGet(store_id, access_token, `/products/${id}`))
      );
    } else if (scope === 'category' && category_id) {
      products = await fetchAllProducts(store_id, access_token);
      products = products.filter(
        (p) => p.categories && p.categories.some((c) => c.id === Number(category_id))
      );
    } else {
      // scope === 'all'
      products = await fetchAllProducts(store_id, access_token);
    }

    if (products.length === 0) {
      return res.json({ success: true, applied: 0, backup_id: null });
    }

    // 2. Crear backup antes de aplicar
    const backup = await createBackup(products);

    // 3. Aplicar estructura a cada producto
    const results = { applied: 0, errors: [] };

    for (const product of products) {
      try {
        let newDesc;
        if (use_ai && aiConfigured()) {
          newDesc = await generatePreviewWithAI(product, sections, font || '');
        } else {
          newDesc = generatePreview(product, sections, font || '');
        }
        await tnPut(store_id, access_token, `/products/${product.id}`, {
          description: newDesc,
        });
        results.applied++;
      } catch (err) {
        results.errors.push({ id: product.id, error: err.message });
      }
    }

    res.json({
      success: true,
      applied: results.applied,
      errors: results.errors,
      backup_id: backup.id,
      backup_expires: backup.expires_at,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/backups
 * Lista backups disponibles (no expirados).
 */
router.get('/backups/list', async (req, res) => {
  try {
    const backups = await listBackups();
    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/backups/:id/rollback
 * Restaura las descripciones originales desde un backup.
 */
router.post('/backups/:id/rollback', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const backup = await getBackup(req.params.id);

    if (!backup) {
      return res.status(404).json({ success: false, error: 'Backup no encontrado o expirado' });
    }

    const productIds = Object.keys(backup.products);
    const results = { restored: 0, errors: [] };

    for (const productId of productIds) {
      try {
        const original = backup.products[productId];
        await tnPut(store_id, access_token, `/products/${productId}`, {
          description: original.description,
        });
        results.restored++;
      } catch (err) {
        results.errors.push({ id: productId, error: err.message });
      }
    }

    res.json({
      success: true,
      restored: results.restored,
      errors: results.errors,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/seo/status
 * Indica si OpenAI está configurado para mejora con IA.
 */
router.get('/seo/status', (req, res) => {
  res.json({ success: true, ai_available: aiConfigured() });
});

/**
 * POST /api/products/seo/preview
 * Preview de mejoras SEO para un conjunto de productos.
 * Body: { product_ids: [], use_ai: false, scan_all: false }
 * Si scan_all=true trae todos. Si product_ids vacío trae los primeros 10.
 */
router.post('/seo/preview', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const { product_ids, use_ai, scan_all } = req.body;

    let products;
    if (product_ids && product_ids.length > 0) {
      products = await Promise.all(
        product_ids.map((id) =>
          tnGet(store_id, access_token, `/products/${id}`)
        )
      );
    } else if (scan_all) {
      products = await fetchAllProducts(store_id, access_token);
    } else {
      products = await tnGet(
        store_id,
        access_token,
        '/products?per_page=10&fields=id,name,handle,description,seo_title,seo_description,tags,categories'
      );
    }

    const previews = [];
    for (const product of products) {
      const algorithmic = generateSeo(product);

      let ai = null;
      if (use_ai && aiConfigured()) {
        try {
          const gs = (v) => {
            if (!v) return '';
            if (typeof v === 'string') return v;
            if (typeof v === 'object') return v.es || v.pt || Object.values(v)[0] || '';
            return String(v);
          };

          ai = await generateSeoWithAI(
            gs(product.name),
            gs(product.description),
            gs(product.tags),
            gs(product.seo_title),
            gs(product.seo_description)
          );
        } catch (err) {
          ai = { error: err.message };
        }
      }

      previews.push({
        id: product.id,
        name: product.name,
        seo: algorithmic,
        ai_seo: ai,
      });
    }

    res.json({ success: true, previews, ai_available: aiConfigured() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/seo/apply
 * Aplica mejoras SEO a los productos en Tienda Nube.
 * Body: { changes: [{ id, handle?, seo_title?, seo_description? }] }
 */
router.post('/seo/apply', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const { changes } = req.body;

    if (!changes || changes.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay cambios para aplicar' });
    }

    // Crear backup de los productos antes de aplicar
    const productIds = changes.map((c) => c.id);
    const products = await Promise.all(
      productIds.map((id) => tnGet(store_id, access_token, `/products/${id}`))
    );
    const backup = await createBackup(products);

    const results = { applied: 0, errors: [] };

    for (const change of changes) {
      try {
        const updateData = {};
        if (change.seo_title) updateData.seo_title = { es: change.seo_title };
        if (change.seo_description) updateData.seo_description = { es: change.seo_description };
        if (change.handle) updateData.handle = { es: change.handle };

        if (Object.keys(updateData).length > 0) {
          await tnPut(store_id, access_token, `/products/${change.id}`, updateData);
          results.applied++;
        }
      } catch (err) {
        results.errors.push({ id: change.id, error: err.message });
      }
    }

    res.json({
      success: true,
      applied: results.applied,
      errors: results.errors,
      backup_id: backup.id,
      backup_expires: backup.expires_at,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/structure/detect
 * Analiza los productos de la tienda y detecta las secciones más comunes.
 * Usa IA para entender cualquier formato de descripción (HTML, texto plano, mixto).
 * Retorna las secciones ordenadas por frecuencia.
 */
router.post('/structure/detect', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const products = await fetchAllProducts(store_id, access_token);

    const gs = (v) => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'object') return v.es || v.pt || v.en || Object.values(v)[0] || '';
      return String(v);
    };

    const stripHtml = (html) => {
      if (!html) return '';
      return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Recopilar descripciones con contenido
    const descriptionsForAI = [];
    for (const product of products) {
      const desc = gs(product.description);
      if (!desc || stripHtml(desc).length < 20) continue;
      descriptionsForAI.push({
        name: gs(product.name),
        description: desc,
      });
    }

    const totalProducts = products.length;
    const productsWithContent = descriptionsForAI.length;

    if (productsWithContent === 0) {
      return res.json({
        success: true,
        total_products: totalProducts,
        products_with_structure: 0,
        detected: [],
      });
    }

    // Si hay IA disponible, usar IA para detectar secciones
    if (aiConfigured()) {
      // Tomar una muestra representativa (hasta 15 productos)
      const sampleSize = Math.min(15, descriptionsForAI.length);
      const step = Math.max(1, Math.floor(descriptionsForAI.length / sampleSize));
      const sample = [];
      for (let i = 0; i < descriptionsForAI.length && sample.length < sampleSize; i += step) {
        sample.push(descriptionsForAI[i]);
      }

      const systemPrompt = `Sos un analista de contenido de ecommerce. Tu trabajo es analizar descripciones de productos de una tienda online e identificar las SECCIONES o BLOQUES DE CONTENIDO que se repiten entre los productos.

IMPORTANTE:
- Las secciones pueden estar marcadas con HTML (h2, h3, strong, etc.) o pueden ser TEXTO PLANO con un titulo seguido de contenido
- Ejemplos de secciones implicitas: "Medidas y especificaciones", "Aclaraciones", "Modo de uso", "Materiales", "Contenido del pack", etc.
- Busca patrones: titulos seguidos de contenido, listas de caracteristicas, tablas de medidas, etc.
- NO incluyas el nombre del producto como seccion
- Agrupa secciones similares bajo un mismo nombre (ej: "Medidas", "Dimensiones", "Medidas y especificaciones" => "Medidas y especificaciones")

Responde SOLO en JSON con este formato exacto:
[
  {"label": "Nombre de la seccion", "count": N, "required": true/false},
  ...
]

Donde:
- "label" es el nombre mas descriptivo y claro para esa seccion
- "count" es en cuantas descripciones de la muestra aparece esa seccion
- "required" es true si aparece en mas de la mitad de las descripciones

Ordena de mayor a menor frecuencia. Sin markdown, sin backticks, sin explicaciones.`;

      const descriptionsText = sample.map((d, i) =>
        `--- Producto ${i + 1}: ${d.name} ---\n${stripHtml(d.description)}`
      ).join('\n\n');

      const userPrompt = `Analiza estas ${sample.length} descripciones de productos y detecta las secciones comunes:

${descriptionsText}

Identifica TODAS las secciones o bloques de contenido que se repiten. Recorda que pueden ser titulos explicitos (HTML) o implicitos (texto plano con un titulo seguido de contenido).`;

      try {
        const result = await callOpenAI(systemPrompt, userPrompt, 1000);
        if (result) {
          const cleaned = result.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
          const aiSections = JSON.parse(cleaned);

          if (Array.isArray(aiSections) && aiSections.length > 0) {
            const detected = aiSections.map((s) => ({
              key: s.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_áéíóúñ]/g, '').substring(0, 30),
              label: s.label,
              count: Math.round((s.count / sample.length) * productsWithContent),
              percentage: Math.round((s.count / sample.length) * 100),
              required: s.required || false,
              type: 'section',
            }));

            return res.json({
              success: true,
              total_products: totalProducts,
              products_with_structure: productsWithContent,
              detected,
              ai_used: true,
            });
          }
        }
      } catch (aiErr) {
        console.error('Error en IA para deteccion de estructura:', aiErr.message);
        // Fallback: continuar con deteccion mecanica
      }
    }

    // Fallback mecanico (sin IA o si falla)
    const headingCounts = {};
    let productsWithStructure = 0;

    for (const { description } of descriptionsForAI) {
      const found = new Set();

      // 1. Buscar headings HTML (h1-h6, strong, b)
      const headingRegex = /<(h[1-6])[^>]*>(.*?)<\/\1>|<(strong|b)>(.*?)<\/\3>/gi;
      let match;
      while ((match = headingRegex.exec(description)) !== null) {
        const text = (match[2] || match[4] || '').replace(/<[^>]*>/g, '').trim();
        if (text && text.length > 2 && text.length < 60) {
          found.add(text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
        }
      }

      // 2. Buscar patrones "Etiqueta: contenido" en <li> SOLO si NO estan dentro de una seccion con heading
      //    (si hay headings, los li con "label: valor" son datos, no secciones)
      if (found.size === 0) {
        const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
        while ((match = liRegex.exec(description)) !== null) {
          const liText = (match[1] || '').replace(/<[^>]*>/g, '').trim();
          const colonIdx = liText.indexOf(':');
          if (colonIdx > 1 && colonIdx < 40) {
            const label = liText.substring(0, colonIdx).trim();
            if (label.length > 2 && label.length < 40 && !/^\d/.test(label)) {
              found.add(label.charAt(0).toUpperCase() + label.slice(1).toLowerCase());
            }
          }
        }
      } else {
        // Si ya hay headings, solo promover li labels que parezcan secciones de alto nivel
        // (como "Aclaraciones", "Material") y no datos puntuales (como "Altura", "Peso")
        const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
        const highLevelLabels = /^(aclaraciones|material(es)?|garant[ií]a|env[ií]os?|cuidados|instrucciones|modo de uso|contenido|incluye|composici[oó]n|informaci[oó]n|talles|colores|beneficios|detalles|ficha t[eé]cnica|importante|nota)/i;
        while ((match = liRegex.exec(description)) !== null) {
          const liText = (match[1] || '').replace(/<[^>]*>/g, '').trim();
          const colonIdx = liText.indexOf(':');
          if (colonIdx > 1 && colonIdx < 40) {
            const label = liText.substring(0, colonIdx).trim();
            if (label.length > 2 && highLevelLabels.test(label)) {
              found.add(label.charAt(0).toUpperCase() + label.slice(1).toLowerCase());
            }
          }
        }
      }

      // 3. Buscar patrones de texto plano: linea con titulo seguido de contenido
      const plainText = stripHtml(description);
      const linePatterns = plainText.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
      for (const line of linePatterns) {
        if (line.length < 50 && (line.endsWith(':') || /^(descripci[oó]n|caracter[ií]sticas|especificaciones|medidas|materiales|composici[oó]n|env[ií]os|garant[ií]a|aclaraciones|cuidados|instrucciones|modo de uso|contenido|incluye|dimensiones|informaci[oó]n|talles|colores|beneficios|uso|detalles|ficha t[eé]cnica)/i.test(line))) {
          const clean = line.replace(/:$/, '').trim();
          if (clean.length > 2) {
            found.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
          }
        }
      }

      if (found.size > 0) {
        productsWithStructure++;
        for (const heading of found) {
          headingCounts[heading] = (headingCounts[heading] || 0) + 1;
        }
      }
    }

    const threshold = Math.max(1, Math.floor(productsWithStructure * 0.2));
    const detected = Object.entries(headingCounts)
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        key: label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        label,
        count,
        percentage: Math.round((count / products.length) * 100),
        required: count >= products.length * 0.5,
        type: 'section',
      }));

    res.json({
      success: true,
      total_products: totalProducts,
      products_with_structure: productsWithStructure,
      detected,
      ai_used: false,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/structure/default
 * Obtiene la estructura predeterminada guardada.
 */
router.get('/structure/default', async (req, res) => {
  const data = await getDefaultStructure();
  res.json({ success: true, structure: data });
});

/**
 * POST /api/products/structure/default
 * Guarda la estructura predeterminada.
 * Body: { sections: [...] }
 */
router.post('/structure/default', async (req, res) => {
  const { sections, font } = req.body;
  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({ success: false, error: 'Se requieren secciones' });
  }
  const data = await saveDefaultStructure(sections, font || '');
  res.json({ success: true, structure: data });
});

// ==================== TAGS ====================

/**
 * Trae TODOS los productos incluyendo variantes (para SKU).
 */
async function fetchAllProductsWithVariants(storeId, accessToken) {
  const allProducts = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const products = await tnGet(
      storeId,
      accessToken,
      `/products?page=${page}&per_page=${perPage}&fields=id,name,handle,description,tags,categories,variants`
    );

    if (!products || products.length === 0) break;
    allProducts.push(...products);
    if (products.length < perPage) break;
    page++;
  }

  return allProducts;
}

/**
 * Trae TODOS los productos con imágenes.
 */
async function fetchAllProductsWithImages(storeId, accessToken) {
  const allProducts = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const products = await tnGet(
      storeId,
      accessToken,
      `/products?page=${page}&per_page=${perPage}&fields=id,name,description,categories,images`
    );

    if (!products || products.length === 0) break;
    allProducts.push(...products);
    if (products.length < perPage) break;
    page++;
  }

  return allProducts;
}

/**
 * POST /api/products/tags/preview
 * Preview de tags generados para los productos.
 * Body: { scan_all: false }
 */
router.post('/tags/preview', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const { scan_all } = req.body;

    let products;
    if (scan_all) {
      products = await fetchAllProductsWithVariants(store_id, access_token);
    } else {
      products = await tnGet(
        store_id,
        access_token,
        '/products?per_page=10&fields=id,name,handle,description,tags,categories,variants'
      );
    }

    const previews = [];
    for (const product of products) {
      const tagResult = generateTags(product);
      previews.push({
        id: product.id,
        name: product.name,
        ...tagResult,
      });
    }

    const withChanges = previews.filter(p => p.changed).length;

    res.json({
      success: true,
      previews,
      total: previews.length,
      with_changes: withChanges,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/tags/apply
 * Aplica los tags generados a los productos en Tienda Nube.
 * Body: { changes: [{ id, tags }] }
 */
router.post('/tags/apply', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const { changes } = req.body;

    if (!changes || changes.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay cambios para aplicar' });
    }

    const results = { applied: 0, errors: [] };

    for (const change of changes) {
      try {
        await tnPut(store_id, access_token, `/products/${change.id}`, {
          tags: change.tags,
        });
        results.applied++;
      } catch (err) {
        results.errors.push({ id: change.id, error: err.message });
      }
    }

    res.json({
      success: true,
      applied: results.applied,
      errors: results.errors,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/alt/preview
 * Preview de ALT text generado para imágenes.
 * Body: { scan_all: false }
 */
router.post('/alt/preview', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const { scan_all } = req.body;

    let products;
    if (scan_all) {
      products = await fetchAllProductsWithImages(store_id, access_token);
    } else {
      products = await tnGet(
        store_id,
        access_token,
        '/products?per_page=10&fields=id,name,description,categories,images'
      );
    }

    const previews = [];
    for (const product of products) {
      const altStatus = analyzeAltStatus(product);
      previews.push({
        id: product.id,
        name: product.name,
        ...altStatus,
      });
    }

    const withoutAlt = previews.filter(p => p.without_alt > 0).length;

    res.json({
      success: true,
      previews,
      total: previews.length,
      products_needing_alt: withoutAlt,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/alt/apply
 * Aplica ALT text generado a las imágenes en Tienda Nube.
 * Body: { product_ids: [] (opcional si false aplica a todos) }
 */
router.post('/alt/apply', async (req, res) => {
  try {
    const { store_id, access_token } = req.store;
    const { product_ids } = req.body;

    let products;
    if (product_ids && product_ids.length > 0) {
      products = await Promise.all(
        product_ids.map((id) =>
          tnGet(store_id, access_token, `/products/${id}`)
        )
      );
    } else {
      products = await fetchAllProductsWithImages(store_id, access_token);
    }

    const results = { applied: 0, errors: [], skipped: 0 };

    for (const product of products) {
      try {
        const images = product.images || [];
        if (images.length === 0) {
          results.skipped++;
          continue;
        }

        // Verificar que el producto tenga datos requeridos
        if (!product.id) {
          throw new Error('Producto sin ID');
        }

        const alts = generateAltForProduct(product);

        if (!alts || alts.length === 0) {
          throw new Error('No se pudo generar ALT para las imágenes');
        }

        // Actualizar cada imagen individualmente via PUT /products/{id}/images/{image_id}
        let updatedCount = 0;
        for (let idx = 0; idx < images.length; idx++) {
          const img = images[idx];
          if (!img || !img.id) continue;

          try {
            await tnPut(store_id, access_token, `/products/${product.id}/images/${img.id}`, {
              id: img.id,
              src: img.src,
              position: img.position,
              product_id: product.id,
              alt: alts[idx] || '',
            });
            updatedCount++;
          } catch (imgErr) {
            console.error(`[ALT] Error imagen ${img.id} de producto ${product.id}:`, imgErr.message);
            throw new Error(`Imagen ${idx + 1}: ${imgErr.message}`);
          }
        }

        if (updatedCount > 0) {
          console.log(`[ALT] Producto ${product.id}: ${updatedCount} imágenes actualizadas`);
          results.applied++;
        } else {
          results.skipped++;
        }
      } catch (err) {
        console.error(`[ALT] Error en producto ${product?.id}:`, err.message);
        results.errors.push({
          id: product?.id || 'unknown',
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      applied: results.applied,
      skipped: results.skipped,
      errors: results.errors,
    });
  } catch (err) {
    console.error('[ALT] Error en endpoint apply:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
