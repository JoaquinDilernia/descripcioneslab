/**
 * backupStore.js - Sistema de backup/rollback de descripciones.
 *
 * Guarda snapshots de descripciones antes de aplicar cambios masivos.
 * Backups expiran a los 30 minutos (rollback de emergencia).
 * Almacenamiento en JSON files (MVP), migrable a Firestore.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = join(__dirname, '..', '..', 'data', 'backups');
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutos

function ensureDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Crea un backup de las descripciones actuales.
 * @param {Array} products - Productos con su descripción actual
 * @returns {Object} Metadata del backup creado
 */
export function createBackup(products) {
  ensureDir();

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = new Date();

  const backup = {
    id,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + EXPIRY_MS).toISOString(),
    product_count: products.length,
    products: {},
  };

  for (const p of products) {
    backup.products[p.id] = {
      description: p.description,
      seo_title: p.seo_title || null,
      seo_description: p.seo_description || null,
    };
  }

  writeFileSync(join(BACKUP_DIR, `${id}.json`), JSON.stringify(backup, null, 2), 'utf-8');

  return {
    id: backup.id,
    created_at: backup.created_at,
    expires_at: backup.expires_at,
    product_count: backup.product_count,
  };
}

/**
 * Lista todos los backups disponibles (no expirados).
 */
export function listBackups() {
  ensureDir();
  const now = Date.now();
  const files = readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
  const backups = [];

  for (const file of files) {
    try {
      const raw = readFileSync(join(BACKUP_DIR, file), 'utf-8');
      const b = JSON.parse(raw);
      const expired = new Date(b.expires_at).getTime() < now;

      // Limpiar expirados
      if (expired) {
        unlinkSync(join(BACKUP_DIR, file));
        continue;
      }

      backups.push({
        id: b.id,
        created_at: b.created_at,
        expires_at: b.expires_at,
        product_count: b.product_count,
        minutes_left: Math.round((new Date(b.expires_at).getTime() - now) / 60000),
      });
    } catch {
      // Archivo corrupto, ignorar
    }
  }

  return backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Obtiene un backup por ID.
 * @returns {Object|null} Backup completo con productos, o null si no existe/expiró
 */
export function getBackup(id) {
  const file = join(BACKUP_DIR, `${id}.json`);
  if (!existsSync(file)) return null;

  try {
    const raw = readFileSync(file, 'utf-8');
    const b = JSON.parse(raw);

    if (new Date(b.expires_at).getTime() < Date.now()) {
      unlinkSync(file);
      return null;
    }

    return b;
  } catch {
    return null;
  }
}
