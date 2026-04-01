import { useState, useEffect, useRef } from 'react';
import StepIndicator from '../components/StepIndicator.jsx';
import {
  detectStructure,
  getDefaultStructure,
  saveDefaultStructure,
  previewStructure,
  applyStructure,
  getCategories,
} from '../services/api.js';
import './DescriptionWizard.css';

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const STEP_LABELS = ['Elegir estructura', 'Vista previa', 'Aplicar'];

const FALLBACK_SECTIONS = [
  { key: 'short_desc', label: 'Descripcion', required: true, type: 'section' },
  { key: 'features', label: 'Caracteristicas', required: false, type: 'section' },
  { key: 'specs', label: 'Especificaciones', required: false, type: 'section' },
  { key: 'shipping', label: 'Envios', required: false, type: 'section' },
];

const PRESETS = {
  ropa: [
    { key: 'short_desc', label: 'Descripcion', required: true, type: 'section' },
    { key: 'features', label: 'Caracteristicas', required: false, type: 'section' },
    { key: 'materials', label: 'Materiales y composicion', required: false, type: 'section' },
    { key: 'size_guide', label: 'Guia de talles', required: false, type: 'section' },
    { key: 'care', label: 'Cuidados', required: false, type: 'section' },
    { key: 'shipping', label: 'Envios y devoluciones', required: false, type: 'section' },
  ],
  tech: [
    { key: 'short_desc', label: 'Descripcion', required: true, type: 'section' },
    { key: 'specs', label: 'Especificaciones tecnicas', required: true, type: 'section' },
    { key: 'features', label: 'Caracteristicas', required: false, type: 'section' },
    { key: 'includes', label: 'Incluye', required: false, type: 'section' },
    { key: 'warranty', label: 'Garantia', required: false, type: 'section' },
  ],
  alimentos: [
    { key: 'short_desc', label: 'Descripcion', required: true, type: 'section' },
    { key: 'ingredients', label: 'Ingredientes', required: true, type: 'section' },
    { key: 'nutrition', label: 'Informacion nutricional', required: false, type: 'section' },
    { key: 'usage', label: 'Modo de uso', required: false, type: 'section' },
    { key: 'storage', label: 'Conservacion', required: false, type: 'section' },
  ],
  general: [
    { key: 'short_desc', label: 'Descripcion', required: true, type: 'section' },
    { key: 'features', label: 'Caracteristicas', required: false, type: 'section' },
    { key: 'specs', label: 'Especificaciones', required: false, type: 'section' },
    { key: 'shipping', label: 'Envios', required: false, type: 'section' },
  ],
};

const PRESET_META = {
  general: { icon: '\u2699\uFE0F', title: 'General', desc: 'Estructura basica para cualquier producto' },
  ropa:    { icon: '\uD83D\uDC55', title: 'Ropa / Moda', desc: 'Talles, materiales, cuidados' },
  tech:    { icon: '\uD83D\uDCBB', title: 'Tecnologia', desc: 'Specs tecnicas, garantia, incluye' },
  alimentos: { icon: '\uD83C\uDF5E', title: 'Alimentos', desc: 'Ingredientes, nutricion, conservacion' },
};

const FONT_OPTIONS = [
  { value: '', label: 'Por defecto (tema de la tienda)' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { value: "'Open Sans', Arial, sans-serif", label: 'Open Sans' },
  { value: "'Roboto', Arial, sans-serif", label: 'Roboto' },
  { value: "'Lato', Arial, sans-serif", label: 'Lato' },
  { value: "'Montserrat', Arial, sans-serif", label: 'Montserrat' },
  { value: "'Poppins', Arial, sans-serif", label: 'Poppins' },
  { value: "'Raleway', Arial, sans-serif", label: 'Raleway' },
  { value: "'Nunito', Arial, sans-serif", label: 'Nunito' },
  { value: "'Source Sans Pro', Arial, sans-serif", label: 'Source Sans Pro' },
  { value: "Georgia, 'Times New Roman', serif", label: 'Georgia' },
  { value: "'Playfair Display', Georgia, serif", label: 'Playfair Display' },
  { value: "'Merriweather', Georgia, serif", label: 'Merriweather' },
];

const GOOGLE_FONTS = {
  'Open Sans': 'Open+Sans',
  'Roboto': 'Roboto',
  'Lato': 'Lato',
  'Montserrat': 'Montserrat',
  'Poppins': 'Poppins',
  'Raleway': 'Raleway',
  'Nunito': 'Nunito',
  'Source Sans Pro': 'Source+Sans+Pro',
  'Playfair Display': 'Playfair+Display',
  'Merriweather': 'Merriweather',
};

/* ─────────────────────────────────────────────
   Helpers (Preview / Apply)
   ───────────────────────────────────────────── */

function getName(product) {
  const n = product.name;
  if (!n) return '(sin nombre)';
  if (typeof n === 'string') return n;
  return n.es || n.pt || n.en || '(sin nombre)';
}

function getDescHtml(desc) {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  return desc.es || desc.pt || desc.en || '';
}

function getCategoryName(cat) {
  const n = cat.name;
  if (!n) return `#${cat.id}`;
  if (typeof n === 'string') return n;
  return n.es || n.pt || n.en || `#${cat.id}`;
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export default function DescriptionWizard({ sections: parentSections, onSectionsChange, font: parentFont, onFontChange, onNavigate }) {
  // ── Wizard step ──
  const [step, setStep] = useState(0);

  // ── Step 0: Structure state ──
  const [sections, _setSections] = useState(parentSections || [...FALLBACK_SECTIONS]);
  const [font, _setFont] = useState(parentFont || '');
  const [newLabel, setNewLabel] = useState('');
  const [addType, setAddType] = useState('section');
  const [newUrl, setNewUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(null);
  const [saved, setSaved] = useState(false);
  const [hasDefault, setHasDefault] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  // ── Step 1: Preview state ──
  const [previews, setPreviews] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewUseAi, setPreviewUseAi] = useState(true);
  const [previewAiUsed, setPreviewAiUsed] = useState(false);
  const previewLoadedRef = useRef(false);

  // ── Step 2: Apply state ──
  const [scope, setScope] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState(null);
  const [applyConfirmed, setApplyConfirmed] = useState(false);
  const [applyUseAi, setApplyUseAi] = useState(true);

  /* ─── Sync helpers ─── */

  function setSections(newSections) {
    _setSections(newSections);
    if (onSectionsChange) onSectionsChange(newSections);
    setSaved(false);
  }

  function setFont(f) {
    _setFont(f);
    if (onFontChange) onFontChange(f);
  }

  /* ─── Step 0: Load default structure on mount ─── */

  useEffect(() => {
    getDefaultStructure()
      .then((data) => {
        if (data.success && data.structure && data.structure.sections) {
          setSections(data.structure.sections);
          setHasDefault(true);
          if (data.structure.font) setFont(data.structure.font);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Step 0: Load Google Font for preview ─── */

  useEffect(() => {
    if (!font) return;
    const fontName = Object.keys(GOOGLE_FONTS).find((name) => font.includes(name));
    if (!fontName) return;
    const linkId = 'dl-font-preview';
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS[fontName]}:wght@400;600;700&display=swap`;
  }, [font]);

  /* ─── Step 1: Auto-load preview when entering step 1 ─── */

  useEffect(() => {
    if (step === 1 && !previewLoadedRef.current) {
      previewLoadedRef.current = true;
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ─────────────────────────────────────────────
     Step 0: Structure functions
     ───────────────────────────────────────────── */

  function addSection() {
    const label = newLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now();

    if (addType === 'link') {
      setSections([...sections, { key, label, required: false, type: 'link', url: newUrl.trim() || '#' }]);
    } else {
      setSections([...sections, { key, label, required: false, type: 'section' }]);
    }
    setNewLabel('');
    setNewUrl('');
  }

  function removeSection(index) {
    setSections(sections.filter((_, i) => i !== index));
  }

  function toggleRequired(index) {
    setSections(sections.map((s, i) => (i === index ? { ...s, required: !s.required } : s)));
  }

  function moveSection(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setSections(updated);
  }

  function loadPreset(presetKey) {
    setSections(PRESETS[presetKey]);
    setActivePreset(presetKey);
  }

  async function handleDetect() {
    setDetecting(true);
    setDetected(null);
    try {
      const data = await detectStructure();
      if (data.success) {
        setDetected(data);
        if (data.detected && data.detected.length > 0) {
          setSections(data.detected);
          setActivePreset(null);
        }
      }
    } catch (err) {
      console.error('Error detecting structure:', err);
    }
    setDetecting(false);
  }

  async function handleSave() {
    try {
      const data = await saveDefaultStructure(sections, font);
      if (data.success) {
        setSaved(true);
        setHasDefault(true);
      }
    } catch (err) {
      console.error('Error saving structure:', err);
    }
  }

  /* ─────────────────────────────────────────────
     Step 1: Preview functions
     ───────────────────────────────────────────── */

  async function loadPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const data = await previewStructure(sections, [], previewUseAi, font || '');
      if (data.success) {
        setPreviews(data.previews);
        setPreviewAiUsed(data.ai_used || false);
        setPreviewLoaded(true);
      } else {
        setPreviewError(data.error || 'Error al generar preview');
      }
    } catch (err) {
      setPreviewError(err.message);
    }
    setPreviewLoading(false);
  }

  /* ─────────────────────────────────────────────
     Step 2: Apply functions
     ───────────────────────────────────────────── */

  async function loadCategories() {
    if (categoriesLoaded) return;
    try {
      const data = await getCategories();
      if (data.success) {
        setCategories(data.categories || []);
        setCategoriesLoaded(true);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  function handleScopeChange(newScope) {
    setScope(newScope);
    if (newScope === 'category') loadCategories();
    setApplyConfirmed(false);
    setApplyResult(null);
  }

  async function handleApply() {
    setApplyLoading(true);
    setApplyResult(null);
    try {
      const data = await applyStructure(sections, scope, categoryId, [], applyUseAi, font || '');
      setApplyResult(data);
    } catch (err) {
      setApplyResult({ success: false, error: err.message });
    }
    setApplyLoading(false);
    setApplyConfirmed(false);
  }

  /* ─────────────────────────────────────────────
     Navigation
     ───────────────────────────────────────────── */

  function goNext() {
    if (step < 2) {
      // Reset preview data when moving from step 0 to 1 so it auto-loads fresh
      if (step === 0) {
        previewLoadedRef.current = false;
        setPreviewLoaded(false);
        setPreviews([]);
        setPreviewError(null);
      }
      setStep(step + 1);
    }
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleStepClick(index) {
    if (index < step) setStep(index);
  }

  /* ─────────────────────────────────────────────
     Render: Step 0 - Elegir estructura
     ───────────────────────────────────────────── */

  function renderStep0() {
    return (
      <div className="wiz-step wiz-step-structure">
        <p className="wiz-step-desc">
          Defini las secciones que queres que tengan las descripciones de tus productos.
          El motor analiza la descripcion existente y distribuye el contenido en cada seccion.
        </p>

        {/* Preset cards */}
        <div className="wiz-presets">
          <h4 className="wiz-section-title">Plantillas</h4>
          <div className="wiz-preset-grid">
            {Object.entries(PRESET_META).map(([key, meta]) => (
              <button
                key={key}
                className={`wiz-preset-card ${activePreset === key ? 'active' : ''}`}
                onClick={() => loadPreset(key)}
              >
                <span className="wiz-preset-icon">{meta.icon}</span>
                <span className="wiz-preset-title">{meta.title}</span>
                <span className="wiz-preset-desc">{meta.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Auto-detect */}
        <div className="wiz-detect-row">
          <button className="wiz-detect-btn" onClick={handleDetect} disabled={detecting}>
            {detecting ? 'Analizando...' : 'Detectar automaticamente'}
          </button>
          <span className="wiz-detect-hint">
            Analiza tus productos y sugiere la mejor estructura
          </span>
        </div>

        {/* Detection results */}
        {detected && (
          <div className="wiz-detect-result">
            <p>
              <strong>{detected.products_with_structure}</strong> de {detected.total_products} productos tienen contenido analizable.
              {detected.ai_used && <span className="wiz-ai-badge">IA</span>}
            </p>
            {detected.detected.length > 0 ? (
              <>
                <p className="wiz-detect-note">
                  {detected.ai_used
                    ? 'La IA analizo tus descripciones e identifico estas secciones comunes. Ya se cargaron en el editor.'
                    : 'Se encontraron estas secciones comunes. Ya se cargaron en el editor.'}
                </p>
                <div className="wiz-detect-chips">
                  {detected.detected.map((s) => (
                    <span key={s.key} className="wiz-detect-chip">
                      {s.label}
                      <span className="wiz-detect-pct">{s.percentage}%</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="wiz-detect-note">
                No se detectaron secciones comunes. Usa una plantilla o crea tu estructura.
              </p>
            )}
          </div>
        )}

        {/* Section editor */}
        <div className="wiz-sections-editor">
          <h4 className="wiz-section-title">Secciones</h4>

          <div className="wiz-sections-list">
            {sections.map((section, index) => (
              <div key={section.key} className={`wiz-section-item ${section.type === 'link' ? 'is-link' : ''}`}>
                <div className="wiz-section-order">
                  <button
                    className="wiz-move-btn"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    title="Mover arriba"
                  >
                    &#9650;
                  </button>
                  <button
                    className="wiz-move-btn"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    title="Mover abajo"
                  >
                    &#9660;
                  </button>
                </div>

                <span className="wiz-section-label">
                  {section.label}
                  {section.type === 'link' && (
                    <span className="wiz-type-badge wiz-link-badge">Link</span>
                  )}
                </span>

                {section.type === 'link' && (
                  <span className="wiz-section-url">{section.url || '#'}</span>
                )}

                {section.type !== 'link' && (
                  <button
                    className={`wiz-required-toggle ${section.required ? 'active' : ''}`}
                    onClick={() => toggleRequired(index)}
                  >
                    {section.required ? 'Requerida' : 'Opcional'}
                  </button>
                )}

                <button className="wiz-remove-btn" onClick={() => removeSection(index)} title="Eliminar">
                  &times;
                </button>
              </div>
            ))}
          </div>

          {/* Add section / link */}
          <div className="wiz-add-area">
            <div className="wiz-add-type-toggle">
              <button
                className={`wiz-type-btn ${addType === 'section' ? 'active' : ''}`}
                onClick={() => setAddType('section')}
              >
                + Seccion
              </button>
              <button
                className={`wiz-type-btn ${addType === 'link' ? 'active' : ''}`}
                onClick={() => setAddType('link')}
              >
                + Link
              </button>
            </div>

            <div className="wiz-add-row">
              <input
                type="text"
                className="wiz-add-input"
                placeholder={addType === 'link' ? 'Texto del link (ej: Ver guia de talles)' : 'Nueva seccion (ej: Instrucciones de uso)'}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSection()}
              />
              {addType === 'link' && (
                <input
                  type="text"
                  className="wiz-add-input wiz-url-input"
                  placeholder="URL (ej: https://mitienda.com/talles)"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSection()}
                />
              )}
              <button className="wiz-add-btn" onClick={addSection} disabled={!newLabel.trim()}>
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Visual structure preview (clean, no HTML tags) */}
        <div className="wiz-visual-preview">
          <h4 className="wiz-section-title">Vista previa de la estructura</h4>
          <div className="wiz-preview-mock" style={font ? { fontFamily: font } : undefined}>
            {sections.map((s) => (
              <div key={s.key} className="wiz-preview-block">
                {s.type === 'link' ? (
                  <a className="wiz-preview-link" href="#" onClick={(e) => e.preventDefault()}>
                    {s.label}
                  </a>
                ) : (
                  <>
                    <div className="wiz-preview-heading">{s.label}</div>
                    <div className="wiz-preview-placeholder">
                      Contenido extraido de la descripcion...
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Font picker */}
        <div className="wiz-font-picker">
          <h4 className="wiz-section-title">Tipografia</h4>
          <p className="wiz-font-hint">Tipografia para tus descripciones (opcional)</p>
          <div className="wiz-font-row">
            <select
              className="wiz-font-select"
              value={font}
              onChange={(e) => {
                setFont(e.target.value);
                setSaved(false);
              }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          {font && (
            <div className="wiz-font-preview" style={{ fontFamily: font }}>
              Asi se ve la tipografia en tus descripciones. Mesa Ratona Nova - Diseno moderno con terminaciones premium.
            </div>
          )}
        </div>

        {/* Save action */}
        <div className="wiz-save-row">
          <button className="wiz-save-btn" onClick={handleSave}>
            {saved ? 'Guardada' : hasDefault ? 'Actualizar predeterminada' : 'Guardar como predeterminada'}
          </button>
          {saved && (
            <span className="wiz-save-confirm">
              Estructura guardada como predeterminada para tu tienda.
            </span>
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     Render: Step 1 - Vista previa
     ───────────────────────────────────────────── */

  function renderStep1() {
    if (!sections || sections.length === 0) {
      return (
        <div className="wiz-step wiz-step-preview">
          <p className="wiz-empty">Primero defini la estructura en el paso anterior.</p>
        </div>
      );
    }

    return (
      <div className="wiz-step wiz-step-preview">
        <p className="wiz-step-desc">
          Asi se verian las descripciones de tus productos con la estructura definida.
          {previewUseAi && ' La IA reorganiza el contenido real sin inventar informacion.'}
        </p>

        <div className="wiz-preview-controls">
          <button className="wiz-regenerate-btn" onClick={loadPreview} disabled={previewLoading}>
            {previewLoading
              ? previewUseAi
                ? 'Generando con IA...'
                : 'Generando...'
              : previewLoaded
                ? 'Regenerar preview'
                : 'Generar preview'}
          </button>

          <label className={`wiz-ai-toggle ${previewUseAi ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={previewUseAi}
              onChange={(e) => setPreviewUseAi(e.target.checked)}
            />
            Usar IA
            <span className="wiz-ai-badge">Gemini</span>
          </label>
        </div>

        {previewLoading && previewUseAi && (
          <p className="wiz-ai-note">
            La IA esta analizando cada producto y redistribuyendo el contenido en las secciones...
          </p>
        )}

        {previewError && <p className="wiz-error">{previewError}</p>}

        {previews.length > 0 && (
          <div className="wiz-previews-list">
            {previewAiUsed && (
              <div className="wiz-ai-banner">
                Generado con IA - el contenido fue reorganizado a partir de la descripcion original
              </div>
            )}

            {previews.map((item) => (
              <div key={item.id} className="wiz-preview-card">
                <div className="wiz-preview-header">
                  <h3>{getName(item)}</h3>
                  <span className="wiz-preview-id">#{item.id}</span>
                </div>

                <div className="wiz-comparison">
                  <div className="wiz-comparison-col">
                    <h4>Antes</h4>
                    <div
                      className="wiz-desc-box wiz-desc-original"
                      dangerouslySetInnerHTML={{
                        __html: getDescHtml(item.original) || '<em>Sin descripcion</em>',
                      }}
                    />
                  </div>

                  <div className="wiz-comparison-arrow">&#8594;</div>

                  <div className="wiz-comparison-col">
                    <h4>Despues</h4>
                    <div
                      className="wiz-desc-box wiz-desc-generated"
                      dangerouslySetInnerHTML={{
                        __html: getDescHtml(item.generated),
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     Render: Step 2 - Aplicar
     ───────────────────────────────────────────── */

  function renderStep2() {
    if (!sections || sections.length === 0) {
      return (
        <div className="wiz-step wiz-step-apply">
          <p className="wiz-empty">Primero defini la estructura en el paso anterior.</p>
        </div>
      );
    }

    // Success celebration view
    if (applyResult && applyResult.success) {
      return (
        <div className="wiz-step wiz-step-apply">
          <div className="wiz-success-card">
            <div className="wiz-success-icon">&#10003;</div>
            <h3>Cambios aplicados con exito</h3>
            <p className="wiz-success-count">
              <strong>{applyResult.applied}</strong> productos actualizados
            </p>
            {applyResult.errors && applyResult.errors.length > 0 && (
              <p className="wiz-success-errors">
                {applyResult.errors.length} productos con errores
              </p>
            )}
            <div className="wiz-backup-info">
              <span className="wiz-backup-label">Respaldo:</span>{' '}
              <code>{applyResult.backup_id}</code>
              <br />
              <span className="wiz-backup-expires">
                Rollback disponible hasta: {new Date(applyResult.backup_expires).toLocaleTimeString()}
              </span>
            </div>
            <div className="wiz-success-actions">
              <button className="wiz-btn-secondary" onClick={() => { setApplyResult(null); setStep(0); }}>
                Volver al inicio
              </button>
              {onNavigate && (
                <button className="wiz-btn-primary" onClick={() => onNavigate('dashboard')}>
                  Ir al dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="wiz-step wiz-step-apply">
        <p className="wiz-step-desc">
          Aplica la estructura definida a los productos de tu tienda.
          Se crea un respaldo automatico antes de cada cambio.
        </p>

        {/* Structure summary */}
        <div className="wiz-apply-card">
          <h4>Estructura a aplicar</h4>
          <div className="wiz-sections-summary">
            {sections.map((s, i) => (
              <span key={s.key} className="wiz-section-chip">
                {i + 1}. {s.label}
                {s.required && <span className="wiz-required-dot" />}
                {s.type === 'link' && <span className="wiz-chip-link">link</span>}
              </span>
            ))}
          </div>

          <label className={`wiz-ai-toggle apply-ai ${applyUseAi ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={applyUseAi}
              onChange={(e) => setApplyUseAi(e.target.checked)}
            />
            Usar IA para reorganizar contenido
            <span className="wiz-ai-badge">Gemini</span>
          </label>
        </div>

        {/* Scope */}
        <div className="wiz-apply-card">
          <h4>Alcance</h4>
          <div className="wiz-scope-options">
            <label className={`wiz-scope-option ${scope === 'all' ? 'active' : ''}`}>
              <input
                type="radio"
                name="scope"
                value="all"
                checked={scope === 'all'}
                onChange={() => handleScopeChange('all')}
              />
              <div>
                <strong>Todos los productos</strong>
                <span>Aplica la estructura a todos los productos de la tienda</span>
              </div>
            </label>

            <label className={`wiz-scope-option ${scope === 'category' ? 'active' : ''}`}>
              <input
                type="radio"
                name="scope"
                value="category"
                checked={scope === 'category'}
                onChange={() => handleScopeChange('category')}
              />
              <div>
                <strong>Por categoria</strong>
                <span>Solo productos de una categoria especifica</span>
              </div>
            </label>
          </div>

          {scope === 'category' && (
            <select
              className="wiz-category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Selecciona una categoria...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryName(cat)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Confirmation / Apply */}
        {!applyResult && (
          <div className="wiz-apply-card wiz-confirm-card">
            {!applyConfirmed ? (
              <>
                <p className="wiz-confirm-warning">
                  Este proceso modificara las descripciones en tu tienda.
                  Se creara un respaldo automatico antes de aplicar los cambios.
                </p>
                <button className="wiz-confirm-btn" onClick={() => setApplyConfirmed(true)}>
                  Entiendo, quiero continuar
                </button>
              </>
            ) : (
              <>
                <p className="wiz-confirm-final">
                  {scope === 'all'
                    ? 'Se aplicara la estructura a TODOS los productos.'
                    : 'Se aplicara la estructura a los productos de la categoria seleccionada.'}
                </p>
                <button
                  className="wiz-apply-btn"
                  onClick={handleApply}
                  disabled={applyLoading || (scope === 'category' && !categoryId)}
                >
                  {applyLoading ? 'Aplicando cambios...' : 'Aplicar cambios ahora'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Error result */}
        {applyResult && !applyResult.success && (
          <div className="wiz-apply-card wiz-result-error">
            <h4>Error</h4>
            <p>{applyResult.error}</p>
            <button className="wiz-btn-secondary" onClick={() => setApplyResult(null)}>
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     Main render
     ───────────────────────────────────────────── */

  const canGoNext = step === 0
    ? sections.length > 0
    : step === 1
      ? true
      : false;

  return (
    <div className="description-wizard">
      <h2>Descripciones</h2>

      <StepIndicator steps={STEP_LABELS} currentStep={step} onStepClick={handleStepClick} />

      <div className="wiz-body">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </div>

      {/* Navigation buttons */}
      <div className="wiz-nav">
        {step > 0 && (
          <button className="wiz-btn-secondary" onClick={goBack}>
            Atras
          </button>
        )}
        <div className="wiz-nav-spacer" />
        {step < 2 && (
          <button className="wiz-btn-primary" onClick={goNext} disabled={!canGoNext}>
            Siguiente
          </button>
        )}
      </div>
    </div>
  );
}
