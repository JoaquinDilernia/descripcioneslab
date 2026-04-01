import { useState, useEffect } from 'react';
import { login, register, setJwt, exchangeCode } from '../services/api';
import './Login.css';

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Datos de tienda (se obtienen automaticamente del ?code= en la URL)
  const [storeId, setStoreId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [exchanging, setExchanging] = useState(false);

  // Al montar: detectar si hay ?code= en la URL (viene de instalar la app en TN)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleExchangeCode(code);
    }
  }, []);

  async function handleExchangeCode(code) {
    setExchanging(true);
    setError('');
    try {
      const data = await exchangeCode(code);
      if (data.success && data.store) {
        setStoreId(data.store.store_id);
        setAccessToken(data.store.access_token);
        setMode('register');
        // Limpiar el ?code de la URL sin recargar
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        setError(data.error || 'Error al conectar la tienda');
      }
    } catch {
      setError('Error de conexion con el servidor');
    }
    setExchanging(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (mode === 'register') {
        if (!storeId || !accessToken) {
          setError('No se pudo vincular tu tienda. Instala la app desde Tienda Nube.');
          setLoading(false);
          return;
        }
        data = await register(name, email, password, storeId, accessToken);
      } else {
        data = await login(email, password);
      }

      if (data.success) {
        setJwt(data.token);
        onAuth(data.user);
      } else {
        setError(data.error || 'Error al autenticar');
      }
    } catch {
      setError('Error de conexion con el servidor');
    }

    setLoading(false);
  }

  if (exchanging) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <img src="/logo.jpeg" alt="DescripcionesLab" className="login-logo-img" />
            <h1 className="login-title">DescripcionesLab</h1>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            Conectando tu tienda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.jpeg" alt="DescripcionesLab" className="login-logo-img" />
          <h1 className="login-title">DescripcionesLab</h1>
          <p className="login-tagline">Optimiza las descripciones de tu tienda</p>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Iniciar sesion
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <>
              {storeId ? (
                <div className="login-store-info">
                  <span className="login-store-connected">
                    Tienda vinculada correctamente
                  </span>
                </div>
              ) : (
                <div className="login-store-info">
                  <span className="login-store-warning">
                    Para registrarte, instala la app desde tu panel de Tienda Nube.
                    Al instalarla seras redirigido aca automaticamente.
                  </span>
                </div>
              )}
            </>
          )}

          {mode === 'register' && (
            <div className="login-field">
              <label>Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre o el de tu tienda"
                required
              />
            </div>
          )}

          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="login-field">
            <label>Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Minimo 6 caracteres' : 'Tu contrasena'}
              required
              minLength={mode === 'register' ? 6 : 1}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-submit"
            disabled={loading || (mode === 'register' && !storeId)}
          >
            {loading
              ? 'Cargando...'
              : mode === 'login'
                ? 'Iniciar sesion'
                : 'Crear cuenta'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
