import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';

const app = express();

// Middleware
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

// Rutas
app.use('/auth', authRoutes);
app.use('/api/products', productRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'DescripcionesLab API' });
});

// Start
app.listen(env.port, () => {
  console.log(`[DescripcionesLab] Server corriendo en http://localhost:${env.port}`);
});
