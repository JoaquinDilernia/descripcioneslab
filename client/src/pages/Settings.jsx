import { useState, useEffect } from 'react';
import { getAuthStatus, getBackups, rollbackBackup } from '../services/api.js';
import './Settings.css';

export default function Settings({ user, onLogout, onRegister }) {
  const [connection, setConnection] = useState(null);
  const [connLoading, setConnLoading] = useState(true);

  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState(null);
  const [backupResult, setBackupResult] = useState(null);

  useEffect(() => {
    checkConnection();
    loadBackups();
  }, []);

  async function checkConnection() {
    setConnLoading(true);
    try {
      const data = await getAuthStatus();
      setConnection(data);
    } catch {
      setConnection(null);
    }
    setConnLoading(false);
  }

  async function loadBackups() {
    setBackupsLoading(true);
    try {
      const data = await getBackups();
      if (data.success) {
        setBackups(data.backups);
      }
    } catch {
      // silenciar
    }
    setBackupsLoading(false);
  }

  async function handleRollback(backupId) {
    if (!confirm('¿Restaurar las descripciones originales de este respaldo?')) return;
    setRollingBack(backupId);
    setBackupResult(null);
    try {
      const data = await rollbackBackup(backupId);
      if (data.success) {
        setBackupResult({ type: 'success', text: `Respaldo restaurado: ${data.restored} productos actualizados` });
        loadBackups();
      } else {
        setBackupResult({ type: 'error', text: data.error || 'Error al restaurar respaldo' });
      }
    } catch (err) {
      setBackupResult({ type: 'error', text: err.message });
    }
    setRollingBack(null);
  }

  const isConnected = connection?.connected;

  return (
    <div className="settings-page">
      <h2>Configuracion</h2>

      {/* Connection status */}
      <div className="settings-card">
        <h3>Estado de conexion</h3>
        {connLoading ? (
          <p className="settings-loading-text">Verificando conexion...</p>
        ) : (
          <div className="settings-connection">
            <span className={`settings-dot ${isConnected ? 'green' : 'red'}`} />
            <div className="settings-connection-info">
              <span className="settings-connection-label">
                {isConnected ? 'Tienda conectada' : 'Sin conexion'}
              </span>
              {isConnected && connection.store_id && (
                <span className="settings-store-id">Store ID: {connection.store_id}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Account */}
      <div className="settings-card">
        <h3>Cuenta</h3>
        <div className="settings-account">
          {user?.email && (
            <p className="settings-account-detail">
              <span className="settings-label">Email:</span> {user.email}
            </p>
          )}
          {user?.name && (
            <p className="settings-account-detail">
              <span className="settings-label">Nombre:</span> {user.name}
            </p>
          )}
        </div>
        <button className="settings-logout-btn" onClick={onLogout}>
          Cerrar sesion
        </button>
      </div>

      {/* Backups */}
      <div className="settings-card">
        <h3>Respaldos</h3>
        <p className="settings-card-hint">
          Cada vez que aplicas cambios se guarda un respaldo automatico (disponible 30 minutos).
        </p>

        {backupsLoading ? (
          <p className="settings-loading-text">Cargando respaldos...</p>
        ) : backups.length === 0 ? (
          <p className="settings-empty">No hay respaldos disponibles</p>
        ) : (
          <div className="backup-list">
            {backups.map((b) => (
              <div key={b.id} className="backup-item">
                <div className="backup-info">
                  <span className="backup-date">
                    {new Date(b.created_at).toLocaleString('es-AR')}
                  </span>
                  <span className="backup-count">
                    {b.product_count} productos
                  </span>
                </div>
                <button
                  className="rollback-btn"
                  onClick={() => handleRollback(b.id)}
                  disabled={rollingBack === b.id}
                >
                  {rollingBack === b.id ? 'Restaurando...' : 'Deshacer cambios'}
                </button>
              </div>
            ))}
          </div>
        )}

        {backupResult && (
          <div className={`backup-result ${backupResult.type}`}>
            {backupResult.text}
          </div>
        )}
      </div>
    </div>
  );
}
