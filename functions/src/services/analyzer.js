/**
 * analyzer.js - Motor de análisis de descripciones de productos.
 *
 * Analiza cada producto y genera un quality_score de 0 a 100
 * basado en 7 criterios objetivos.
 */

const SCORE_WEIGHTS = {
  has_description: 20,
  adequate_length: 15,
  has_html_structure: 20,
  has_seo_title: 15,
  has_seo_description: 15,
  has_tags: 10,
  has_category: 5,
};

const MIN_DESCRIPTION_LENGTH = 100;

// Tags HTML que indican estructura
const STRUCTURE_TAGS = /<(h[1-6]|ul|ol|li|strong|em|b|table|br|div|section|p)[>\s/]/i;

/**
 * Extrae el texto plano de un string HTML.
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Obtiene la descripción en español (o el primer idioma disponible).
 */
function getDescription(product) {
  const desc = product.description;
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  return desc.es || desc.pt || desc.en || Object.values(desc)[0] || '';
}

/**
 * Obtiene el nombre en español (o el primer idioma disponible).
 */
function getName(product) {
  const name = product.name;
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name.es || name.pt || name.en || Object.values(name)[0] || '';
}

/**
 * Extrae un string de un campo que puede ser string, objeto multilingüe, u otro tipo.
 */
function getString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.es || value.pt || value.en || Object.values(value)[0] || '';
  return String(value);
}

/**
 * Analiza un producto individual y devuelve el objeto de análisis.
 */
function analyzeProduct(product) {
  const descriptionHtml = getDescription(product);
  const descriptionText = stripHtml(descriptionHtml);
  const name = getName(product);

  const has_description = descriptionText.length > 0;
  const description_length = descriptionText.length;
  const is_short = has_description && description_length < MIN_DESCRIPTION_LENGTH;
  const has_html_structure = STRUCTURE_TAGS.test(descriptionHtml);
  const has_seo_title = Boolean(getString(product.seo_title).trim());
  const has_seo_description = Boolean(getString(product.seo_description).trim());
  const has_tags = Boolean(getString(product.tags).trim());
  const has_category = Array.isArray(product.categories) && product.categories.length > 0;

  // Calcular score
  let quality_score = 0;
  if (has_description) quality_score += SCORE_WEIGHTS.has_description;
  if (has_description && !is_short) quality_score += SCORE_WEIGHTS.adequate_length;
  if (has_html_structure) quality_score += SCORE_WEIGHTS.has_html_structure;
  if (has_seo_title) quality_score += SCORE_WEIGHTS.has_seo_title;
  if (has_seo_description) quality_score += SCORE_WEIGHTS.has_seo_description;
  if (has_tags) quality_score += SCORE_WEIGHTS.has_tags;
  if (has_category) quality_score += SCORE_WEIGHTS.has_category;

  return {
    has_description,
    description_length,
    is_short,
    has_html_structure,
    has_seo_title,
    has_seo_description,
    has_tags,
    has_category,
    quality_score,
  };
}

/**
 * Analiza un array de productos y devuelve estadísticas globales.
 */
function analyzeStats(products) {
  const total = products.length;
  if (total === 0) {
    return {
      total: 0,
      without_description: 0,
      short_description: 0,
      without_structure: 0,
      without_seo_title: 0,
      without_seo_description: 0,
      without_tags: 0,
      average_score: 0,
      score_distribution: { good: 0, regular: 0, poor: 0 },
    };
  }

  let without_description = 0;
  let short_description = 0;
  let without_structure = 0;
  let without_seo_title = 0;
  let without_seo_description = 0;
  let without_tags = 0;
  let total_score = 0;
  let good = 0;   // >= 70
  let regular = 0; // 40-69
  let poor = 0;   // < 40

  for (const product of products) {
    const a = product.analysis || analyzeProduct(product);
    if (!a.has_description) without_description++;
    if (a.is_short) short_description++;
    if (!a.has_html_structure) without_structure++;
    if (!a.has_seo_title) without_seo_title++;
    if (!a.has_seo_description) without_seo_description++;
    if (!a.has_tags) without_tags++;
    total_score += a.quality_score;

    if (a.quality_score >= 70) good++;
    else if (a.quality_score >= 40) regular++;
    else poor++;
  }

  return {
    total,
    without_description,
    short_description,
    without_structure,
    without_seo_title,
    without_seo_description,
    without_tags,
    average_score: Math.round(total_score / total),
    score_distribution: { good, regular, poor },
  };
}

module.exports = {
  analyzeProduct,
  analyzeStats,
};
