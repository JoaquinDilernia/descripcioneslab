/**
 * userStore.js - Gestión de usuarios con almacenamiento en JSON.
 *
 * Cada usuario queda vinculado a un store_id de Tienda Nube.
 * Passwords hasheados con bcrypt. Archivo: server/data/users.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const USERS_FILE = join(DATA_DIR, 'users.json');

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readUsers() {
  ensureDir();
  if (!existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureDir();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

/**
 * Registra un nuevo usuario.
 * Retorna el usuario (sin password) o lanza error si ya existe.
 */
export async function createUser({ name, email, password, store_id, access_token }) {
  const users = readUsers();

  // Verificar email duplicado
  if (users.find((u) => u.email === email.toLowerCase())) {
    throw new Error('Ya existe un usuario con ese email');
  }

  // Verificar store_id duplicado (una tienda = un usuario)
  if (users.find((u) => u.store_id === store_id)) {
    throw new Error('Esta tienda ya tiene un usuario registrado');
  }

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name || '',
    email: email.toLowerCase(),
    password: hash,
    store_id,
    access_token,
    created_at: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);

  const { password: _, ...safe } = user;
  return safe;
}

/**
 * Autentica un usuario por email + password.
 * Retorna el usuario (sin password) o null si no coincide.
 */
export async function authenticateUser(email, password) {
  const users = readUsers();
  const user = users.find((u) => u.email === email.toLowerCase());
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  const { password: _, ...safe } = user;
  return safe;
}

/**
 * Obtiene un usuario por ID.
 */
export function getUserById(id) {
  const users = readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return null;

  const { password: _, ...safe } = user;
  return safe;
}

/**
 * Actualiza el access_token de un usuario (por re-auth de TN).
 */
export function updateUserToken(id, access_token) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  users[idx].access_token = access_token;
  writeUsers(users);

  const { password: _, ...safe } = users[idx];
  return safe;
}

/**
 * Busca usuario por store_id.
 */
export function getUserByStoreId(storeId) {
  const users = readUsers();
  const user = users.find((u) => u.store_id === storeId);
  if (!user) return null;

  const { password: _, ...safe } = user;
  return safe;
}
