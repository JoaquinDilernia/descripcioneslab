/**
 * altEngine.js - Generador de ALT text para imágenes.
 *
 * Genera descripciones textuales automáticas para imágenes de productos
 * siguiendo buenas prácticas de SEO y accesibilidad.
 *
 * Usa info del producto: nombre, categoría, tags, descripción.
 */

function getString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.es || value.pt || value.en || Object.values(value)[0] || '';
  return String(value);
}

/**
 * Limpia y trunca texto para que sea adecuado como ALT.
 * (Max ~125 caracteres para buen SEO y accesibilidad)
 */
function cleanAlt(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // strip HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 125);
}

/**
 * Genera ALT text para una imagen de producto.
 * imageIndex: 0 = imagen principal, 1+ = imágenes adicionales
 */
function generateAltForImage(product, imageIndex = 0) {
  const name = getString(product.name) || 'Producto';
  const category = product.categories?.[0]?.name
    ? getString(product.categories[0].name)
    : '';
  const desc = getString(product.description);

  let alt = '';

  if (imageIndex === 0) {
    // Imagen principal: nombre + categoría o marca
    if (category) {
      alt = `${name} - ${category}`;
    } else {
      alt = name;
    }
  } else {
    // Imágenes adicionales: extraer info específica de la descripción
    // o usar nombre + número de imagen
    const descShort = desc.substring(0, 100).replace(/<[^>]*>/g, '').trim();
    if (descShort && descShort.length > 20) {
      alt = `${name} - ${descShort}`;
    } else {
      alt = `${name} - Imagen ${imageIndex + 1}`;
    }
  }

  return cleanAlt(alt);
}

/**
 * Genera ALT text para todas las imágenes de un producto.
 * Retorna array de ALT strings en orden de imagen.
 */
function generateAltForProduct(product) {
  const images = product.images || [];
  if (images.length === 0) return [];

  return images.map((_, idx) => generateAltForImage(product, idx));
}

/**
 * Retorna report de ALT status del producto.
 * Útil para saber cuáles imágenes necesitan ALT.
 */
function analyzeAltStatus(product) {
  const images = product.images || [];
  const withAlt = images.filter((img) => img.alt && img.alt.trim()).length;
  const withoutAlt = images.length - withAlt;
  const suggested = generateAltForProduct(product);

  return {
    total_images: images.length,
    with_alt: withAlt,
    without_alt: withoutAlt,
    coverage: images.length > 0 ? Math.round((withAlt / images.length) * 100) : 0,
    suggested,
  };
}

module.exports = {
  generateAltForImage,
  generateAltForProduct,
  analyzeAltStatus,
};
