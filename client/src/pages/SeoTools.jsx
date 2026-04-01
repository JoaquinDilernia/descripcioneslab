import { useState, useEffect, useRef } from 'react';
import { previewSeo, applySeo, previewTags, applyTags, previewAlt, applyAlt } from '../services/api.js';
import './SeoTools.css';

/* ── helpers ─────────────────────────────────────────────── */

function getString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.es || value.pt || value.en || Object.values(value)[0] || '';
  return String(value);
}

function CharCount({ text, min, max }) {
  const len = (text || '').length;
  let cls = 'seo-char-count';
  if (max && len > max) cls += ' over';
  else if (min && len >= min && len <= max) cls += ' good';
  return <span className={cls}>{len} caracteres{min ? ` (ideal: ${min}-${max})` : max ? ` (max: ${max})` : ''}</span>;
}

/* ── Tab definitions ─────────────────────────────────────── */

const TABS = [
  { key: 'seo', label: 'Titulos para Google' },
  { key: 'tags', label: 'Etiquetas' },
  { key: 'alt', label: 'Texto en fotos' },
];

/* ── Main component ──────────────────────────────────────── */

export default function SeoTools({ initialTab = 'seo' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="seo-tools-page">
      <h2>Herramientas SEO</h2>
      <p className="seo-tools-subtitle">Optimiza tu tienda para que aparezca en Google</p>

      {/* Tab bar */}
      <div className="seo-tools-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`seo-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="seo-content">
        {activeTab === 'seo' && <SeoTab />}
        {activeTab === 'tags' && <TagsTab />}
        {activeTab === 'alt' && <AltTab />}
      </div>
    </div>
  );
}

/* ================================================================
   TAB 1 — Titulos para Google  (ported from Seo.jsx)
   ================================================================ */

function SeoTab() {
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [scanAll, setScanAll] = useState(true);
  const [aiAvailable, setAiAvailable] = useState(null);
  const [selections, setSelections] = useState({});
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const didAutoScan = useRef(false);

  /* auto-scan on mount */
  useEffect(() => {
    if (!didAutoScan.current) {
      didAutoScan.current = true;
      handleScan();
    }
  }, []);

  async function handleScan() {
    setLoading(true);
    setResult(null);
    setPreviews([]);
    setSelections({});
    try {
      const data = await previewSeo([], useAi, scanAll);
      if (data.success) {
        setPreviews(data.previews || []);
        setAiAvailable(data.ai_available);

        const sel = {};
        for (const p of data.previews) {
          sel[p.id] = {};
          for (const field of ['handle', 'seo_title', 'seo_description']) {
            if (p.seo[field]?.changed) {
              sel[p.id][field] = 'algo';
            }
          }
        }
        setSelections(sel);
      }
    } catch (err) {
      console.error('Error scanning SEO:', err);
    }
    setLoading(false);
  }

  function toggleSource(productId, field, source) {
    setSelections((prev) => {
      const updated = { ...prev };
      if (!updated[productId]) updated[productId] = {};
      if (updated[productId][field] === source) {
        delete updated[productId][field];
        if (Object.keys(updated[productId]).length === 0) delete updated[productId];
      } else {
        updated[productId][field] = source;
      }
      return updated;
    });
  }

  function getChangesCount() {
    let count = 0;
    for (const pid of Object.keys(selections)) {
      count += Object.keys(selections[pid]).length;
    }
    return count;
  }

  function buildChanges() {
    const changes = [];
    for (const pid of Object.keys(selections)) {
      const fields = selections[pid];
      if (Object.keys(fields).length === 0) continue;
      const preview = previews.find((p) => String(p.id) === String(pid));
      if (!preview) continue;
      const change = { id: preview.id };
      for (const [field, source] of Object.entries(fields)) {
        if (source === 'algo') {
          change[field] = preview.seo[field]?.generated || '';
        } else if (source === 'ai' && preview.ai_seo) {
          change[field] = preview.ai_seo[field] || '';
        }
      }
      changes.push(change);
    }
    return changes;
  }

  async function handleApply() {
    const changes = buildChanges();
    if (changes.length === 0) return;
    setApplying(true);
    setResult(null);
    try {
      const data = await applySeo(changes);
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: err.message });
    }
    setApplying(false);
  }

  return (
    <>
      {/* Toolbar */}
      <div className="seo-toolbar">
        <button className="seo-apply-btn" onClick={handleScan} disabled={loading}>
          {loading ? 'Analizando...' : 'Analizar productos'}
        </button>

        <div className="seo-scope-toggle">
          <button className={`seo-scope-btn${scanAll ? ' active' : ''}`} onClick={() => setScanAll(true)}>Todos</button>
          <button className={`seo-scope-btn${!scanAll ? ' active' : ''}`} onClick={() => setScanAll(false)}>Primeros 10</button>
        </div>

        {aiAvailable !== null && (
          aiAvailable ? (
            <label className={`ai-toggle${useAi ? ' active' : ''}`}>
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
              Usar IA <span className="ai-badge">OpenAI</span>
            </label>
          ) : (
            <span className="ai-unavailable">IA no configurada (falta OPENAI_API_KEY)</span>
          )
        )}
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div className="seo-loading-shimmers">
          {[1, 2, 3].map((i) => (
            <div key={i} className="seo-product-card shimmer-card">
              <div className="shimmer-line w60" />
              <div className="shimmer-line w100" />
              <div className="shimmer-line w80" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && previews.length > 0 && (
        <>
          <div className="seo-results-count">{previews.length} productos analizados</div>

          {previews.map((preview) => (
            <SeoProductCard
              key={preview.id}
              preview={preview}
              selections={selections[preview.id] || {}}
              onToggle={(field, source) => toggleSource(preview.id, field, source)}
              useAi={useAi}
            />
          ))}

          {/* Apply */}
          {!result && (
            <div className="seo-apply-section">
              <h4>Aplicar mejoras SEO</h4>
              <p className="seo-apply-summary">
                {getChangesCount()} cambios seleccionados en {Object.keys(selections).length} productos.
                Se creara un backup automatico.
              </p>
              <button className="seo-apply-btn" onClick={handleApply} disabled={applying || getChangesCount() === 0}>
                {applying ? 'Aplicando...' : 'Aplicar mejoras SEO'}
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`seo-result${result.success ? '' : ' error'}`}>
              {result.success ? (
                <>
                  <h4 style={{ color: 'var(--success)' }}>SEO actualizado</h4>
                  <p>{result.applied} productos actualizados</p>
                  {result.errors?.length > 0 && (
                    <p style={{ color: 'var(--warning)' }}>{result.errors.length} errores</p>
                  )}
                  <p>Backup: <code>{result.backup_id}</code></p>
                  <p style={{ fontSize: 12 }}>
                    Rollback disponible hasta: {new Date(result.backup_expires).toLocaleTimeString()}
                  </p>
                </>
              ) : (
                <>
                  <h4>Error</h4>
                  <p>{result.error}</p>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty */}
      {!loading && previews.length === 0 && aiAvailable !== null && (
        <div className="seo-empty">No se encontraron productos para analizar. Escanea de nuevo.</div>
      )}
    </>
  );
}

/* ── SEO product card (sub-component) ──────────────────── */

function SeoProductCard({ preview, selections, onToggle, useAi }) {
  const name = getString(preview.name);
  const { seo, ai_seo } = preview;

  const fields = [
    { key: 'handle', label: 'Direccion web', max: 100 },
    { key: 'seo_title', label: 'Titulo en Google', max: 60 },
    { key: 'seo_description', label: 'Descripcion en Google', min: 120, max: 160 },
  ];

  return (
    <div className="seo-product-card">
      <div className="seo-product-header">
        <span className="seo-product-name">{name || '(sin nombre)'}</span>
        <span className="seo-product-id">#{preview.id}</span>
      </div>

      {fields.map(({ key, label, min, max }) => {
        const field = seo[key];
        if (!field) return null;
        const hasAi = useAi && ai_seo && ai_seo[key] && !ai_seo.error;

        return (
          <div className="seo-field" key={key}>
            <div className="seo-field-label">
              {label}
              {field.changed
                ? <span className="seo-field-changed">mejorable</span>
                : <span className="seo-field-same">ok</span>}
            </div>

            <div className="seo-field-values">
              <div className="seo-field-value current">
                <span className="seo-value-label">Actual</span>
                {field.current || <span className="seo-empty">(vacio)</span>}
                <CharCount text={field.current} min={min} max={max} />
              </div>
              <div className={`seo-field-value${selections[key] === 'algo' ? ' generated' : ''}`}>
                <span className="seo-value-label">Sugerido</span>
                {field.generated || <span className="seo-empty">(vacio)</span>}
                <CharCount text={field.generated} min={min} max={max} />
              </div>
            </div>

            {hasAi && (
              <div className="seo-field-values" style={{ marginTop: 8 }}>
                <div />
                <div className={`seo-field-value${selections[key] === 'ai' ? ' ai' : ''}`}>
                  <span className="seo-value-label">IA</span>
                  {ai_seo[key]}
                  <CharCount text={ai_seo[key]} min={min} max={max} />
                </div>
              </div>
            )}

            {field.changed && (
              <div className="seo-source-selector">
                <button
                  className={`seo-source-btn${selections[key] === 'algo' ? ' selected' : ''}`}
                  onClick={() => onToggle(key, 'algo')}
                >
                  Usar mejora
                </button>
                {hasAi && (
                  <button
                    className={`seo-source-btn${selections[key] === 'ai' ? ' ai-selected' : ''}`}
                    onClick={() => onToggle(key, 'ai')}
                  >
                    Usar IA
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   TAB 2 — Etiquetas  (ported from Tags.jsx)
   ================================================================ */

function TagsTab() {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [previews, setPreviews] = useState(null);
  const [scanAll, setScanAll] = useState(true);
  const [applied, setApplied] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const didAutoScan = useRef(false);

  useEffect(() => {
    if (!didAutoScan.current) {
      didAutoScan.current = true;
      handlePreview();
    }
  }, []);

  async function handlePreview() {
    setLoading(true);
    setPreviews(null);
    setApplied(null);
    setSelected(new Set());
    try {
      const data = await previewTags(scanAll);
      if (data.success) {
        setPreviews(data);
        const sel = new Set();
        data.previews.forEach((p) => {
          if (p.changed) sel.add(p.id);
        });
        setSelected(sel);
      }
    } catch (err) {
      console.error('Error previewing tags:', err);
    }
    setLoading(false);
  }

  async function handleApply() {
    if (!previews || selected.size === 0) return;
    setApplying(true);
    try {
      const changes = previews.previews
        .filter((p) => selected.has(p.id) && p.changed)
        .map((p) => ({ id: p.id, tags: p.suggested }));
      if (changes.length === 0) { setApplying(false); return; }
      const data = await applyTags(changes);
      if (data.success) setApplied(data);
    } catch (err) {
      console.error('Error applying tags:', err);
    }
    setApplying(false);
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!previews) return;
    const changeable = previews.previews.filter((p) => p.changed);
    if (selected.size === changeable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(changeable.map((p) => p.id)));
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="seo-toolbar">
        <button className="seo-apply-btn" onClick={handlePreview} disabled={loading}>
          {loading ? 'Analizando...' : 'Analizar y generar tags'}
        </button>

        <div className="seo-scope-toggle">
          <button className={`seo-scope-btn${scanAll ? ' active' : ''}`} onClick={() => setScanAll(true)}>Todos</button>
          <button className={`seo-scope-btn${!scanAll ? ' active' : ''}`} onClick={() => setScanAll(false)}>Primeros 10</button>
        </div>
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div className="seo-loading-shimmers">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="seo-product-card shimmer-card">
              <div className="shimmer-line w60" />
              <div className="shimmer-line w100" />
              <div className="shimmer-line w40" />
            </div>
          ))}
        </div>
      )}

      {/* Applied banner */}
      {applied && (
        <div className="tags-applied-banner">
          Tags aplicados a <strong>{applied.applied}</strong> productos.
          {applied.errors && applied.errors.length > 0 && (
            <span className="tags-errors"> ({applied.errors.length} errores)</span>
          )}
        </div>
      )}

      {/* Previews */}
      {previews && (
        <>
          <div className="tags-summary">
            <span><strong>{previews.total}</strong> productos analizados</span>
            <span className="tags-sep">|</span>
            <span><strong>{previews.with_changes}</strong> con tags nuevos sugeridos</span>
          </div>

          {previews.with_changes > 0 && (
            <div className="tags-actions-bar">
              <label className="tags-select-all">
                <input
                  type="checkbox"
                  checked={selected.size === previews.previews.filter((p) => p.changed).length}
                  onChange={toggleAll}
                />
                Seleccionar todos ({previews.previews.filter((p) => p.changed).length})
              </label>
              <button className="seo-apply-btn" onClick={handleApply} disabled={applying || selected.size === 0}>
                {applying ? 'Aplicando...' : `Aplicar etiquetas (${selected.size})`}
              </button>
            </div>
          )}

          <div className="tags-list">
            {previews.previews.map((p) => (
              <div key={p.id} className={`tags-item${p.changed ? ' has-changes' : ''}`}>
                <div className="tags-item-header">
                  {p.changed && (
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                  )}
                  <span className="tags-product-name">{getString(p.name)}</span>
                  {p.skus && p.skus.length > 0 && (
                    <span className="tags-sku-badge">SKU: {p.skus.join(', ')}</span>
                  )}
                  {!p.changed && <span className="tags-ok-badge">OK</span>}
                </div>

                <div className="tags-item-body">
                  <div className="tags-row">
                    <span className="tags-label">Actuales ({p.current_count}):</span>
                    <span className="tags-chip-list">
                      {p.current
                        ? p.current.split(',').map((t, i) => <span key={i} className="tag-chip">{t.trim()}</span>)
                        : <em className="tags-empty">Sin tags</em>}
                    </span>
                  </div>
                  {p.changed && (
                    <div className="tags-row">
                      <span className="tags-label">Sugeridos ({p.suggested_count}):</span>
                      <span className="tags-chip-list">
                        {p.suggested && p.suggested.split(',').map((t, i) => <span key={i} className="tag-chip">{t.trim()}</span>)}
                      </span>
                    </div>
                  )}
                  {p.added && p.added.length > 0 && (
                    <div className="tags-added">
                      {p.added.map((tag, i) => (
                        <span key={i} className="tag-chip new">+ {tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ================================================================
   TAB 3 — Texto en fotos  (ported from Alt.jsx)
   ================================================================ */

function AltTab() {
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanAll, setScanAll] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const didAutoScan = useRef(false);

  async function loadPreview() {
    setLoading(true);
    setResult(null);
    try {
      const data = await previewAlt(scanAll);
      if (data.success) {
        setPreviews(data.previews || []);
        setLoaded(true);
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
    }
    setLoading(false);
  }

  /* auto-scan on mount */
  useEffect(() => {
    if (!didAutoScan.current) {
      didAutoScan.current = true;
      loadPreview();
    }
  }, []);

  /* re-scan when scope changes */
  useEffect(() => {
    if (didAutoScan.current) {
      loadPreview();
    }
  }, [scanAll]);

  function toggleProduct(id) {
    const next = new Set(selectedProducts);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedProducts(next);
  }

  function toggleAll() {
    if (selectedProducts.size === previews.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(previews.map((p) => p.id)));
    }
  }

  async function handleApply() {
    setApplying(true);
    setResult(null);
    try {
      const productIds = scanAll ? [] : Array.from(selectedProducts);
      const data = await applyAlt(productIds);
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: err.message });
    }
    setApplying(false);
  }

  const needingAlt = previews.filter((p) => p.without_alt > 0);
  const allSelected = selectedProducts.size === previews.length && previews.length > 0;

  return (
    <>
      {/* Toolbar */}
      <div className="seo-toolbar">
        <button className="seo-apply-btn" onClick={loadPreview} disabled={loading}>
          {loading ? 'Analizando...' : 'Escanear'}
        </button>

        <label className="scope-toggle">
          <input type="checkbox" checked={scanAll} onChange={(e) => setScanAll(e.target.checked)} />
          Todos los productos ({scanAll ? 'completo' : 'primeros 10'})
        </label>
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div className="seo-loading-shimmers">
          <div className="alt-summary">
            {[1, 2, 3].map((i) => (
              <div key={i} className="summary-stat shimmer-card">
                <div className="shimmer-line w40" />
                <div className="shimmer-line w60" style={{ height: 28 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {loaded && !loading && (
        <div className="alt-summary">
          <div className="summary-stat">
            <span className="stat-label">Productos analizados</span>
            <span className="stat-value">{previews.length}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Con imagenes</span>
            <span className="stat-value">{previews.filter((p) => p.total_images > 0).length}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Necesitan ALT</span>
            <span className="stat-value" style={{ color: needingAlt.length > 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {needingAlt.length}
            </span>
          </div>
        </div>
      )}

      {/* Products list (only shown when NOT scanAll) */}
      {loaded && !loading && previews.length > 0 && !scanAll && (
        <div className="alt-list">
          <div className="alt-header">
            <label className="alt-checkbox-header">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span>Seleccionar todo</span>
            </label>
            <span className="alt-coverage-label">Cobertura</span>
          </div>

          {previews.map((product) => (
            <div key={product.id} className="alt-product">
              <div className="alt-product-left">
                <label className="alt-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                </label>
                <div className="alt-product-info">
                  <div className="alt-product-name">{getString(product.name)}</div>
                  <div className="alt-product-stats">
                    {product.total_images} img &bull; {product.with_alt} con ALT &bull; {product.without_alt} faltante
                  </div>
                </div>
              </div>

              <div className="alt-coverage-bar">
                <div className="alt-coverage-fill" style={{ width: `${product.coverage}%` }} />
              </div>
              <div className="alt-coverage-pct">{product.coverage}%</div>
            </div>
          ))}
        </div>
      )}

      {/* Apply */}
      {loaded && !loading && previews.length > 0 && (scanAll || selectedProducts.size > 0) && (
        <div className="alt-apply-section">
          <div className="alt-apply-info">
            {scanAll ? (
              <p>Se generara ALT automatico para <strong>TODOS los productos</strong> de tu tienda. Los ALTs se basan en el nombre, categoria y descripcion del producto.</p>
            ) : (
              <p>Se generara ALT automatico para <strong>{selectedProducts.size}</strong> producto{selectedProducts.size !== 1 ? 's' : ''}. Los ALTs se basan en el nombre, categoria y descripcion del producto.</p>
            )}
          </div>
          <button className="seo-apply-btn" onClick={handleApply} disabled={applying}>
            {applying ? 'Aplicando...' : `Aplicar texto alternativo${scanAll ? ' a todos' : ''}`}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`alt-result${result.success ? ' success' : ' error'}`}>
          {result.success ? (
            <>
              <h4>ALT aplicado</h4>
              <p>{result.applied} productos actualizados</p>
              {result.skipped > 0 && <p className="result-skipped">{result.skipped} sin imagenes (omitidos)</p>}
              {result.errors && result.errors.length > 0 && (
                <div className="result-errors-detail">
                  <p className="result-errors-title">{result.errors.length} errores:</p>
                  <ul className="result-errors-list">
                    {result.errors.map((err, idx) => (
                      <li key={idx}><strong>Producto {err.id}:</strong> {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <h4>Error</h4>
              <p>{result.error}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
