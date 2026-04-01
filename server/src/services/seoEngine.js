/**
 * seoEngine.js - Genera SEO fields algorítmicamente.
 *
 * Genera meta title, meta description y handle (URL slug) optimizados
 * a partir del nombre y descripción existentes del producto.
 */

/**
 * Extrae string de un campo multilingüe.
 */
function getString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.es || value.pt || value.en || Object.values(value)[0] || '';
  return String(value);
}

/**
 * Extrae texto plano de HTML.
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Genera un handle/slug SEO-friendly a partir del nombre del producto.
 */
export function generateHandle(name) {
  const cleaned = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return cleaned || 'producto';
}

/**
 * Genera un meta title optimizado para SEO.
 * Siempre intenta agregar valor: categoría, separador, y formato limpio.
 */
export function generateMetaTitle(product) {
  const name = getString(product.name).trim();
  const category = product.categories && product.categories.length > 0
    ? getString(product.categories[0].name).trim()
    : '';
  const tags = getString(product.tags);
  const firstTag = tags ? tags.split(',').map(t => t.trim()).filter(Boolean)[0] : '';

  if (!name) return '';

  // Construir el mejor título posible
  // Formato ideal: "Nombre Producto - Categoría | Tienda"
  if (category && (name.length + category.length + 3) <= 60) {
    return `${name} - ${category}`;
  }

  // Si no hay categoría pero hay tag, usar tag
  if (!category && firstTag && (name.length + firstTag.length + 3) <= 60) {
    return `${name} - ${firstTag}`;
  }

  // Si el nombre es largo, truncar inteligentemente
  if (name.length > 60) {
    const cut = name.substring(0, 57);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 30 ? cut.substring(0, lastSpace) : cut) + '...';
  }

  return name;
}

/**
 * Genera una meta description optimizada para SEO.
 * Apunta a 120-160 caracteres, con contenido rico y call-to-action.
 */
export function generateMetaDescription(product) {
  const name = getString(product.name).trim();
  const descHtml = getString(product.description);
  const descText = stripHtml(descHtml);
  const tags = getString(product.tags);
  const category = product.categories && product.categories.length > 0
    ? getString(product.categories[0].name).trim()
    : '';

  // Extraer la primera oración útil de la descripción
  let baseSentence = '';
  if (descText && descText.length > 20) {
    // Buscar primera oración que no sea solo el nombre
    const sentences = descText.split(/(?<=[.!?])\s+/).filter(s => s.length > 15);
    if (sentences.length > 0) {
      baseSentence = sentences[0];
      // Si la primera oración es muy corta, agregar la segunda
      if (baseSentence.length < 80 && sentences.length > 1) {
        baseSentence += ' ' + sentences[1];
      }
    } else {
      baseSentence = descText;
    }
  }

  // Construir meta description
  let meta = '';

  if (baseSentence) {
    meta = baseSentence;
  } else {
    // Sin descripción útil, construir desde cero
    meta = name;
    if (category) meta += ` de ${category}`;
  }

  // Agregar tags como keywords si hay espacio
  if (tags && meta.length < 120) {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3);
    if (tagList.length > 0) {
      const tagStr = tagList.join(', ');
      if (meta.length + tagStr.length + 3 <= 155) {
        meta += '. ' + tagStr;
      }
    }
  }

  // Agregar call-to-action si hay espacio
  if (meta.length < 120) {
    const cta = '. Compralo online con envío a todo el país';
    if (meta.length + cta.length <= 160) {
      meta += cta;
    }
  }

  // Truncar si es necesario
  if (meta.length > 160) {
    const cut = meta.substring(0, 155);
    const lastSpace = cut.lastIndexOf(' ');
    meta = (lastSpace > 100 ? cut.substring(0, lastSpace) : cut) + '...';
  }

  // Asegurar que termine con punto si no tiene puntuación
  if (meta && !meta.match(/[.!?…]$/)) {
    meta += '.';
  }

  return meta;
}

/**
 * Evalúa la calidad SEO actual de un producto (0-100).
 */
function evaluateSeoQuality(currentHandle, currentTitle, currentDesc, name) {
  let score = 0;
  const issues = [];

  // Handle
  if (currentHandle) {
    score += 15;
    // Penalizar handles con números random o muy largos
    if (/^\d+$/.test(currentHandle)) {
      issues.push('handle_numeric');
    } else if (currentHandle.length > 80) {
      issues.push('handle_long');
    } else {
      score += 10;
    }
  } else {
    issues.push('handle_missing');
  }

  // Title
  if (currentTitle) {
    score += 15;
    if (currentTitle.length >= 30 && currentTitle.length <= 60) score += 10;
    else issues.push('title_length');
    if (currentTitle !== name) score += 5; // Tiene más que solo el nombre
    else issues.push('title_basic');
  } else {
    issues.push('title_missing');
  }

  // Description
  if (currentDesc) {
    score += 15;
    if (currentDesc.length >= 120 && currentDesc.length <= 160) score += 15;
    else if (currentDesc.length >= 80) score += 8;
    else issues.push('desc_short');
    if (currentDesc.includes(name.split(' ')[0])) score += 5;
    else issues.push('desc_no_keyword');
  } else {
    issues.push('desc_missing');
  }

  return { score: Math.min(score, 100), issues };
}

/**
 * Genera todos los campos SEO para un producto.
 * Compara de forma inteligente, sugiriendo cambios cuando hay mejora real.
 */
export function generateSeo(product) {
  const name = getString(product.name);
  const currentHandle = getString(product.handle);
  const currentSeoTitle = getString(product.seo_title);
  const currentSeoDesc = getString(product.seo_description);

  const newHandle = generateHandle(name);
  const newSeoTitle = generateMetaTitle(product);
  const newSeoDesc = generateMetaDescription(product);

  // Evaluar calidad actual
  const quality = evaluateSeoQuality(currentHandle, currentSeoTitle, currentSeoDesc, name);

  // Handle: sugerir cambio si es numérico, vacío, o no coincide con el nombre
  const handleChanged = !currentHandle
    || /^\d+$/.test(currentHandle)
    || currentHandle.length > 80
    || currentHandle !== newHandle;

  // Title: sugerir cambio si está vacío, es solo el nombre, o no tiene separador
  const titleChanged = !currentSeoTitle
    || currentSeoTitle === name
    || (currentSeoTitle.length < 25 && newSeoTitle.length > currentSeoTitle.length)
    || (currentSeoTitle !== newSeoTitle && newSeoTitle.includes(' - '));

  // Description: sugerir cambio si está vacía, es muy corta, o no tiene call-to-action
  const descChanged = !currentSeoDesc
    || currentSeoDesc.length < 80
    || (currentSeoDesc.length < 120 && newSeoDesc.length >= 120)
    || currentSeoDesc !== newSeoDesc;

  return {
    handle: {
      current: currentHandle,
      generated: newHandle,
      changed: handleChanged,
    },
    seo_title: {
      current: currentSeoTitle,
      generated: newSeoTitle,
      changed: titleChanged,
    },
    seo_description: {
      current: currentSeoDesc,
      generated: newSeoDesc,
      changed: descChanged,
    },
    quality,
  };
}
