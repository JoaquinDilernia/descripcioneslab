import { useState, useEffect } from 'react';
import { getAuthStatus, getJwt, clearJwt, getMe } from './services/api.js';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DescriptionWizard from './pages/DescriptionWizard.jsx';
import SeoTools from './pages/SeoTools.jsx';
import Settings from './pages/Settings.jsx';
import './App.css';

const FALLBACK_SECTIONS = [
  { key: 'short_desc', label: 'Descripcion', required: true, type: 'section' },
  { key: 'features', label: 'Caracteristicas', required: false, type: 'section' },
  { key: 'specs', label: 'Especificaciones', required: false, type: 'section' },
  { key: 'shipping', label: 'Envios', required: false, type: 'section' },
];

function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Wizard state
  const [sections, setSections] = useState([...FALLBACK_SECTIONS]);
  const [font, setFont] = useState('');

  // Toast state
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  function addToast(message, type = 'info') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }

  async function checkAuth() {
    setLoading(true);
    try {
      if (getJwt()) {
        const meData = await getMe();
        if (meData.success) {
          setUser(meData.user);
          setConnected(true);
          setLoading(false);
          return;
        }
        clearJwt();
      }
      const statusData = await getAuthStatus();
      setConnected(statusData.connected);
      if (!statusData.connected) setCurrentRoute('settings');
    } catch {
      setConnected(false);
    }
    setLoading(false);
  }

  function handleAuth(userData) {
    setUser(userData);
    setConnected(true);
    setCurrentRoute('dashboard');
  }

  function handleLogout() {
    clearJwt();
    setUser(null);
    setConnected(false);
  }

  if (loading) {
    return <div className="app"><div className="app-loading">Cargando...</div></div>;
  }

  if (!user) {
    return <Login onAuth={handleAuth} />;
  }

  function renderPage() {
    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentRoute} user={user} />;
      case 'descriptions':
        return (
          <DescriptionWizard
            sections={sections}
            onSectionsChange={setSections}
            font={font}
            onFontChange={setFont}
            onNavigate={setCurrentRoute}
          />
        );
      case 'seo-tools':
      case 'seo-meta':
        return <SeoTools initialTab="seo" />;
      case 'seo-tags':
        return <SeoTools initialTab="tags" />;
      case 'seo-alt':
        return <SeoTools initialTab="alt" />;
      case 'settings':
        return <Settings user={user} onLogout={handleLogout} onRegister={handleAuth} />;
      default:
        return <Dashboard onNavigate={setCurrentRoute} user={user} />;
    }
  }

  return (
    <div className="app">
      <div className="app-layout">
        {mobileMenuOpen && (
          <div className="sidebar-overlay visible" onClick={() => setMobileMenuOpen(false)} />
        )}
        <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? '\u2715' : '\u2630'}
        </button>
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={setCurrentRoute}
          user={user}
          connected={connected}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <main className="app-content">
          {renderPage()}
        </main>
      </div>

      {/* Toast container */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              padding: '12px 20px',
              borderRadius: 8,
              background: t.type === 'success' ? 'var(--success)' : t.type === 'error' ? 'var(--error)' : 'var(--primary)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: 'var(--shadow-card)',
              animation: 'slideIn 0.3s ease',
            }}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
