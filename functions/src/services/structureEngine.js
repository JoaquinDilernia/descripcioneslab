/**
 * structureEngine.js - Motor de generacion de descripciones.
 *
 * Modo algoritmico: parsea la descripcion existente y redistribuye.
 * Modo IA: analiza, enriquece, mejora y completa descripciones profesionales.
 */

const { isConfigured, callOpenAI } = require('./openai.js');

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function getDescription(product) {
  const desc = product.description;
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  return desc.es || desc.pt || desc.en || Object.values(desc)[0] || '';
}

function getName(product) {
  const name = product.name;
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name.es || name.pt || name.en || Object.values(name)[0] || '';
}

function getString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.es || value.pt || value.en || Object.values(value)[0] || '';
  return String(value);
}

// Google Fonts que necesitan @import para mostrarse en la tienda
const GOOGLE_FONT_NAMES = {
  'Open Sans': 'Open+Sans',
  'Roboto': 'Roboto',
  'Lato': 'Lato',
  'Montserrat': 'Montserrat',
  'Poppins': 'Poppins',
  'Raleway': 'Raleway',
  'Nunito': 'Nunito',
  'Source Sans Pro': 'Source+Sans+Pro',
  'Playfair Display': 'Playfair+Display',
  'Merriweather': 'Merriweather',
};

/**
 * Envuelve el HTML de la descripcion con la tipografia elegida.
 * Inyecta @import de Google Fonts si es necesario + un div wrapper con style inline.
 */
function wrapWithFont(html, font) {
  if (!font || !html) return html;

  let importTag = '';
  const fontName = Object.keys(GOOGLE_FONT_NAMES).find(name => font.includes(name));
  if (fontName) {
    importTag = `<link href="https://fonts.googleapis.com/css2?family=${GOOGLE_FONT_NAMES[fontName]}:wght@400;600;700&display=swap" rel="stylesheet">`;
  }

  return `${importTag}<div style="font-family: ${font};">${html}</div>`;
}

/**
 * Modo algoritmico (fallback sin IA).
 */
function generatePreview(product, sections, font) {
  const currentHtml = getDescription(product);
  const currentText = stripHtml(currentHtml);

  if (!currentText && !currentHtml) {
    const html = sections
      .filter((s) => s.type !== 'link')
      .map((s) => `<h3>${s.label}</h3>\n<p></p>`)
      .join('\n\n');
    const linkHtml = sections
      .filter((s) => s.type === 'link')
      .map((s) => `<p><a href="${s.url || '#'}">${s.label}</a></p>`)
      .join('\n');
    const result = html + (linkHtml ? '\n\n' + linkHtml : '');
    return { es: wrapWithFont(result, font) };
  }

  const parsed = parseExistingSections(currentHtml);
  const htmlParts = [];
  let usedContent = false;

  for (const section of sections) {
    if (section.type === 'link') continue;
    const matched = findMatchingContent(section, parsed);
    if (matched) {
      htmlParts.push(`<h3>${section.label}</h3>\n${matched}`);
      usedContent = true;
    } else if (sections.indexOf(section) === 0 && currentText && !usedContent) {
      htmlParts.push(`<h3>${section.label}</h3>\n${currentHtml}`);
      usedContent = true;
    }
  }

  if (!usedContent && currentHtml) {
    const first = sections.find((s) => s.type !== 'link');
    if (first) htmlParts.unshift(`<h3>${first.label}</h3>\n${currentHtml}`);
  }

  for (const link of sections.filter((s) => s.type === 'link')) {
    htmlParts.push(`<p><a href="${link.url || '#'}">${link.label}</a></p>`);
  }

  return { es: wrapWithFont(htmlParts.join('\n\n'), font) };
}

function parseExistingSections(html) {
  if (!html) return [];
  const sections = [];
  const sectionRegex = /<(h[2-4]|strong|b)[^>]*>(.*?)<\/\1>/gi;
  const matches = [...html.matchAll(sectionRegex)];
  if (matches.length === 0) return [{ title: '', content: html }];
  for (let i = 0; i < matches.length; i++) {
    const title = stripHtml(matches[i][2]).toLowerCase();
    const startIdx = matches[i].index + matches[i][0].length;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : html.length;
    sections.push({ title, content: html.substring(startIdx, endIdx).trim() });
  }
  return sections;
}

function findMatchingContent(section, parsedSections) {
  const label = section.label.toLowerCase();
  const keywords = label.split(/\s+/);
  for (const parsed of parsedSections) {
    if (!parsed.title) continue;
    const t = parsed.title.toLowerCase();
    if (keywords.some((kw) => kw.length > 3 && t.includes(kw)) || t.includes(label) || label.includes(t)) {
      return parsed.content || null;
    }
  }
  return null;
}

/**
 * Modo IA: analiza, enriquece y mejora la descripcion.
 *
 * A diferencia del modo algoritmico, la IA:
 * - Mejora la redaccion para que sea profesional y atractiva
 * - Completa secciones vacias con info inferida del producto
 * - Agrega bullet points, formatos claros
 * - Genera contenido de ecommerce real, no placeholders
 * - Mantiene la info original pero la potencia
 */
async function generatePreviewWithAI(product, sections, font) {
  if (!isConfigured()) {
    return generatePreview(product, sections, font);
  }

  const currentHtml = getDescription(product);
  const currentText = stripHtml(currentHtml);
  const name = getName(product);
  const tags = getString(product.tags);
  const category = product.categories && product.categories.length > 0
    ? getString(product.categories[0].name)
    : '';

  // Si no tiene nada, generar desde cero con lo que sabemos
  const hasContent = currentText && currentText.length > 10;

  const regularSections = sections.filter((s) => s.type !== 'link');
  const linkSections = sections.filter((s) => s.type === 'link');

  const sectionList = regularSections
    .map((s, i) => `${i + 1}. "${s.label}"${s.required ? ' (obligatoria - siempre debe tener contenido)' : ' (completar si hay info relevante)'}`)
    .join('\n');

  const linkList = linkSections.length > 0
    ? '\n\nAl final del HTML agregar estos links exactos:\n' + linkSections.map((s) => `<p><a href="${s.url || '#'}">${s.label}</a></p>`).join('\n')
    : '';

  const systemPrompt = `Sos un copywriter senior especializado en ecommerce en español latinoamericano.
Tu trabajo es crear descripciones de producto profesionales, atractivas y que vendan.

LO QUE DEBES HACER:
- Tomar la info existente del producto y MEJORARLA: mejor redaccion, mas clara, mas profesional
- COMPLETAR secciones que estan vacias usando la info que se puede inferir del nombre, tags y categoria del producto
- Usar formato HTML limpio: <h3> para titulos de seccion, <p> para parrafos, <ul><li> para listas cuando corresponda
- Escribir en tono profesional pero cercano, como una buena tienda online
- Si el producto tiene caracteristicas tecnicas, organizarlas en lista
- Si tiene beneficios, destacarlos con bullet points
- Agregar una frase de cierre atractiva si hay espacio
- Cada seccion debe tener al menos 1-2 oraciones de contenido util

LO QUE NO DEBES HACER:
- NO inventar datos tecnicos especificos (medidas exactas, composiciones, porcentajes) que no esten en la info original
- NO agregar precios ni disponibilidad
- NO usar lenguaje exagerado o spam ("EL MEJOR!!! INCREIBLE!!!")
- NO agregar markdown ni backticks - solo HTML puro
- NO explicar lo que hiciste - responder SOLO con el HTML final

FORMATO DE RESPUESTA:
Solo el HTML. Cada seccion con <h3>Titulo</h3> seguido del contenido.`;

  const productInfo = [
    `Producto: ${name}`,
    category ? `Categoria: ${category}` : null,
    tags ? `Tags: ${tags}` : null,
    hasContent ? `\nDescripcion actual:\n${currentHtml}` : `\n(Sin descripcion actual - generar desde la info disponible)`,
  ].filter(Boolean).join('\n');

  const userPrompt = `${productInfo}

Genera la descripcion organizada en estas secciones:
${sectionList}
${linkList}

HTML:`;

  try {
    const result = await callOpenAI(systemPrompt, userPrompt, 2000);
    if (result) {
      const cleaned = result
        .replace(/^```html?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
      return { es: wrapWithFont(cleaned, font) };
    }
  } catch (err) {
    console.error('Error en IA para estructura:', err.message);
  }

  return generatePreview(product, sections, font);
}

module.exports = {
  generatePreview,
  generatePreviewWithAI,
};
