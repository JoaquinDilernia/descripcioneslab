import 'dotenv/config';

const env = {
  port: process.env.PORT || 3001,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Tienda Nube
  tn: {
    appId: process.env.TN_APP_ID,
    clientSecret: process.env.TN_CLIENT_SECRET,
    appName: process.env.TN_APP_NAME || 'DescripcionesLab',
    contactEmail: process.env.TN_CONTACT_EMAIL || '',
    authUrl: 'https://www.tiendanube.com/apps/authorize/token',
    apiBase: 'https://api.tiendanube.com/v1',
  },

  // Google Gemini (opcional, si no hay key se usan generadores algoritmicos)
  geminiKey: process.env.GEMINI_API_KEY || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',

  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
};

export default env;
