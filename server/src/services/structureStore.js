/**
 * structureStore.js - Persiste la estructura predeterminada de la tienda.
 * Similar a tokenStore.js: JSON file en server/data/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'structure.json');

// Asegurar que el dir exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Guarda la estructura predeterminada.
 */
export function saveDefaultStructure(sections, font) {
  const data = {
    sections,
    font: font || '',
    saved_at: new Date().toISOString(),
  };
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
  return data;
}

/**
 * Obtiene la estructura predeterminada.
 */
export function getDefaultStructure() {
  if (!fs.existsSync(STORE_FILE)) return null;
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
