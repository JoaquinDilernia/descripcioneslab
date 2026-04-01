import { useState } from 'react';
import './Sidebar.css';

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function Sidebar({ currentRoute, onNavigate, user, connected, onMobileClose, mobileOpen }) {
  const [seoOpen, setSeoOpen] = useState(
    currentRoute === 'seo-tools' || currentRoute === 'seo-meta' || currentRoute === 'seo-tags' || currentRoute === 'seo-alt'
  );

  function handleNav(route) {
    onNavigate(route);
    if (onMobileClose) onMobileClose();
  }

  function handleSeoToggle() {
    setSeoOpen(!seoOpen);
    if (!seoOpen) handleNav('seo-tools');
  }

  const isActive = (key) => currentRoute === key;
  const isSeoActive = ['seo-tools', 'seo-meta', 'seo-tags', 'seo-alt'].includes(currentRoute);

  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-brand" onClick={() => handleNav('dashboard')}>
        <img src="/logo.jpeg" alt="DescripcionesLab" className="sidebar-logo" />
        <span className="sidebar-title">DescripcionesLab</span>
      </div>

      <nav className="sidebar-nav">
        <button className={`sidebar-item ${isActive('dashboard') ? 'active' : ''}`} onClick={() => handleNav('dashboard')}>
          <HomeIcon /><span>Inicio</span>
        </button>

        <button className={`sidebar-item ${isActive('descriptions') ? 'active' : ''}`} onClick={() => handleNav('descriptions')}>
          <EditIcon /><span>Descripciones</span>
        </button>

        <div className="sidebar-group">
          <button className={`sidebar-item ${isSeoActive ? 'active' : ''}`} onClick={handleSeoToggle}>
            <SearchIcon /><span>Herramientas SEO</span><ChevronIcon open={seoOpen} />
          </button>
          {seoOpen && (
            <div className="sidebar-subitems">
              <button className={`sidebar-subitem ${currentRoute === 'seo-meta' ? 'active' : ''}`} onClick={() => handleNav('seo-meta')}>
                Titulos para Google
              </button>
              <button className={`sidebar-subitem ${currentRoute === 'seo-tags' ? 'active' : ''}`} onClick={() => handleNav('seo-tags')}>
                Etiquetas
              </button>
              <button className={`sidebar-subitem ${currentRoute === 'seo-alt' ? 'active' : ''}`} onClick={() => handleNav('seo-alt')}>
                Texto en fotos
              </button>
            </div>
          )}
        </div>

        <button className={`sidebar-item ${isActive('settings') ? 'active' : ''}`} onClick={() => handleNav('settings')}>
          <SettingsIcon /><span>Configuracion</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-connection">
          <span className={`sidebar-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span>{connected ? 'Tienda conectada' : 'Sin conexion'}</span>
        </div>
        {user && (
          <div className="sidebar-user">
            <span className="sidebar-email">{user.email}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
