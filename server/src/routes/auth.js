import { Router } from 'express';
import { exchangeCodeForToken, tnGet } from '../services/tiendanube.js';
import { saveToken, getStoredToken } from '../services/tokenStore.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { createUser, authenticateUser, getUserById as getUser } from '../services/userStore.js';
import { signToken, requireUser } from '../middleware/jwtAuth.js';

const router = Router();

// ==================== REGISTRO / LOGIN ====================

/**
 * POST /auth/register
 * Registra un nuevo usuario vinculado a una tienda.
 * Body: { name, email, password, store_id, access_token }
 *
 * El store_id y access_token vienen del flujo OAuth de TN (intercambio de code).
 */
router.post('/register', async (req, res) => {
  const { name, email, password, store_id, access_token } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }

  if (!store_id || !access_token) {
    return res.status(400).json({ error: 'Conecta tu tienda antes de registrarte' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const user = await createUser({ name, email, password, store_id: Number(store_id), access_token });
    const jwt = signToken(user);

    // También guardar en tokenStore para compatibilidad
    saveToken({ access_token, user_id: store_id });

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, store_id: user.store_id },
      token: jwt,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /auth/login
 * Autentica un usuario existente.
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }

  try {
    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const jwt = signToken(user);

    // Guardar en tokenStore para compatibilidad con rutas existentes
    saveToken({ access_token: user.access_token, user_id: user.store_id });

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, store_id: user.store_id },
      token: jwt,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /auth/me
 * Devuelve el usuario autenticado. Requiere JWT.
 */
router.get('/me', requireUser, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      store_id: req.user.store_id,
    },
    connected: true,
  });
});

// ==================== TIENDA NUBE OAUTH (existente) ====================

/**
 * POST /auth/exchange
 * Recibe un code de OAuth y lo intercambia por un access_token.
 * Body: { "code": "xxx" }
 */
router.post('/exchange', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Falta el parámetro "code"' });
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    const stored = saveToken(tokenData);

    // Verificar la conexión haciendo un request de prueba
    try {
      const store = await tnGet(stored.store_id, stored.access_token, '/');
      stored.store_name = store.name?.es || store.name?.pt || store.name;
    } catch {
      // No es crítico si falla la verificación
    }

    res.json({
      success: true,
      message: 'Token obtenido y almacenado correctamente',
      store: {
        store_id: stored.store_id,
        access_token: stored.access_token,
        store_name: stored.store_name || null,
        scope: stored.scope,
        connected_at: stored.connected_at,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /auth/token
 * Recibe manualmente un access_token + store_id (si ya corrieron el cURL).
 * Body: { "access_token": "xxx", "store_id": "123" }
 */
router.post('/token', async (req, res) => {
  const { access_token, store_id } = req.body;

  if (!access_token || !store_id) {
    return res.status(400).json({
      error: 'Faltan parámetros: "access_token" y "store_id" son requeridos',
    });
  }

  try {
    const stored = saveToken({ access_token, user_id: store_id });

    // Verificar la conexión
    try {
      const store = await tnGet(stored.store_id, stored.access_token, '/');
      stored.store_name = store.name?.es || store.name?.pt || store.name;
    } catch {
      // No es crítico
    }

    res.json({
      success: true,
      message: 'Token almacenado correctamente',
      store: {
        store_id: stored.store_id,
        store_name: stored.store_name || null,
        connected_at: stored.connected_at,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /auth/status
 * Devuelve el estado de la conexión actual.
 * Compatible con el flujo viejo (tokenStore) y el nuevo (JWT).
 */
router.get('/status', (req, res) => {
  // Si tiene JWT, usar eso
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.split(' ')[1], env.jwtSecret);
      const user = getUser(payload.id);
      if (user) {
        return res.json({
          connected: true,
          store_id: user.store_id,
          user: { id: user.id, email: user.email },
        });
      }
    } catch {
      // Si falla el JWT, probar con tokenStore
    }
  }

  // Fallback: tokenStore
  const token = getStoredToken();
  if (!token || !token.active) {
    return res.json({ connected: false });
  }

  res.json({
    connected: true,
    store_id: token.store_id,
    scope: token.scope,
    connected_at: token.connected_at,
  });
});

export default router;
