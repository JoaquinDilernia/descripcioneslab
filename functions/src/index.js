const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://descripcioneslab.techdi.com.ar',
    'http://localhost:5173',
    'http://localhost:5174'
  ]
}));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/products', productRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'DescripcionesLab API (Cloud Functions)' });
});

// Export as Cloud Function
exports.api = functions
  .region('us-central1')
  .https.onRequest(app);
