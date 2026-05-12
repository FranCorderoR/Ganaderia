// Dashboard Ganadería — Francisco Cordero · v1.1
const { useState, useMemo, useEffect, useRef, useCallback, Fragment } = React;

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => (n ?? 0).toLocaleString('es-MX');
const pct = (n, total) => total === 0 ? '0' : Math.round((n / total) * 100);

const parseRanchDate = (str) => {
  if (!str || str === 'N/A') return null;
  const m = str.match(/(\d{4})|(?:\d{1,2})[-/](?:\d{1,2})[-/](\d{2,4})/);
  if (!m) return null;
  if (m[1]) return +m[1];
  if (m[2]) { const y = +m[2]; return y < 100 ? y + 2000 : y; }
  return null;
};

function formatDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const PELAJE_COLORS = {
  NEGRA: '#1a1410', NEGRO: '#1a1410',
  COLORADA: '#a13615', COLORADO: '#a13615',
  CASTAÑA: '#5a3a22', CASTAÑO: '#5a3a22', 'CASTANA': '#5a3a22', 'CASTANO': '#5a3a22',
  MULATA: '#3d2818', MULATO: '#3d2818',
  BURRACA: '#2a2218', BURRACO: '#2a2218',
  JABONERA: '#e8dcc0', JABONERO: '#e8dcc0',
  CHORREADA: '#8a4a28', CHORREADO: '#8a4a28',
  ENSABANADA: '#f0e6cf', ENSABANADO: '#f0e6cf',
  MELOCOTON: '#d28a4a',
  ALBAHIO: '#c9b886',
};
const pelajeColor = (p) => PELAJE_COLORS[(p||'').toUpperCase()] || '#9c8e7e';

const GRADE_INFO = {
  'MB': { label: 'Muy Bien',  color: '#1e5a2a', bg: '#d4e4cf', score: 5 },
  '+B': { label: 'Bien +',    color: '#3b4a2e', bg: '#dde2cb', score: 4 },
  'B':  { label: 'Bien',      color: '#5a6b3a', bg: '#e2e6cf', score: 3 },
  '+R': { label: 'Regular +', color: '#7a5a1a', bg: '#ebdfb6', score: 2 },
  'R':  { label: 'Regular',   color: '#8a5a18', bg: '#ebd4a8', score: 1 },
  '-R': { label: 'Regular -', color: '#a04515', bg: '#ecc89a', score: 0 },
  '-B': { label: 'Bien -',    color: '#3b4a2e', bg: '#dde2cb', score: 4 },
  'S':  { label: 'Superior',  color: '#8E1A10', bg: '#f0c6c0', score: 6 },
  'M':  { label: 'Mala',      color: '#8E1A10', bg: '#f0c6c0', score: -2 },
};
const gradeOrder = ['S','MB','+B','B','-B','+R','R','-R','M'];

// ── BrandLogo ─────────────────────────────────────────────────────────────────
function BrandLogo({ stroke = '#1a1410', size = 30 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none">
      <line x1="38" y1="8" x2="38" y2="78" stroke={stroke} strokeWidth="6" strokeLinecap="round"/>
      <path d="M38 8 H68 a18 18 0 0 1 0 36 H38" stroke={stroke} strokeWidth="6" fill="none" strokeLinejoin="round"/>
      <line x1="38" y1="36" x2="60" y2="36" stroke={stroke} strokeWidth="5"/>
      <path d="M10 78 C 22 92, 40 92, 48 82 S 70 70, 80 82" stroke={stroke} strokeWidth="6" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// ── NavIcon ───────────────────────────────────────────────────────────────────
function NavIcon({ name }) {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch(name) {
    case 'home': return <svg {...props}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>;
    case 'list': return <svg {...props}><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>;
    case 'tree': return <svg {...props}><circle cx="12" cy="4" r="2"/><circle cx="5" cy="20" r="2"/><circle cx="19" cy="20" r="2"/><path d="M12 6v6M12 12L5 18M12 12l7 6"/></svg>;
    case 'star': return <svg {...props}><polygon points="12 3 14.5 9 21 9.5 16 14 17.5 21 12 17.5 6.5 21 8 14 3 9.5 9.5 9"/></svg>;
    default: return null;
  }
}

// ── DataVersion ───────────────────────────────────────────────────────────────
// Lee la fecha y conteo de animales directamente del comentario en data.js
// Formato esperado: // data.js — Actualizado: 12/05/2026 10:39 · 204 animales
function DataVersion() {
  const info = useMemo(() => {
    const scripts = document.querySelectorAll('script[src="data.js"]');
    // Intentar leer del comentario embebido en window.RANCH_DATA si existe
    // o parsear desde la variable global
    const raw = window.RANCH_DATA;
    if (!raw) return null;
    // Buscar en el source del script via fetch no es viable en static,
    // así que derivamos la info directamente de los datos
    const n = raw.length;
    // Intentar obtener fecha del primer registro con UltimaCria o usar fecha actual
    return { animales: n };
  }, []);

  // Extraer fecha del comentario del script cargado
  const [version, setVersion] = useState(null);
  useEffect(() => {
    fetch('data.js')
      .then(r => r.text())
      .then(txt => {
        const match = txt.match(/Actualizado:\s*([^\n·]+)/);
        if (match) {
          const v = match[1].trim();
          setVersion(v);
          window._dataVersion = v;
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{
      padding: '14px 16px 10px',
      borderTop: '1px solid rgba(239,231,214,0.08)',
      marginTop: 8,
    }}>
      <div style={{
        fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'rgba(230,220,198,0.35)', marginBottom: 6,
      }}>
        Base de datos
      </div>
      <div style={{
        fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
        color: 'rgba(230,220,198,0.55)', lineHeight: 1.6,
      }}>
        {version
          ? <><span style={{color:'rgba(154,184,122,0.8)'}}>✓</span> {version}</>
          : <span style={{color:'rgba(230,220,198,0.3)'}}>—</span>
        }
        {info && (
          <div style={{color:'rgba(230,220,198,0.35)', marginTop: 2}}>
            {info.animales} animales
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'resumen',    label: 'Resumen',    icon: 'home' },
  { id: 'inventario', label: 'Inventario', icon: 'list' },
  { id: 'genealogia', label: 'Genealogía', icon: 'tree' },
  { id: 'tienta',     label: 'Tienta',     icon: 'star' },
];

function Sidebar({ active, onNav, counts, lastUpdated }) {
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="logo-flag">
          <div className="flag-red"></div>
          <div className="flag-white"></div>
          <img src="logo.jpg" alt="La Placeta" className="logo-img"/>
        </div>
        <div>
          <h1>Rancho<br/>La Placeta</h1>
          <div className="sub">San Luis de la Paz · GTO</div>
        </div>
      </div>
      <div className="sb-section-label">Análisis</div>
      <nav className="sb-nav">
        {NAV.map(n => (
          <button
            key={n.id}
            className={`sb-nav-item ${active === n.id ? 'active' : ''}`}
            onClick={() => onNav(n.id)}
          >
            <span className="ico"><NavIcon name={n.icon}/></span>
            <span>{n.label}</span>
            {counts[n.id] != null && <span className="count">{counts[n.id]}</span>}
          </button>
        ))}
      </nav>
      <div className="sb-section-label" style={{marginTop: 26}}>Reportes</div>
      <nav className="sb-nav">
        <button className="sb-nav-item">
          <span className="ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg></span>
          Exportar PDF
        </button>
        <button className="sb-nav-item">
          <span className="ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
          Histórico
        </button>
      </nav>
      <DataVersion />
      <div className="sb-footer">
        Francisco Cordero<br/>
        v 1.1
      </div>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ section, search, setSearch }) {
  const titles = {
    resumen:    { t: 'Resumen General', s: 'Panorama del hato · indicadores clave' },
    inventario: { t: 'Inventario',      s: 'Listado completo y filtros' },
    genealogia: { t: 'Genealogía',      s: 'Líneas de sangre y descendencia' },
    tienta:     { t: 'Tienta',          s: 'Comportamiento y calificaciones' },
  };
  const cur = titles[section];
  return (
    <header className="topbar">
      <div className="topbar-title">
        {cur.t}
        <span className="sub">{cur.s}</span>
      </div>
      <div className="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B5E51" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
        <input
          placeholder="Buscar por arete, nombre, padre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="kbd">⌘K</span>
      </div>
    </header>
  );
}

// ── FilterBar ─────────────────────────────────────────────────────────────────
function FilterBar({ filters, setFilters, hidden, totalFiltered, total }) {
  const items = Object.entries(filters).filter(([k,v]) => v != null && v !== '' && !hidden?.includes(k));
  if (items.length === 0) {
    return (
      <div className="filterbar">
        <span className="filterbar-label">Filtros activos</span>
        <span className="chip muted" style={{fontStyle:'italic'}}>Sin filtros · mostrando todo el hato</span>
        <span style={{marginLeft:'auto'}} className="mono eyebrow">{fmt(totalFiltered)} / {fmt(total)} animales</span>
      </div>
    );
  }
  return (
    <div className="filterbar">
      <span className="filterbar-label">Filtros</span>
      {items.map(([k, v]) => {
        const labels = { sex:'Sexo', pelaje:'Pelaje', year:'Año', padre:'Padre', madre:'Madre', tentados:'Estado', ageBucket:'Edad' };
        return (
          <span key={k} className="chip">
            <span className="muted">{labels[k]||k}:</span> <strong>{v}</strong>
            <button className="x" onClick={() => setFilters(f => ({ ...f, [k]: null }))}>×</button>
          </span>
        );
      })}
      <button className="chip-clear" onClick={() => setFilters({})}>Limpiar todo ×</button>
      <span style={{marginLeft: 16}} className="mono eyebrow">{fmt(totalFiltered)} / {fmt(total)}</span>
    </div>
  );
}

// ── KPIRow ────────────────────────────────────────────────────────────────────
function KPIRow({ data, allData, onFilter, currentYear }) {
  const total    = data.length;
  const hembras  = data.filter(d => d.S === 'H').length;
  const machos   = data.filter(d => d.S === 'M').length;
  const nacidosAnio = data.filter(d => +d.AñoN === currentYear).length;
  const nacidosPrev = allData.filter(d => +d.AñoN === currentYear - 1).length;
  const delta    = nacidosAnio - nacidosPrev;

  const edades   = data.map(d => parseFloat(d.Edad)).filter(n => !isNaN(n));
  const edadAvg  = edades.length ? (edades.reduce((a,b)=>a+b,0) / edades.length) : 0;

  const tcrsHembras = data.filter(d => d.S === 'H').map(d => parseInt(d.TCrs, 10)).filter(n => !isNaN(n));
  const tcrsAvg  = tcrsHembras.length ? (tcrsHembras.reduce((a,b)=>a+b,0) / tcrsHembras.length) : 0;
  const reproductivas = data.filter(d => { const a = parseFloat(d.Edad); return d.S === 'H' && !isNaN(a) && a >= 3 && a < 14; }).length;

  return (
    <div className="kpi-row">
      <div className="kpi kpi-hero">
        <div className="kpi-label">Inventario total</div>
        <div className="kpi-value">{fmt(total)}<span className="unit">animales</span></div>
        <div className="kpi-foot"><span className="mono" style={{color:'#FF330D'}}>●</span> En el hato · {fmt(total)} cabezas</div>
      </div>
      {(() => {
        const onlyH = total > 0 && machos === 0;
        const onlyM = total > 0 && hembras === 0;
        const hPct = pct(hembras, total);
        const mPct = pct(machos, total);
        return (
          <div className="kpi" style={{cursor:'pointer'}} onClick={() => onFilter('sex', null, 'cycle')}>
            <div className="kpi-label">Distribución por sexo <span style={{color:'var(--ink-4)', fontSize: 9, marginLeft: 4}}>→ click para alternar</span></div>
            <div className="kpi-value sex-split-value">
              <span style={{color:'var(--red)', opacity: onlyM ? 0.35 : 1}}>{hPct}<span className="sex-pct">%</span><span className="sex-tag">H</span></span>
              <span className="sex-sep">/</span>
              <span style={{color:'var(--ink)', opacity: onlyH ? 0.35 : 1}}>{mPct}<span className="sex-pct">%</span><span className="sex-tag">M</span></span>
            </div>
            <div className="split-bar">
              <div style={{background:'var(--red)', width: `${hPct}%`}}/>
              <div style={{background:'var(--ink)', width: `${mPct}%`}}/>
            </div>
            <div className="split-legend">
              <span style={{opacity: onlyM ? 0.4 : 1}}>♀ {hembras} hembras</span>
              <span style={{opacity: onlyH ? 0.4 : 1}}>♂ {machos} machos</span>
            </div>
          </div>
        );
      })()}
      <div className="kpi">
        <div className="kpi-label">Nacidos {currentYear}</div>
        <div className="kpi-value">{fmt(nacidosAnio)}<span className="unit">becerros</span></div>
        <div className="kpi-foot">
          {delta >= 0
            ? <><span style={{color:'var(--green)'}}>▲ +{delta}</span> vs {currentYear-1} ({nacidosPrev})</>
            : <><span style={{color:'var(--red)'}}>▼ {delta}</span> vs {currentYear-1} ({nacidosPrev})</>
          }
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Edad promedio</div>
        <div className="kpi-value">{edadAvg.toFixed(1)}<span className="unit">años</span></div>
        <div className="kpi-foot">{edades.length} animales con edad registrada</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Crías por madre</div>
        <div className="kpi-value">{tcrsAvg.toFixed(1)}<span className="unit">prom.</span></div>
        <div className="kpi-foot">{reproductivas} hembras en edad reproductiva</div>
      </div>
    </div>
  );
}

// ── NacimientosChart ──────────────────────────────────────────────────────────
function NacimientosChart({ data, onYearClick, selectedYear }) {
  const byYear = {};
  data.forEach(d => { if (d.AñoN) byYear[d.AñoN] = (byYear[d.AñoN]||0)+1; });
  const years = Object.keys(byYear).map(Number).sort((a,b)=>a-b);
  if (years.length === 0) return <div className="tbl-empty">Sin datos</div>;
  const minY = Math.min(...years), maxY = Math.max(...years);
  const allYears = [];
  for (let y = minY; y <= maxY; y++) allYears.push(y);
  const max = Math.max(...Object.values(byYear));
  const tickMax = Math.ceil(max/5)*5 || 5;
  const W = 720, H = 240, PADL = 36, PADR = 12, PADT = 18, PADB = 40;
  const innerW = W - PADL - PADR;
  const innerH = H - PADT - PADB;
  const bw = innerW / allYears.length;
  const yTicks = [0, Math.round(tickMax/2), tickMax];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:'auto'}}>
      {yTicks.map(t => {
        const y = PADT + innerH - (t/tickMax)*innerH;
        return (
          <g key={t}>
            <line x1={PADL} y1={y} x2={W-PADR} y2={y} stroke="#C8B89A" strokeWidth="0.5" strokeDasharray={t===0?'':'2 3'}/>
            <text className="axis-label" x={PADL-6} y={y+3} textAnchor="end">{t}</text>
          </g>
        );
      })}
      {allYears.map((y, i) => {
        const v = byYear[y] || 0;
        const h = (v/tickMax) * innerH;
        const x = PADL + i * bw + bw*0.15;
        const w = bw*0.7;
        const yPos = PADT + innerH - h;
        const selected = selectedYear === y;
        return (
          <g key={y} style={{cursor:'pointer'}} onClick={() => onYearClick(y)}>
            <rect x={PADL + i*bw} y={PADT} width={bw} height={innerH} fill="transparent"/>
            <rect
              x={x} y={yPos} width={w} height={Math.max(h, v > 0 ? 2 : 0)}
              fill={selected ? '#FF330D' : (v > 0 ? '#1A1410' : 'transparent')}
              opacity={selectedYear && !selected ? 0.25 : 1}
            />
            <text className="axis-label" x={x + w/2} y={H-PADB+14} textAnchor="middle" style={{fontSize: 9.5}}>{y}</text>
            {selected && (
              <text x={x + w/2} y={yPos - 5} textAnchor="middle" className="bar-value" fill="#FF330D">{v}</text>
            )}
          </g>
        );
      })}
      <line x1={PADL} y1={PADT+innerH} x2={W-PADR} y2={PADT+innerH} stroke="#1A1410" strokeWidth="1"/>
    </svg>
  );
}

// ── PelajeChart ───────────────────────────────────────────────────────────────
function PelajeChart({ data, onClick, selected }) {
  const byPelaje = {};
  data.forEach(d => {
    const p = (d['Pinta/Pelaje']||'').toUpperCase();
    if (!p) return;
    byPelaje[p] = (byPelaje[p]||0)+1;
  });
  const families = {};
  Object.entries(byPelaje).forEach(([k,v]) => {
    const fam = k.endsWith('O') ? k.slice(0,-1)+'A' : k;
    families[fam] = (families[fam]||0) + v;
  });
  const entries = Object.entries(families).sort((a,b)=>b[1]-a[1]).slice(0,9);
  const max = Math.max(...entries.map(e=>e[1]));
  return (
    <div className="hbar-list">
      {entries.map(([p, n]) => {
        const isSel = selected === p;
        return (
          <div key={p} className="hbar" onClick={()=>onClick(p)} style={{cursor:'pointer'}}>
            <div className="hbar-label">
              <span className="pelaje-swatch">
                <span className="pelaje-dot" style={{background: pelajeColor(p)}}/>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </span>
            </div>
            <div className="hbar-track">
              <div className="hbar-fill" style={{
                width: `${(n/max)*100}%`,
                background: isSel ? 'var(--red)' : pelajeColor(p),
                opacity: selected && !isSel ? 0.35 : 1,
              }}/>
            </div>
            <div className="hbar-value">{n}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── AgePyramid ────────────────────────────────────────────────────────────────
function AgePyramid({ data }) {
  const buckets = [
    { label: '0–1',  min: 0,  max: 1   },
    { label: '1–3',  min: 1,  max: 3   },
    { label: '3–5',  min: 3,  max: 5   },
    { label: '5–8',  min: 5,  max: 8   },
    { label: '8–12', min: 8,  max: 12  },
    { label: '12+',  min: 12, max: 999 },
  ];
  const rows = buckets.map(b => {
    const inB = data.filter(d => { const age = parseFloat(d.Edad); return !isNaN(age) && age >= b.min && age < b.max; });
    return { label: b.label, h: inB.filter(d => d.S === 'H').length, m: inB.filter(d => d.S === 'M').length };
  });
  const maxSide = Math.max(...rows.flatMap(r => [r.h, r.m]), 1);
  const tickMax = Math.ceil(maxSide / 5) * 5 || 5;
  const ticks = [0, Math.round(tickMax/2), tickMax];
  return (
    <div className="pyramid">
      <div className="pyramid-head">
        <div className="pyramid-head-side left"><span className="pyramid-dot" style={{background:'var(--red)'}}></span>Hembras</div>
        <div className="pyramid-head-center">Años</div>
        <div className="pyramid-head-side right">Machos<span className="pyramid-dot" style={{background:'var(--ink)'}}></span></div>
      </div>
      <div className="pyramid-body">
        {rows.map((r) => (
          <div key={r.label} className="pyramid-row">
            <div className="pyramid-side left">
              <span className="pyramid-num">{r.h}</span>
              <div className="pyramid-track">
                <div className="pyramid-fill" style={{ width: `${(r.h/tickMax)*100}%`, background:'var(--red)' }}/>
              </div>
            </div>
            <div className="pyramid-label">{r.label}</div>
            <div className="pyramid-side right">
              <div className="pyramid-track">
                <div className="pyramid-fill" style={{ width: `${(r.m/tickMax)*100}%`, background:'var(--ink)' }}/>
              </div>
              <span className="pyramid-num">{r.m}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="pyramid-axis">
        {ticks.slice().reverse().map(t => <span key={'l'+t}>{t}</span>)}
        <span style={{visibility:'hidden'}}>·</span>
        {ticks.map(t => <span key={'r'+t}>{t}</span>)}
      </div>
      <div className="pyramid-foot">
        <span className="pyramid-foot-stat"><strong>{rows.reduce((s,r)=>s+r.h,0)}</strong> hembras</span>
        <span className="pyramid-foot-stat"><strong>{rows.reduce((s,r)=>s+r.m,0)}</strong> machos</span>
      </div>
    </div>
  );
}

// ── TopSementales ─────────────────────────────────────────────────────────────
function TopSementales({ data, onSelect, selected }) {
  const counts = {};
  data.forEach(d => { if (d.Padre) counts[d.Padre] = (counts[d.Padre]||0)+1; });
  const ranked = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, 7);
  const max = Math.max(...ranked.map(r=>r[1]), 1);
  return (
    <div className="hbar-list">
      {ranked.map(([padre, n], idx) => (
        <div key={padre} className="hbar" onClick={()=>onSelect(padre)} style={{cursor:'pointer'}}>
          <div className="hbar-label" style={{display:'flex', alignItems:'center', gap: 8}}>
            <span className="mono hbar-idx" style={{fontSize: 10, width: 16}}>{String(idx+1).padStart(2,'0')}</span>
            <span className="mono hbar-id" style={{fontSize: 12}}>{padre}</span>
          </div>
          <div className="hbar-track">
            <div className="hbar-fill red" style={{width: `${(n/max)*100}%`, opacity: selected===padre ? 1 : 0.85}}/>
          </div>
          <div className="hbar-value"><strong className="hbar-strong">{n}</strong> hijos</div>
        </div>
      ))}
    </div>
  );
}

// ── GradeDistribution ─────────────────────────────────────────────────────────
function GradeDistribution({ data, field='TC', onCellClick, selectedGrade }) {
  const counts = {};
  data.forEach(d => { if (d[field]) counts[d[field]] = (counts[d[field]]||0)+1; });
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  const maxN = Math.max(1, ...Object.values(counts));
  return (
    <div className="grade-distrib-v2">
      <div className="gd-grid">
        {gradeOrder.map(g => {
          const info = GRADE_INFO[g];
          const n = counts[g] || 0;
          const p = total ? Math.round((n/total)*100) : 0;
          const isSel = selectedGrade === g;
          const clickable = onCellClick && n > 0;
          const barH = n > 0 ? Math.max(6, (n/maxN)*44) : 0;
          return (
            <div
              key={g}
              className={`gd-cell-v2 ${isSel ? 'sel' : ''} ${n===0 ? 'empty' : ''}`}
              onClick={clickable ? () => onCellClick(g) : undefined}
              style={{
                '--gc': info.color, '--gbg': info.bg,
                cursor: clickable ? 'pointer' : 'default',
                opacity: selectedGrade && !isSel && n>0 ? 0.55 : 1,
              }}
            >
              <div className="gd-cell-bar" style={{height: barH, background: n>0 ? info.color : 'transparent'}}/>
              <div className="gd-cell-body">
                <span className="gd-g">{g}</span>
                <span className="gd-n">{n}</span>
                <span className="gd-p">{n > 0 ? `${p}%` : '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GradeLegend ───────────────────────────────────────────────────────────────
function GradeLegend() {
  const grades = [
    { key: 'S',  name: 'Superior' },
    { key: 'MB', name: 'Muy bueno' },
    { key: 'B',  name: 'Bueno',   mods: '+B / B / −B' },
    { key: 'R',  name: 'Regular', mods: '+R / R / −R' },
    { key: 'M',  name: 'Malo' },
  ];
  return (
    <div className="gd-legend">
      {grades.map(({ key, name, mods }) => (
        <div key={key} className="gl-item">
          <span className="gl-dot" style={{
            background: GRADE_INFO[key].bg, color: GRADE_INFO[key].color,
            border: `1px solid ${GRADE_INFO[key].color}`,
          }}>{key}</span>
          <span className="gl-name">{name}</span>
          {mods && <span className="gl-mods">{mods}</span>}
        </div>
      ))}
    </div>
  );
}

// ── AnimalTable ───────────────────────────────────────────────────────────────
function AnimalTable({ data, onRowClick, sort, setSort, columns }) {
  const cols = columns || ['arete', 'nombre', 'sex', 'year', 'edad', 'pelaje', 'padre', 'madre', 'tienta'];
  const sortKey = sort?.key, sortDir = sort?.dir;
  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const get = {
      arete:  d => +d['#Reg'] || 9999,
      nombre: d => d.Nombre || '',
      sex:    d => d.S || '',
      year:   d => +d.AñoN || 0,
      edad:   d => parseFloat(d.Edad) || 0,
      pelaje: d => d['Pinta/Pelaje'] || '',
      padre:  d => d.Padre || '',
      madre:  d => d.Madre || '',
      tienta: d => d.FechTienta || '',
    }[sortKey] || (() => '');
    return [...data].sort((a,b) => {
      const va = get(a), vb = get(b);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const setSortCol = k => setSort(s => s?.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' });
  const arrow = k => sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '';

  if (sorted.length === 0) return <div className="tbl-wrap"><div className="tbl-empty">Ningún animal coincide con los filtros aplicados.</div></div>;

  const headers = { arete: '#Reg', nombre: 'Nombre', sex: 'S', year: 'Año', edad: 'Edad', pelaje: 'Pelaje', padre: 'Padre', madre: 'Madre', tienta: 'Tienta' };
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>{cols.map(c => <th key={c} className="sortable" onClick={() => setSortCol(c)}>{headers[c]} {arrow(c)}</th>)}</tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => (
            <tr key={i} onClick={() => onRowClick(d)} style={{cursor:'pointer'}}>
              {cols.includes('arete')  && <td className="mono">{d['#Reg'] || '—'}</td>}
              {cols.includes('nombre') && <td className="font-display" style={{fontSize:15}}>{d.Nombre || '—'}</td>}
              {cols.includes('sex')    && <td><span className={`sex-pill sex-${d.S}`}>{d.S}</span></td>}
              {cols.includes('year')   && <td className="mono">{d.AñoN || '—'}</td>}
              {cols.includes('edad')   && <td className="mono">{d.Edad ? `${d.Edad} a` : '—'}</td>}
              {cols.includes('pelaje') && <td><span className="pelaje-swatch"><span className="pelaje-dot" style={{background: pelajeColor(d['Pinta/Pelaje'])}}/>{d['Pinta/Pelaje'] || '—'}</span></td>}
              {cols.includes('padre')  && <td className="mono" style={{fontSize: 11}}>{d.Padre || '—'}</td>}
              {cols.includes('madre')  && <td className="mono" style={{fontSize: 11}}>{d.Madre || '—'}</td>}
              {cols.includes('tienta') && (
                <td>
                  {d.TC || d.TP ? (
                    <span style={{display:'inline-flex', gap: 4}}>
                      {d.TC && <span className="grade" style={{background: GRADE_INFO[d.TC]?.bg, color: GRADE_INFO[d.TC]?.color}}>{d.TC}</span>}
                      {d.TP && <span className="grade" style={{background: GRADE_INFO[d.TP]?.bg, color: GRADE_INFO[d.TP]?.color}}>{d.TP}</span>}
                    </span>
                  ) : <span className="muted">—</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── AnimalModal ───────────────────────────────────────────────────────────────
function AnimalModal({ animal, onClose, allData, onSelectAnimal }) {
  if (!animal) return null;
  const idGuess    = animal['#Reg'] && animal.AñoN ? `${animal['#Reg']} C ${animal.AñoN}` : null;
  const hijos      = allData.filter(d => d.Padre === idGuess || d.Madre === idGuess);
  const padreAnimal = allData.find(d => `${d['#Reg']} C ${d.AñoN}` === animal.Padre);
  const madreAnimal = allData.find(d => `${d['#Reg']} C ${d.AñoN}` === animal.Madre);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-hero">
          <div className="arete-stripe" style={{background: pelajeColor(animal['Pinta/Pelaje'])}}/>
          <div style={{display:'flex', alignItems:'baseline', gap: 16, flexWrap:'wrap'}}>
            <h3>{animal.Nombre || 'Sin nombre'}</h3>
            <span className={`sex-pill sex-${animal.S}`} style={{width: 28, height: 28, fontSize: 12}}>{animal.S}</span>
          </div>
          <div className="subline">
            #Reg {animal['#Reg'] || '—'} · {animal.AñoN || '—'} · {animal['Pinta/Pelaje'] || '—'}
            {animal.Arete ? ` · arete ${animal.Arete}` : ''}
          </div>
        </div>

        <div className="modal-grid">
          <div className="modal-section">
            <div className="modal-section-title">Identificación</div>
            <dl className="dl-grid">
              <dt>Nombre</dt><dd className="font-display" style={{fontSize: 18}}>{animal.Nombre || '—'}</dd>
              <dt>#Reg</dt><dd className="mono">{animal['#Reg'] || '—'}</dd>
              <dt>Arete</dt><dd className="mono">{animal.Arete || '—'}</dd>
              <dt>Sexo</dt><dd>{animal.S === 'H' ? 'Hembra' : 'Macho'}</dd>
              <dt>Año nac.</dt><dd className="mono">{animal.AñoN || '—'}</dd>
              <dt>Edad</dt><dd className="mono">{animal.Edad || '—'} años</dd>
              <dt>Pelaje</dt><dd><span className="pelaje-swatch"><span className="pelaje-dot" style={{background: pelajeColor(animal['Pinta/Pelaje'])}}/>{animal['Pinta/Pelaje'] || '—'}</span></dd>
              <dt>Fecha herra</dt><dd className="mono">{animal.FechaHerra || '—'}</dd>
              <dt>Propietario</dt><dd>{animal['Ganaderia propietaria'] || '—'}</dd>
              <dt>Última cría</dt><dd className="mono">{animal.UltimaCria || '—'}</dd>
            </dl>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">Tienta</div>
            {animal.FechTienta ? (
              <>
                <div style={{fontSize: 12, color:'var(--ink-3)', marginBottom: 10}}>
                  Tentado el <span className="mono" style={{color:'var(--ink)'}}>{animal.FechTienta}</span>
                </div>
                <div className="tienta-grid">
                  {['TC','TP','LC','LP'].map(f => (
                    <div key={f} className="tienta-cell">
                      <div className="lbl">{f}</div>
                      {animal[f]
                        ? <span className="grade" style={{background: GRADE_INFO[animal[f]]?.bg, color: GRADE_INFO[animal[f]]?.color}}>{animal[f]}</span>
                        : <span className="muted" style={{fontSize: 12}}>—</span>
                      }
                    </div>
                  ))}
                </div>
                <div style={{fontSize: 11, color:'var(--ink-3)', marginTop: 10, lineHeight: 1.5, fontStyle:'italic'}}>
                  TC: tienta a capote · TP: tienta de puyazo · LC/LP: lidia capote/puyazo
                </div>
              </>
            ) : (
              <div className="muted" style={{fontStyle:'italic', padding:'12px 0'}}>Sin registro de tienta</div>
            )}
            <div style={{marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--rule-soft)'}}>
              <div className="modal-section-title">Métricas</div>
              <dl className="dl-grid">
                <dt>TCrs</dt><dd className="mono">{animal.TCrs || '0'} crías totales</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-section-title">Genealogía</div>
          <div className="tree">
            <div className="tree-row">
              <div className="lbl">Padre</div>
              {padreAnimal ? (
                <div className="tree-card" onClick={() => onSelectAnimal(padreAnimal)}>
                  <span className="sex-pill sex-M">M</span>
                  <div><div className="name">{padreAnimal.Nombre}</div><div className="id">{animal.Padre}</div></div>
                </div>
              ) : animal.Padre ? (
                <div className="tree-card" style={{cursor:'default'}}>
                  <span className="sex-pill sex-M">M</span>
                  <div className="id">{animal.Padre} <span className="muted">· fuera del hato</span></div>
                </div>
              ) : <div className="tree-card empty" style={{cursor:'default'}}>Sin registro</div>}
            </div>
            <div className="tree-row">
              <div className="lbl">Madre</div>
              {madreAnimal ? (
                <div className="tree-card" onClick={() => onSelectAnimal(madreAnimal)}>
                  <span className="sex-pill sex-H">H</span>
                  <div><div className="name">{madreAnimal.Nombre}</div><div className="id">{animal.Madre}</div></div>
                </div>
              ) : animal.Madre ? (
                <div className="tree-card" style={{cursor:'default'}}>
                  <span className="sex-pill sex-H">H</span>
                  <div className="id">{animal.Madre} <span className="muted">· fuera del hato</span></div>
                </div>
              ) : <div className="tree-card empty" style={{cursor:'default'}}>Sin registro</div>}
            </div>
            <div className="tree-row">
              <div className="lbl">Descendencia<br/><span className="mono" style={{fontSize:9, letterSpacing:'0.1em', color:'var(--ink-4)'}}>{hijos.length} registrados</span></div>
              <div>
                {hijos.length > 0 ? (
                  <div className="tree-children">
                    {hijos.map((h, i) => (
                      <div key={i} className="tree-child" onClick={() => onSelectAnimal(h)}>
                        <span className={`sex-pill sex-${h.S}`} style={{width: 18, height: 18, fontSize: 9}}>{h.S}</span>
                        <div>
                          <div className="name">{h.Nombre}</div>
                          <div className="id mono" style={{fontSize: 10, color:'var(--ink-3)'}}>{h['#Reg']} · {h.AñoN}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="tree-card empty" style={{cursor:'default'}}>Sin descendencia registrada</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════════════════════
function App() {
  const [section, setSection]             = useState('resumen');
  const [search, setSearch]               = useState('');
  const [filters, setFilters]             = useState({});
  const [selected, setSelected]           = useState(null);
  const [sort, setSort]                   = useState({ key: 'year', dir: 'desc' });
  const [highlightYear, setHighlightYear] = useState(null);
  const [lastUpdated, setLastUpdated]     = useState(
    () => localStorage.getItem('ultima_actualizacion') || formatDate(new Date())
  );

  // Excluye animales con AñoN < 2010 (foco en hato activo; ajusta el umbral si necesitas histórico)
  const allData = useMemo(() => window.RANCH_DATA.filter(d => !d.AñoN || +d.AñoN >= 2010), []);

  const currentYear = useMemo(() => {
    const years = allData.map(d => +d.AñoN).filter(y => !isNaN(y) && y > 0);
    return years.length ? Math.max(...years) : new Date().getFullYear();
  }, [allData]);

  const data = useMemo(() => {
    let out = allData;
    if (filters.sex) out = out.filter(d => d.S === (filters.sex === 'Hembras' ? 'H' : filters.sex === 'Machos' ? 'M' : filters.sex));
    if (filters.pelaje) {
      const fam = filters.pelaje.toUpperCase();
      out = out.filter(d => {
        const p = (d['Pinta/Pelaje']||'').toUpperCase();
        const norm = s => s.endsWith('A') || s.endsWith('O') ? s.slice(0,-1) : s;
        return norm(fam) === norm(p);
      });
    }
    if (filters.year)     out = out.filter(d => +d.AñoN === +filters.year);
    if (filters.padre)    out = out.filter(d => d.Padre === filters.padre);
    if (filters.madre)    out = out.filter(d => d.Madre === filters.madre);
    if (filters.tcGrade)  out = out.filter(d => d.TC === filters.tcGrade);
    if (filters.tpGrade)  out = out.filter(d => d.TP === filters.tpGrade);
    if (filters.tentados === 'Tentados')   out = out.filter(d => d.FechTienta && d.FechTienta !== 'N/A');
    if (filters.tentados === 'Sin tentar') out = out.filter(d => !d.FechTienta || d.FechTienta === 'N/A');
    if (filters.ageBucket) {
      out = out.filter(d => {
        const age = parseFloat(d.Edad);
        if (isNaN(age)) return false;
        const [min, max] = filters.ageBucket.split('-').map(Number);
        return age >= min && age < (max || 999);
      });
    }
    if (search) {
      const s = search.toLowerCase();
      out = out.filter(d =>
        (d.Nombre||'').toLowerCase().includes(s) ||
        (d.Arete||'').toLowerCase().includes(s) ||
        (d['#Reg']||'').toLowerCase().includes(s) ||
        (d.Padre||'').toLowerCase().includes(s) ||
        (d.Madre||'').toLowerCase().includes(s)
      );
    }
    return out;
  }, [allData, filters, search]);

  const counts = {
    resumen:    allData.length,
    inventario: data.length,
    genealogia: null,
    tienta:     allData.filter(d => d.FechTienta && d.FechTienta !== 'N/A').length,
  };

  const setFilter = (k, v, mode) => {
    if (mode === 'cycle' && k === 'sex') {
      setFilters(f => ({ ...f, sex: f.sex === 'H' ? 'M' : f.sex === 'M' ? null : 'H' }));
      return;
    }
    setFilters(f => ({ ...f, [k]: f[k] === v ? null : v }));
  };

  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); document.querySelector('.search input')?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app">
      <Sidebar
        active={section} onNav={setSection}
        counts={counts} lastUpdated={lastUpdated}
      />
      <div className="main">
        <Topbar section={section} search={search} setSearch={setSearch}/>
        <div className="content">
          {section === 'resumen' && (
            <ResumenPage
              data={data} allData={allData}
              filters={filters} setFilters={setFilters} setFilter={setFilter}
              onSelect={setSelected}
              highlightYear={highlightYear} setHighlightYear={setHighlightYear}
              currentYear={currentYear} lastUpdated={lastUpdated}
            />
          )}
          {section === 'inventario' && (
            <InventarioPage
              data={data} allData={allData}
              filters={filters} setFilters={setFilters} setFilter={setFilter}
              onSelect={setSelected} sort={sort} setSort={setSort}
            />
          )}
          {section === 'genealogia' && (
            <GenealogiaPage
              data={data} allData={allData}
              filters={filters} setFilters={setFilters} setFilter={setFilter}
              onSelect={setSelected}
            />
          )}
          {section === 'tienta' && (
            <TientaPage
              data={data} allData={allData}
              filters={filters} setFilters={setFilters} setFilter={setFilter}
              onSelect={setSelected} sort={sort} setSort={setSort}
              currentYear={currentYear}
            />
          )}
        </div>
      </div>
      {selected && (
        <AnimalModal
          animal={selected} onClose={() => setSelected(null)}
          allData={allData} onSelectAnimal={a => setSelected(a)}
        />
      )}
    </div>
  );
}

// ── ResumenPage ───────────────────────────────────────────────────────────────
function ResumenPage({ data, allData, filters, setFilters, setFilter, onSelect, highlightYear, setHighlightYear, currentYear, lastUpdated }) {
  const [tientaField, setTientaField] = useState('TP');

  const reportLabel = useMemo(() => {
    const today = new Date();
    const mes = today.toLocaleDateString('es-MX', { month: 'long' });
    return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${today.getFullYear()}`;
  }, []);

  const recentes = useMemo(() =>
    [...allData].filter(d => d.AñoN).sort((a,b) => (+b.AñoN) - (+a.AñoN) || (+b['#Reg']||0) - (+a['#Reg']||0)).slice(0, 8),
  [allData]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Reporte · {reportLabel}</div>
          <h2>Resumen del hato</h2>
        </div>
        <div className="meta">Última actualización · {window._dataVersion || lastUpdated} · {fmt(allData.length)} cabezas</div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} totalFiltered={data.length} total={allData.length}/>
      <KPIRow data={data} allData={allData} onFilter={setFilter} currentYear={currentYear}/>

      <div className="panels">
        <div className="panel" style={{gridColumn: 'span 8'}}>
          <div className="panel-head">
            <div><div className="panel-eyebrow">Nacimientos</div><h3 className="panel-title">Animales nacidos por año</h3></div>
            <button className="panel-action" onClick={() => { setHighlightYear(null); setFilter('year', null); }}>Reset</button>
          </div>
          <NacimientosChart data={allData} onYearClick={y => { setHighlightYear(y); setFilter('year', String(y)); }} selectedYear={highlightYear}/>
          <div className="mono eyebrow" style={{marginTop: 10}}>Haz clic en una barra para filtrar el año</div>
        </div>
        <div className="panel" style={{gridColumn: 'span 4'}}>
          <div className="panel-head"><div><div className="panel-eyebrow">Pelaje · Pinta</div><h3 className="panel-title">Capas del hato</h3></div></div>
          <PelajeChart data={data} onClick={p => setFilter('pelaje', p)} selected={filters.pelaje?.toUpperCase()}/>
        </div>
      </div>

      <div className="panels">
        <div className="panel" style={{gridColumn: 'span 4'}}>
          <div className="panel-head"><div><div className="panel-eyebrow">Distribución</div><h3 className="panel-title">Pirámide por edad</h3></div></div>
          <AgePyramid data={data}/>
        </div>
        <div className="panel dark" style={{gridColumn: 'span 5'}}>
          <div className="panel-head">
            <div><div className="panel-eyebrow">Línea genética</div><h3 className="panel-title">Ranking de sementales</h3></div>
            <button className="panel-action" style={{color: 'rgba(239,231,214,0.55)'}} onClick={() => setFilter('padre', null)}>Reset</button>
          </div>
          <TopSementales data={allData} selected={filters.padre} onSelect={p => setFilter('padre', p)}/>
        </div>
        <div className="panel" style={{gridColumn: 'span 3'}}>
          <div className="panel-head"><div><div className="panel-eyebrow">Recientes</div><h3 className="panel-title">Últimos nacimientos</h3></div></div>
          <div style={{display:'flex', flexDirection:'column', gap: 8}}>
            {recentes.map((r, i) => (
              <div key={i} onClick={() => onSelect(r)} style={{display:'flex', alignItems:'center', gap: 10, padding:'8px 0', borderBottom: i < recentes.length-1 ? '1px dashed var(--rule-soft)' : 'none', cursor:'pointer'}}>
                <span className={`sex-pill sex-${r.S}`} style={{width: 18, height: 18, fontSize: 9}}>{r.S}</span>
                <div style={{flex: 1, minWidth: 0}}>
                  <div className="font-display" style={{fontSize: 14, lineHeight: 1.1, color: 'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.Nombre}</div>
                  <div className="mono" style={{fontSize: 10, color:'var(--ink-3)'}}>{r.AñoN} · #{r['#Reg']}</div>
                </div>
                <span className="pelaje-dot" style={{background: pelajeColor(r['Pinta/Pelaje']), width: 10, height: 10}}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panels">
        <div className="panel" style={{gridColumn: 'span 7'}}>
          <div className="panel-head">
            <div><div className="panel-eyebrow">Calificación de tienta</div><h3 className="panel-title">Distribución {tientaField}</h3></div>
            <div className="seg-toggle">
              <button className={tientaField==='TP' ? 'on' : ''} onClick={() => setTientaField('TP')}>Muleta · TP</button>
              <button className={tientaField==='TC' ? 'on' : ''} onClick={() => setTientaField('TC')}>Caballo · TC</button>
            </div>
          </div>
          <GradeDistribution
            data={data} field={tientaField}
            selectedGrade={tientaField === 'TP' ? filters.tpGrade : filters.tcGrade}
            onCellClick={g => setFilter(tientaField === 'TP' ? 'tpGrade' : 'tcGrade', g)}
          />
          <GradeLegend/>
          <div style={{marginLeft:'auto', color:'var(--red)', fontStyle:'italic', fontSize: 11, textAlign:'right', marginTop: 4}}>
            Clic en una celda para listar
          </div>
          {(() => {
            const activeKey   = tientaField === 'TP' ? 'tpGrade' : 'tcGrade';
            const activeGrade = filters[activeKey];
            if (!activeGrade) return null;
            const matches = data.filter(d => d[tientaField] === activeGrade);
            return (
              <div style={{marginTop: 16, paddingTop: 14, borderTop:'1px dashed var(--rule-soft)'}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10}}>
                  <div className="eyebrow">Animales con {tientaField} = <span style={{color: GRADE_INFO[activeGrade]?.color, fontWeight:600, fontSize: 13}}>{activeGrade}</span> ({matches.length})</div>
                  <button className="panel-action" onClick={() => setFilter(activeKey, null)}>Cerrar ×</button>
                </div>
                <AnimalTable data={matches} onRowClick={onSelect} sort={{ key: 'year', dir: 'desc' }} setSort={() => {}} columns={['arete','nombre','sex','year','pelaje','padre','tienta']}/>
              </div>
            );
          })()}
        </div>
        <div className="panel" style={{gridColumn: 'span 5'}}>
          <div className="panel-head"><div><div className="panel-eyebrow">Herradero</div><h3 className="panel-title">Animales herrados</h3></div></div>
          <HerraderoMini data={allData}/>
        </div>
      </div>
    </>
  );
}

// ── HerraderoMini ─────────────────────────────────────────────────────────────
function HerraderoMini({ data }) {
  const byYear = {};
  data.forEach(d => {
    if (!d.FechaHerra) return;
    const yr = parseRanchDate(d.FechaHerra);
    if (yr) byYear[yr] = (byYear[yr]||0)+1;
  });
  const years = Object.keys(byYear).map(Number).sort((a,b)=>a-b);
  if (years.length === 0) {
    return (
      <div style={{padding:'20px 0'}}>
        <div className="muted" style={{fontStyle:'italic', fontSize: 13, marginBottom: 12}}>Pocos registros con fecha de herra en la base.</div>
        <div style={{padding: 14, background:'var(--paper-2)', border:'1px dashed var(--rule)', fontSize: 12, lineHeight: 1.5}}>
          <strong className="font-display" style={{fontSize: 14, display:'block', marginBottom: 6}}>Sugerencia</strong>
          Captura sistemáticamente <span className="mono" style={{background:'var(--paper)', padding:'1px 5px'}}>FechaHerra</span> en cada herra anual para tener trazabilidad del lote.
        </div>
      </div>
    );
  }
  const minY = Math.min(...years), maxY = Math.max(...years);
  const fullYears = [];
  for (let y = minY; y <= maxY; y++) fullYears.push(y);
  const max = Math.max(...years.map(y => byYear[y]));
  const tickMax = Math.ceil(max/5)*5 || 5;
  const ticks = [0, Math.round(tickMax/2), tickMax];
  const W = 460, H = 200, PADL = 30, PADR = 12, PADT = 18, PADB = 36;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  const bw = innerW / fullYears.length;
  const total = years.reduce((s,y)=>s+byYear[y], 0);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:'auto', display:'block'}}>
        {ticks.map(t => {
          const y = PADT + innerH - (t/tickMax)*innerH;
          return (
            <g key={t}>
              <line x1={PADL} y1={y} x2={W-PADR} y2={y} stroke="#C8B89A" strokeWidth="0.5" strokeDasharray={t===0?'':'2 3'}/>
              <text className="axis-label" x={PADL-6} y={y+3} textAnchor="end">{t}</text>
            </g>
          );
        })}
        {fullYears.map((y, i) => {
          const v = byYear[y] || 0;
          const h = (v/tickMax) * innerH;
          const x = PADL + i*bw + bw*0.18;
          const w = bw*0.64;
          const yPos = PADT + innerH - h;
          return (
            <g key={y}>
              <rect x={x} y={yPos} width={w} height={Math.max(h, v>0?2:0)} fill="#C8281A"/>
              {v > 0 && <text x={x + w/2} y={yPos - 4} textAnchor="middle" className="bar-value" fill="#1A1410">{v}</text>}
              <text className="axis-label" x={x + w/2} y={H-PADB+14} textAnchor="middle">{y}</text>
            </g>
          );
        })}
        <line x1={PADL} y1={PADT+innerH} x2={W-PADR} y2={PADT+innerH} stroke="#1A1410" strokeWidth="1"/>
      </svg>
      <div style={{display:'flex', justifyContent:'space-between', marginTop: 10, paddingTop: 10, borderTop:'1px dashed var(--rule-soft)', fontSize: 11, color:'var(--ink-3)'}}>
        <span><strong className="font-numeral" style={{fontSize: 16, color:'var(--ink)', marginRight: 4}}>{total}</strong> herrados totales</span>
        <span><strong className="font-numeral" style={{fontSize: 16, color:'var(--ink)', marginRight: 4}}>{years.length}</strong> temporada{years.length===1?'':'s'}</span>
      </div>
    </div>
  );
}

// ── InventarioPage ────────────────────────────────────────────────────────────
function InventarioPage({ data, allData, filters, setFilters, setFilter, onSelect, sort, setSort }) {
  const uniqueYears  = useMemo(() => [...new Set(allData.map(d => d.AñoN))].filter(Boolean).sort((a,b)=>+b-+a), [allData]);
  const uniquePadres = useMemo(() => [...new Set(allData.map(d => d.Padre))].filter(Boolean).sort(), [allData]);
  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Libro de campo</div><h2>Inventario del hato</h2></div>
        <div className="meta">{fmt(data.length)} de {fmt(allData.length)} animales</div>
      </div>
      <div style={{display:'flex', gap: 10, flexWrap:'wrap', alignItems:'center', marginBottom: 6}}>
        <span className="filterbar-label">Filtrar</span>
        <select className="select" value={filters.sex||''} onChange={e => setFilters(f => ({...f, sex: e.target.value||null}))}>
          <option value="">Sexo · todos</option>
          <option value="H">Hembras</option>
          <option value="M">Machos</option>
        </select>
        <select className="select" value={filters.year||''} onChange={e => setFilters(f => ({...f, year: e.target.value||null}))}>
          <option value="">Año · todos</option>
          {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="select" value={filters.padre||''} onChange={e => setFilters(f => ({...f, padre: e.target.value||null}))}>
          <option value="">Padre · todos</option>
          {uniquePadres.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="select" value={filters.tentados||''} onChange={e => setFilters(f => ({...f, tentados: e.target.value||null}))}>
          <option value="">Tienta · todos</option>
          <option value="Tentados">Tentados</option>
          <option value="Sin tentar">Sin tentar</option>
        </select>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} totalFiltered={data.length} total={allData.length}/>
      <AnimalTable data={data} onRowClick={onSelect} sort={sort} setSort={setSort}/>
    </>
  );
}

// ── GenealogiaPage ────────────────────────────────────────────────────────────
function GenealogiaPage({ data, allData, filters, setFilters, setFilter, onSelect }) {
  const padres = useMemo(() => {
    const counts = {};
    allData.forEach(d => { if (d.Padre) counts[d.Padre] = (counts[d.Padre]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  }, [allData]);

  const [picked, setPicked] = useState(padres[0]?.[0]);
  const pickedAnimal = useMemo(() => allData.find(d => `${d['#Reg']} C ${d.AñoN}` === picked), [allData, picked]);
  const hijos = useMemo(() => allData.filter(d => d.Padre === picked || d.Madre === picked), [allData, picked]);
  const hijosByYear = useMemo(() => {
    const g = {};
    hijos.forEach(h => { if (h.AñoN) (g[h.AñoN] = g[h.AñoN]||[]).push(h); });
    return Object.entries(g).sort((a,b)=>+b[0]-+a[0]);
  }, [hijos]);

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Líneas de sangre</div><h2>Genealogía</h2></div>
        <div className="meta">{padres.length} sementales · {fmt(allData.length)} cabezas</div>
      </div>
      <div className="panels">
        <div className="panel" style={{gridColumn: 'span 4'}}>
          <div className="panel-head"><div><div className="panel-eyebrow">Selecciona un padre</div><h3 className="panel-title">Sementales</h3></div></div>
          <div style={{display:'flex', flexDirection:'column', gap: 0, maxHeight: 580, overflowY: 'auto'}}>
            {padres.slice(0, 30).map(([id, n], i) => {
              const isSel = picked === id;
              const inData = allData.find(d => `${d['#Reg']} C ${d.AñoN}` === id);
              return (
                <button key={id} onClick={() => setPicked(id)} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 12px', textAlign:'left',
                  background: isSel ? 'var(--ink)' : 'var(--paper-2)',
                  color: isSel ? 'var(--paper)' : 'var(--ink)',
                  border:'none', borderBottom:'1px solid var(--rule-soft)',
                  cursor:'pointer', fontFamily:'IBM Plex Sans, sans-serif', fontSize: 12,
                }}>
                  <span style={{display:'flex', alignItems:'center', gap: 10}}>
                    <span className="mono" style={{fontSize: 10, color: isSel ? 'rgba(239,231,214,0.6)' : 'var(--ink-4)', width: 16}}>{String(i+1).padStart(2,'0')}</span>
                    <span>
                      {inData && <span className="font-display" style={{fontSize: 14, display:'block', color: isSel ? 'var(--paper)' : 'var(--ink)'}}>{inData.Nombre}</span>}
                      <span className="mono" style={{fontSize: 11, color: isSel ? 'rgba(239,231,214,0.6)' : 'var(--ink-3)'}}>{id}</span>
                    </span>
                  </span>
                  <span className="mono" style={{fontSize: 11, color: isSel ? 'var(--paper)' : 'var(--ink-2)'}}>{n} hijos</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="panel dark" style={{gridColumn: 'span 8'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Descendencia directa</div>
              <h3 className="panel-title">
                {pickedAnimal ? pickedAnimal.Nombre : picked}
                <span style={{display:'block', fontFamily:'JetBrains Mono, monospace', fontSize: 12, letterSpacing:'0.1em', color:'rgba(239,231,214,0.5)', marginTop: 4}}>
                  {picked} · {hijos.length} descendientes registrados
                </span>
              </h3>
            </div>
            {pickedAnimal && <button className="panel-action" style={{color:'rgba(239,231,214,0.7)'}} onClick={() => onSelect(pickedAnimal)}>Ver ficha →</button>}
          </div>
          {hijos.length === 0 ? (
            <div style={{padding:'40px 0', textAlign:'center', color:'rgba(239,231,214,0.55)', fontStyle:'italic'}}>Sin descendencia registrada</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap: 18}}>
              {hijosByYear.map(([year, arr]) => (
                <div key={year}>
                  <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 10}}>
                    <span className="font-numeral" style={{fontSize: 22, color:'var(--paper)'}}>{year}</span>
                    <div style={{flex: 1, height: 1, background:'rgba(239,231,214,0.15)'}}/>
                    <span className="mono" style={{fontSize: 10, color:'rgba(239,231,214,0.55)', letterSpacing:'0.15em'}}>{arr.length} ANIMALES</span>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8}}>
                    {arr.map((h, i) => (
                      <div key={i} onClick={() => onSelect(h)} style={{display:'flex', alignItems:'center', gap: 10, padding:'8px 10px', background:'rgba(239,231,214,0.06)', border:'1px solid rgba(239,231,214,0.12)', cursor:'pointer'}}>
                        <span className={`sex-pill sex-${h.S}`} style={{width: 20, height: 20, fontSize: 10}}>{h.S}</span>
                        <span className="pelaje-dot" style={{background: pelajeColor(h['Pinta/Pelaje']), width: 10, height: 10, border:'none'}}/>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div className="font-display" style={{fontSize: 14, color:'var(--paper)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{h.Nombre}</div>
                          <div className="mono" style={{fontSize: 10, color:'rgba(239,231,214,0.5)'}}>#{h['#Reg']} · {h['Pinta/Pelaje']}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{marginTop: 8}}>
        <div className="page-head" style={{marginTop: 28}}>
          <div><div className="eyebrow">Tabla</div><h2 style={{fontSize: 22}}>Listado de descendientes</h2></div>
          <div className="meta">Filtrable · clic en fila abre ficha</div>
        </div>
        <AnimalTable data={hijos} onRowClick={onSelect} sort={{ key: 'year', dir: 'desc' }} setSort={() => {}} columns={['arete', 'nombre', 'sex', 'year', 'pelaje', 'madre', 'tienta']}/>
      </div>
    </>
  );
}

// ── TientaPage ────────────────────────────────────────────────────────────────
function TientaPage({ data, allData, filters, setFilters, setFilter, onSelect, sort, setSort, currentYear }) {
  const [tientaField, setTientaField] = useState('TP');
  const tentados         = useMemo(() => allData.filter(d => d.FechTienta && d.FechTienta !== 'N/A'), [allData]);
  const filteredTentados = useMemo(() => data.filter(d => d.FechTienta && d.FechTienta !== 'N/A'), [data]);

  const byYear = {};
  tentados.forEach(d => { const yr = parseRanchDate(d.FechTienta); if (yr) byYear[yr] = (byYear[yr]||0)+1; });
  const yrs   = Object.keys(byYear).map(Number).sort((a,b)=>a-b);
  const maxYr = Math.max(...Object.values(byYear), 1);

  const ultimaTientaYear   = yrs.length ? Math.max(...yrs) : null;
  const tentadosEsteAnio   = ultimaTientaYear ? (byYear[ultimaTientaYear] || 0) : 0;

  const tpScores = tentados.map(d => GRADE_INFO[d.TP]?.score).filter(s => s != null && s >= 0);
  const avgTP    = tpScores.length ? (tpScores.reduce((a,b)=>a+b,0)/tpScores.length).toFixed(2) : '—';
  const tcScores = tentados.map(d => GRADE_INFO[d.TC]?.score).filter(s => s != null && s >= 0);
  const avgTC    = tcScores.length ? (tcScores.reduce((a,b)=>a+b,0)/tcScores.length).toFixed(2) : '—';

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Comportamiento</div><h2>Tienta</h2></div>
        <div className="meta">{tentados.length} animales tentados de {allData.length}</div>
      </div>
      <div className="kpi-row" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
        <div className="kpi kpi-hero">
          <div className="kpi-label">Total tentados</div>
          <div className="kpi-value">{fmt(tentados.length)}<span className="unit">de {fmt(allData.length)}</span></div>
          <div className="kpi-foot">{pct(tentados.length, allData.length)}% del hato</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Promedio TP <span style={{color:'var(--red)', fontSize:9, marginLeft:4}}>MULETA</span></div>
          <div className="kpi-value">{avgTP}<span className="unit">/ 5</span></div>
          <div className="kpi-foot">Calificación de muleta</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Promedio TC <span style={{color:'var(--ink-4)', fontSize:9, marginLeft:4}}>CAPOTE</span></div>
          <div className="kpi-value">{avgTC}<span className="unit">/ 5</span></div>
          <div className="kpi-foot">Escala MB=5 · +B=4 · B=3 · +R=2 · R=1</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Última tienta</div>
          <div className="kpi-value font-display" style={{fontSize: 24, lineHeight: 1.2}}>{ultimaTientaYear || '—'}</div>
          <div className="kpi-foot">{tentadosEsteAnio} animales tentados ese año</div>
        </div>
      </div>
      <div className="panels" style={{marginTop: 22}}>
        <div className="panel" style={{gridColumn: 'span 6'}}>
          <div className="panel-head"><div><div className="panel-eyebrow">Histórico</div><h3 className="panel-title">Tientas por año</h3></div></div>
          <div style={{display:'flex', alignItems:'flex-end', gap: 4, height: 180, paddingTop: 18, borderBottom:'1px solid var(--ink)'}}>
            {yrs.map(y => {
              const v = byYear[y];
              return (
                <div key={y} style={{flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 4, minWidth: 20}}>
                  <div className="mono" style={{fontSize: 10, color:'var(--ink-3)'}}>{v}</div>
                  <div style={{width:'70%', background:'var(--green)', height: `${(v/maxYr)*100}%`, minHeight: 2}}/>
                  <div className="mono" style={{fontSize: 10, color:'var(--ink-3)', marginTop: 2}}>{y}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel" style={{gridColumn: 'span 6'}}>
          <div className="panel-head">
            <div><div className="panel-eyebrow">Calificación de tienta</div><h3 className="panel-title">Distribución {tientaField}</h3></div>
            <div className="seg-toggle">
              <button className={tientaField==='TP' ? 'on' : ''} onClick={() => setTientaField('TP')}>Muleta · TP</button>
              <button className={tientaField==='TC' ? 'on' : ''} onClick={() => setTientaField('TC')}>Caballo · TC</button>
            </div>
          </div>
          <GradeDistribution
            data={tentados} field={tientaField}
            selectedGrade={tientaField === 'TP' ? filters.tpGrade : filters.tcGrade}
            onCellClick={g => setFilter(tientaField === 'TP' ? 'tpGrade' : 'tcGrade', g)}
          />
          <GradeLegend/>
        </div>
      </div>
      <div style={{marginTop: 12}}>
        <div className="page-head" style={{marginTop: 28}}>
          <div><div className="eyebrow">Detalle</div><h2 style={{fontSize: 22}}>Animales tentados</h2></div>
          <div className="meta">{filteredTentados.length} registros</div>
        </div>
        <AnimalTable data={filteredTentados} onRowClick={onSelect} sort={sort} setSort={setSort} columns={['arete', 'nombre', 'sex', 'year', 'pelaje', 'padre', 'tienta']}/>
      </div>
    </>
  );
}

// ── Mount ─────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
