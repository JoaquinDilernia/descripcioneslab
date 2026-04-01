/**
 * ai.js - Integracion con Google Gemini Flash para mejora de contenido.
 *
 * Requiere GEMINI_API_KEY en server/.env
 * Si no hay key configurada, las funciones devuelven null
 * y el sistema usa los generadores algoritmicos como fallback.
 *
 * Usa Gemini 2.0 Flash (gratis: 15 RPM, 1M tokens/dia).
 */

import env from '../config/env.js';

const MODEL = 'gemini-2.5-flash-lite';

function getApiUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.geminiKey}`;
}

function isConfigured() {
  return Boolean(env.geminiKey);
}

/**
 * Llama a la API de Gemini con un prompt.
 * Mantiene la misma firma que callOpenAI para compatibilidad.
 */
export async function callOpenAI(systemPrompt, userPrompt, maxTokens = 500) {
  if (!isConfigured()) return null;

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error (${response.status}): ${err}`);
  }

  const data = await response.json();

  // Extraer texto de la respuesta de Gemini
  const candidate = data.candidates?.[0];
  if (!candidate) return null;

  const text = candidate.content?.parts?.[0]?.text?.trim();
  return text || null;
}

/**
 * Mejora una descripcion de producto usando IA.
 */
export async function improveDescription(productName, currentDescription, sections) {
  const sectionLabels = sections.map((s) => s.label).join(', ');

  const systemPrompt = `Sos un experto en ecommerce y copywriting para tiendas online en español.
Tu trabajo es mejorar descripciones de productos para que sean claras, atractivas y optimizadas para SEO.
Responde SOLO con el HTML de la descripcion mejorada, sin explicaciones.
Usa las secciones indicadas con tags <h3> para cada seccion y <p> para el contenido.`;

  const userPrompt = `Producto: ${productName}
Descripcion actual: ${currentDescription || '(sin descripcion)'}
Secciones requeridas: ${sectionLabels}

Genera una descripcion HTML estructurada con esas secciones.`;

  return callOpenAI(systemPrompt, userPrompt);
}

/**
 * Genera meta title y meta description con IA.
 */
export async function generateSeoWithAI(productName, description, tags, currentTitle, currentDesc) {
  const systemPrompt = `Sos un experto en SEO para ecommerce en español latinoamericano.
Tu objetivo es generar meta title y meta description que MEJOREN el posicionamiento del producto en Google.

REGLAS PARA seo_title (max 60 chars):
- Debe incluir la keyword principal (nombre del producto)
- Agregar un diferenciador: categoria, beneficio clave, o atributo
- Usar separador " - " o " | "
- NO repetir lo que ya tiene el producto como titulo actual
- Ejemplo bueno: "Zapatillas Running Nike Air Max - Deportes"
- Ejemplo malo: "Zapatillas" (muy generico)

REGLAS PARA seo_description (120-160 chars):
- Primera oracion debe enganchar y contener la keyword
- Incluir un beneficio o call-to-action
- Terminar con algo como "Compra online" o "Envio a todo el pais"
- NO copiar la descripcion tal cual, RESUMIR y MEJORAR

Responde SOLO en JSON: {"seo_title": "...", "seo_description": "..."}
Sin markdown, sin backticks, sin explicaciones.`;

  const userPrompt = `Producto: ${productName}
Descripcion: ${description ? description.substring(0, 500) : '(sin descripcion)'}
Tags: ${tags || '(sin tags)'}
${currentTitle ? `Title actual: ${currentTitle}` : ''}
${currentDesc ? `Description actual: ${currentDesc}` : ''}

Genera meta title y meta description MEJORES que los actuales:`;

  const result = await callOpenAI(systemPrompt, userPrompt);
  if (!result) return null;

  try {
    // Limpiar posibles backticks
    const cleaned = result.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export { isConfigured };
