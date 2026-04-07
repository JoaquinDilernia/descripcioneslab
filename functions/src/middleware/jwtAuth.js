/**
 * jwtAuth.js - Middleware de autenticación JWT.
 *
 * Verifica el token JWT en el header Authorization: Bearer <token>
 * y adjunta el usuario a req.user.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env.js');
const { getUserById } = require('../services/userStore.js');

/**
 * Genera un JWT para un usuario.
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, store_id: user.store_id },
    env.jwtSecret,
    { expiresIn: '30d' }
  );
}

/**
 * Middleware: requiere JWT válido.
 * Pone en req.user el usuario completo (sin password).
 */
async function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await getUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = {
  signToken,
  requireUser,
};
