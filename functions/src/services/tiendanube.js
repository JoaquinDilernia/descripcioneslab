const env = require('../config/env.js');

const TN = env.tn;

/**
 * Intercambia un authorization code por un access_token.
 * Equivalente al cURL que genera Tienda Nube en la página de partners.
 */
async function exchangeCodeForToken(code) {
  const response = await fetch(TN.authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: TN.appId,
      client_secret: TN.clientSecret,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tienda Nube auth error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Hace un GET a la API de Tienda Nube.
 */
async function tnGet(storeId, accessToken, path) {
  const url = `${TN.apiBase}/${storeId}${path}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authentication': `bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': `${TN.appName} (${TN.contactEmail})`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TN API error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Hace un PUT a la API de Tienda Nube.
 */
async function tnPut(storeId, accessToken, path, body) {
  const url = `${TN.apiBase}/${storeId}${path}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authentication': `bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': `${TN.appName} (${TN.contactEmail})`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TN API error (${response.status}): ${error}`);
  }

  return response.json();
}

module.exports = {
  exchangeCodeForToken,
  tnGet,
  tnPut,
};
