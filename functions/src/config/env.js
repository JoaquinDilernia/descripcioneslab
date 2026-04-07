require('dotenv/config');

const env = {
  port: process.env.PORT || 3001,
  clientUrl: process.env.CLIENT_URL || 'https://descripcioneslab.techdi.com.ar',

  // Tienda Nube
  tn: {
    appId: process.env.TN_APP_ID || '27465',
    clientSecret: process.env.TN_CLIENT_SECRET || '4bd46a5a10b8f08f4405a8e7500e962097ccb8cae6f4901c',
    appName: process.env.TN_APP_NAME || 'DescripcionesLab',
    contactEmail: process.env.TN_CONTACT_EMAIL || 'info@techdi.com.ar',
    authUrl: 'https://www.tiendanube.com/apps/authorize/token',
    apiBase: 'https://api.tiendanube.com/v1',
  },

  // Google Gemini
  geminiKey: process.env.GEMINI_API_KEY || 'AIzaSyCFDaeQeQG37xeMH41AhXlcV1CG4EbFpCw',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dl_s3cr3t_jwt_k3y_2024_d3scripcioneslab',

  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'pedidos-lett-2',
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID || '391e8db2815d8ca14aaff3031d19a5746cc75818',
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-89m22@pedidos-lett-2.iam.gserviceaccount.com',
  },
};

module.exports = env;
