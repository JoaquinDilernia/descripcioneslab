/**
 * tagEngine.js - Motor de generación de tags para productos.
 *
 * Genera tags combinando:
 * - SKU del producto (de las variantes)
 * - Palabras clave del nombre
 * - Categoría
 * - Palabras clave de la descripción (materiales, medidas, estilos, etc.)
 */

const STOP_WORDS = new Set([
  'de', 'del', 'la', 'el', 'las', 'los', 'un', 'una', 'unos', 'unas',
  'en', 'con', 'por', 'para', 'su', 'sus', 'al', 'y', 'o', 'a',
  'que', 'es', 'se', 'no', 'lo', 'como', 'mas', 'pero', 'este', 'esta',
  'cm', 'kg', 'mm', 'gr', 'ml', 'lt',
]);

function gs(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.es || v.pt || v.en || Object.values(v)[0] || '';
  return String(v);
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function normalize(text) {
  return text.toLowerCase().trim();
}

function extractSkus(product) {
  const skus = [];
  if (product.variants && Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v.sku && v.sku.trim()) {
        skus.push(v.sku.trim());
      }
    }
  }
  return skus;
}

function extractNameKeywords(product) {
  const name = normalize(gs(product.name));
  if (!name) return [];

  return name
    .split(/[\s\-–—\/]+/)
    .map(w => w.replace(/[^a-záéíóúüñ0-9]/g, ''))
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function extractCategoryNames(product) {
  const cats = [];
  if (product.categories && Array.isArray(product.categories)) {
    for (const cat of product.categories) {
      const name = gs(cat.name);
      if (!name) continue;
      const n = normalize(name);
      // Filtrar categorias genéricas de prueba
      if (/^(categoria\d*|sub\d*|test|prueba)$/i.test(n)) continue;
      cats.push(n);
    }
  }
  return cats;
}

function extractDescriptionKeywords(product) {
  const desc = stripHtml(gs(product.description));
  if (!desc) return [];

  const keywords = [];

  // Buscar material (limitar a una sola palabra/frase corta)
  const materialMatch = desc.match(/material[es]*[:\s]+([a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]{2,20})/i);
  if (materialMatch) {
    const mat = materialMatch[1].trim().toLowerCase();
    if (mat && mat.length < 20 && !/aclaracion|recomien/i.test(mat)) {
      keywords.push(mat);
    }
  }

  // Buscar color en el nombre o descripcion
  const colorPatterns = /\b(negro|blanco|gris|rojo|azul|verde|amarillo|rosa|celeste|marr[oó]n|beige|crema|natural|vino|greige|mocha|tiza)\b/gi;
  const colors = new Set();
  let colorMatch;
  const nameAndDesc = gs(product.name) + ' ' + desc;
  while ((colorMatch = colorPatterns.exec(nameAndDesc)) !== null) {
    colors.add(normalize(colorMatch[1]));
  }
  keywords.push(...colors);

  // Buscar tipo de producto comun
  const typePatterns = /\b(mesa|silla|banco|escritorio|estante|repisa|rack|mueble|cama|sofa|sillon|biblioteca|modular|cajonera|comoda|aparador|vitrina|baul|perchero)\b/gi;
  const types = new Set();
  let typeMatch;
  while ((typeMatch = typePatterns.exec(nameAndDesc)) !== null) {
    types.add(normalize(typeMatch[1]));
  }
  keywords.push(...types);

  // Buscar estilo
  const stylePatterns = /\b(moderno|minimalista|contempor[aá]neo|cl[aá]sico|industrial|escandinavo|r[uú]stico|vintage|nórdico|nordico)\b/gi;
  const styles = new Set();
  let styleMatch;
  while ((styleMatch = stylePatterns.exec(nameAndDesc)) !== null) {
    styles.add(normalize(styleMatch[1]));
  }
  keywords.push(...styles);

  return keywords;
}

/**
 * Genera tags para un producto de forma algorítmica.
 * Retorna objeto con tags actuales, sugeridos, y si cambió.
 */
function generateTags(product) {
  const currentTags = gs(product.tags);
  const currentTagsList = currentTags
    ? currentTags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const suggested = new Set();

  // 1. SKUs
  const skus = extractSkus(product);
  for (const sku of skus) {
    suggested.add(sku);
  }

  // 2. Keywords del nombre (completo como frase y palabras sueltas importantes)
  const nameKeywords = extractNameKeywords(product);
  for (const kw of nameKeywords) {
    suggested.add(kw);
  }

  // 3. Nombre completo del producto (sin colores) como tag de frase
  const fullName = normalize(gs(product.name));
  if (fullName && fullName.length < 50) {
    suggested.add(fullName);
  }

  // 4. Categorias
  const categories = extractCategoryNames(product);
  for (const cat of categories) {
    suggested.add(cat);
  }

  // 5. Keywords de descripcion (materiales, colores, tipos, estilos)
  const descKeywords = extractDescriptionKeywords(product);
  for (const kw of descKeywords) {
    suggested.add(kw);
  }

  // Combinar: mantener tags actuales que no esten duplicados + agregar nuevos
  const finalTags = new Set();

  // Primero los actuales
  for (const tag of currentTagsList) {
    finalTags.add(tag.toLowerCase());
  }

  // Luego los sugeridos que no esten ya
  for (const tag of suggested) {
    if (tag && tag.length > 1) {
      finalTags.add(tag);
    }
  }

  const suggestedList = [...finalTags];
  const changed = suggestedList.length !== currentTagsList.length ||
    suggestedList.some(t => !currentTagsList.map(c => c.toLowerCase()).includes(t));

  return {
    current: currentTags,
    current_count: currentTagsList.length,
    suggested: suggestedList.join(', '),
    suggested_count: suggestedList.length,
    added: suggestedList.filter(t => !currentTagsList.map(c => c.toLowerCase()).includes(t)),
    skus,
    changed,
  };
}

module.exports = {
  generateTags,
};
