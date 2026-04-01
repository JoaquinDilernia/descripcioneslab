import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const TOKEN_FILE = join(DATA_DIR, 'token.json');

/**
 * Lee el token almacenado. Devuelve null si no existe.
 */
export function getStoredToken() {
  if (!existsSync(TOKEN_FILE)) return null;

  try {
    const raw = readFileSync(TOKEN_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Guarda el token en disco.
 */
export function saveToken(data) {
  const payload = {
    store_id: data.user_id || data.store_id,
    access_token: data.access_token,
    scope: data.scope || '',
    connected_at: new Date().toISOString(),
    active: true,
  };

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  writeFileSync(TOKEN_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  return payload;
}
