import { useState, useEffect } from 'react';
import { getProductStats } from '../services/api.js';
import './Dashboard.css';

/* ---------- Inline sub-components ---------- */

function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      <div className="skeleton-bar skeleton-title" />
      <div className="skeleton-bar skeleton-subtitle" />
      <div className="skeleton-row">
        <div className="skeleton-bar skeleton-card" />
        <div className="skeleton-bar skeleton-card" />
        <div className="skeleton-bar skeleton-card" />
      </div>
      <div className="skeleton-row">
        <div className="skeleton-bar skeleton-gauge" />
        <div className="skeleton-stats">
          <div className="skeleton-bar skeleton-stat" />
          <div className="skeleton-bar skeleton-stat" />
          <div className="skeleton-bar skeleton-stat" />
          <div className="skeleton-bar skeleton-stat" />
          <div className="skeleton-bar skeleton-stat" />
        </div>
      </div>
      <div className="skeleton-bar skeleton-dist" />
    </div>
  );
}

function ScoreGauge({ score }) {
  const radius = 62;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  let color = 'var(--error)';
  let label = 'Calidad baja';
  if (score >= 70) {
    color = 'var(--success)';
    label = 'Buena calidad';
  } else if (score >= 40) {
    color = 'var(--warning)';
    label = 'Necesita mejoras';
  }

  return (
    <div className="score-gauge">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Background ring */}
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {/* Progress ring */}
        <circle
          className="score-gauge-ring"
          cx="80" cy="80" r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
        />
        {/* Score text */}
        <text x="80" y="74" textAnchor="middle" className="score-gauge-value">
          {score}
        </text>
        <text x="80" y="96" textAnchor="middle" className="score-gauge-label">
          {label}
        </text>
      </svg>
    </div>
  );
}

function ActionCard({ icon, title, description, onClick }) {
  return (
    <button className="action-card" onClick={onClick} type="button">
      <div className="action-card-icon">{icon}</div>
      <div className="action-card-body">
        <h3 className="action-card-title">{title}</h3>
        <p className="action-card-desc">{description}</p>
      </div>
      <span className="action-card-arrow">&rsaquo;</span>
    </button>
  );
}

function StatCard({ value, label, variant }) {
  return (
    <div className={`stat-card${variant ? ` stat-card--${variant}` : ''}`}>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function QualityBar({ distribution, total }) {
  if (!distribution || total === 0) return null;

  const pctGood = ((distribution.good / total) * 100).toFixed(1);
  const pctRegular = ((distribution.regular / total) * 100).toFixed(1);
  const pctPoor = ((distribution.poor / total) * 100).toFixed(1);

  return (
    <div className="quality-section">
      <h3 className="quality-title">Distribucion de calidad</h3>
      <div className="quality-bar">
        {distribution.good > 0 && (
          <div className="quality-segment quality-segment--good" style={{ width: `${pctGood}%` }}>
            {distribution.good}
          </div>
        )}
        {distribution.regular > 0 && (
          <div className="quality-segment quality-segment--regular" style={{ width: `${pctRegular}%` }}>
            {distribution.regular}
          </div>
        )}
        {distribution.poor > 0 && (
          <div className="quality-segment quality-segment--poor" style={{ width: `${pctPoor}%` }}>
            {distribution.poor}
          </div>
        )}
      </div>
      <div className="quality-legend">
        <span className="quality-legend-item">
          <i className="quality-dot quality-dot--good" /> Bueno (&ge;70) &mdash; {pctGood}%
        </span>
        <span className="quality-legend-item">
          <i className="quality-dot quality-dot--regular" /> Regular (40-69) &mdash; {pctRegular}%
        </span>
        <span className="quality-legend-item">
          <i className="quality-dot quality-dot--poor" /> Bajo (&lt;40) &mdash; {pctPoor}%
        </span>
      </div>
    </div>
  );
}

/* ---------- Main Dashboard component ---------- */

export default function Dashboard({ onNavigate, user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const data = await getProductStats();
        if (cancelled) return;
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.error || 'Error al obtener estadisticas');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
      if (!cancelled) setLoading(false);
    }

    fetchStats();
    return () => { cancelled = true; };
  }, []);

  const displayName = user?.name || user?.email || 'Usuario';
  const totalProducts = stats?.total ?? 0;

  /* Determine variant for stat cards based on value */
  function statVariant(val) {
    if (val > 0) return 'warning';
    return null;
  }

  return (
    <div className="dashboard-page">
      {/* Welcome header */}
      <section className="dashboard-welcome">
        <h1 className="dashboard-welcome-title">Bienvenido, {displayName}!</h1>
        <p className="dashboard-welcome-subtitle">
          {loading
            ? 'Cargando estadisticas de tu tienda...'
            : error
              ? 'No se pudieron cargar las estadisticas'
              : `Tu tienda tiene ${totalProducts} productos para optimizar`}
        </p>
      </section>

      {error && (
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      )}

      {loading && <LoadingSkeleton />}

      {!loading && !error && (
        <>
          {/* Action cards */}
          <section className="dashboard-actions">
            <ActionCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              }
              title="Mejorar descripciones"
              description="Estructura y enriquece las descripciones de tus productos"
              onClick={() => onNavigate('descriptions')}
            />
            <ActionCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              }
              title="Optimizar SEO"
              description="Mejora los titulos y meta descripciones para buscadores"
              onClick={() => onNavigate('seo-tools')}
            />
            <ActionCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              }
              title="Agregar etiquetas"
              description="Genera y asigna tags relevantes a tus productos"
              onClick={() => onNavigate('seo-tags')}
            />
          </section>

          {/* Score section: gauge + stat cards */}
          <section className="score-section">
            <ScoreGauge score={stats?.average_score ?? 0} />

            <div className="stat-grid">
              <StatCard value={stats?.total ?? 0} label="Total productos" />
              <StatCard
                value={stats?.without_description ?? 0}
                label="Sin descripcion"
                variant={statVariant(stats?.without_description)}
              />
              <StatCard
                value={stats?.without_seo_title ?? 0}
                label="Sin SEO title"
                variant={statVariant(stats?.without_seo_title)}
              />
              <StatCard
                value={stats?.without_seo_description ?? 0}
                label="Sin meta description"
                variant={statVariant(stats?.without_seo_description)}
              />
              <StatCard
                value={stats?.without_tags ?? 0}
                label="Sin tags"
                variant={statVariant(stats?.without_tags)}
              />
            </div>
          </section>

          {/* Quality distribution bar */}
          {stats?.score_distribution && (
            <QualityBar distribution={stats.score_distribution} total={stats.total} />
          )}
        </>
      )}
    </div>
  );
}
