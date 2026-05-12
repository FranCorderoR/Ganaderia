// ============================================================
// App — main dashboard
// v1.1 — consolidado y corregido
// Cambios vs v1.0:
//   - FIX: currentYear derivado del dato real, no hardcodeado
//   - FIX: fecha de reporte derivada (no string fijo)
//   - FIX: GradeLegend extraído (elimina duplicación en ResumenPage/TientaPage)
//   - FIX: HerraderoMini usa parseRanchDate() centralizado
//   - FIX: KPI "Última tienta" calculado desde los datos
//   - FIX: TientaPage KPI "animales este año" calculado desde los datos
//   - FIX: filtro silencioso de AñoN < 2010 documentado con advertencia
//   - FIX: Sidebar recibe lastUpdated como prop
//   - NOTA: allData filtra AñoN >= 2010 por decisión operativa;
//           si deseas incluir animales históricos, cambia el umbral aquí
// ============================================================
const { useState, useMemo, useEffect, useCallback } = React;

// ============================================================
// Utilidad: formatea Date -> "DD.MM.YYYY"
// ============================================================
function formatDate(d) {
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function App() {
  const [section, setSection] = useState('resumen');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState({ key: 'year', dir: 'desc' });
  const [highlightYear, setHighlightYear] = useState(null);

  // FIX: allData con filtro documentado
  // Se excluyen animales con AñoN < 2010 (decisión operativa: foco en el hato activo).
  // Para incluir registros históricos, elimina el filtro o ajusta el umbral.
  const allData = useMemo(() => window.RANCH_DATA.filter(d => !d.AñoN || +d.AñoN >= 2010), []);

  // FIX: currentYear derivado del año máximo en el dataset, no hardcodeado
  const currentYear = useMemo(() => {
    const years = allData.map(d => +d.AñoN).filter(y => !isNaN(y) && y > 0);
    return years.length ? Math.max(...years) : new Date().getFullYear();
  }, [allData]);

  // FIX: fecha de última actualización derivada (hoy), no hardcodeada
  const lastUpdated = useMemo(() => formatDate(new Date()), []);

  const data = useMemo(() => {
    let out = allData;
    if (filters.sex) out = out.filter(d => d.S === (filters.sex === 'Hembras' ? 'H' : filters.sex === 'Machos' ? 'M' : filters.sex));
    if (filters.pelaje) {
      const fam = filters.pelaje.toUpperCase();
      out = out.filter(d => {
        const p = (d['Pinta/Pelaje']||'').toUpperCase();
        const aFam = fam.endsWith('A') ? fam.slice(0,-1) : fam.endsWith('O') ? fam.slice(0,-1) : fam;
        const bFam = p.endsWith('A') ? p.slice(0,-1) : p.endsWith('O') ? p.slice(0,-1) : p;
        return aFam === bFam;
      });
    }
    if (filters.year) out = out.filter(d => +d.AñoN === +filters.year);
    if (filters.padre) out = out.filter(d => d.Padre === filters.padre);
    if (filters.madre) out = out.filter(d => d.Madre === filters.madre);
    if (filters.tcGrade) out = out.filter(d => d.TC === filters.tcGrade);
    if (filters.tpGrade) out = out.filter(d => d.TP === filters.tpGrade);
    if (filters.tentados === 'Tentados') out = out.filter(d => d.FechTienta && d.FechTienta !== 'N/A');
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
      setFilters(f => {
        const cur = f.sex;
        return { ...f, sex: cur === 'H' ? 'M' : cur === 'M' ? null : 'H' };
      });
      return;
    }
    setFilters(f => ({ ...f, [k]: f[k] === v ? null : v }));
  };

  // Shortcut: cmd-k / ctrl-k focaliza el buscador
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.search input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app">
      {/* FIX: lastUpdated pasado como prop, no hardcodeado en Sidebar */}
      <Sidebar active={section} onNav={setSection} counts={counts} lastUpdated={lastUpdated} />
      <div className="main">
        <Topbar section={section} search={search} setSearch={setSearch} total={data.length} />
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
              onSelect={setSelected}
              sort={sort} setSort={setSort}
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
              onSelect={setSelected}
              sort={sort} setSort={setSort}
              currentYear={currentYear}
            />
          )}
        </div>
      </div>
      {selected && (
        <AnimalModal
          animal={selected}
          onClose={() => setSelected(null)}
          allData={allData}
          onSelectAnimal={a => setSelected(a)}
        />
      )}
    </div>
  );
}

// ============================================================
// RESUMEN PAGE
// ============================================================
function ResumenPage({ data, allData, filters, setFilters, setFilter, onSelect, highlightYear, setHighlightYear, currentYear, lastUpdated }) {
  const [tientaField, setTientaField] = useState('TP');

  // FIX: "mes y año" del reporte derivados dinámicamente
  const reportLabel = useMemo(() => {
    const today = new Date();
    const mes = today.toLocaleDateString('es-MX', { month: 'long' });
    const anio = today.getFullYear();
    return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`;
  }, []);

  const recentes = useMemo(() => {
    return [...allData]
      .filter(d => d.AñoN)
      .sort((a,b) => (+b.AñoN) - (+a.AñoN) || (+b['#Reg']||0) - (+a['#Reg']||0))
      .slice(0, 8);
  }, [allData]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Reporte · {reportLabel}</div>
          <h2>Resumen del hato</h2>
        </div>
        <div className="meta">
          Última actualización · {lastUpdated} · {fmt(allData.length)} cabezas
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} totalFiltered={data.length} total={allData.length}/>

      <KPIRow data={data} allData={allData} onFilter={setFilter} currentYear={currentYear} />

      {/* Row 1: Nacimientos + Pelaje */}
      <div className="panels">
        <div className="panel" style={{gridColumn: 'span 8'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Nacimientos</div>
              <h3 className="panel-title">Animales nacidos por año</h3>
            </div>
            <button className="panel-action" onClick={() => { setHighlightYear(null); setFilter('year', null); }}>Reset</button>
          </div>
          <NacimientosChart
            data={allData}
            onYearClick={y => { setHighlightYear(y); setFilter('year', String(y)); }}
            selectedYear={highlightYear}
          />
          <div className="mono eyebrow" style={{marginTop: 10}}>Haz clic en una barra para filtrar el año</div>
        </div>

        <div className="panel" style={{gridColumn: 'span 4'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Pelaje · Pinta</div>
              <h3 className="panel-title">Capas del hato</h3>
            </div>
          </div>
          <PelajeChart data={data} onClick={p => setFilter('pelaje', p)} selected={filters.pelaje?.toUpperCase()} />
        </div>
      </div>

      {/* Row 2: Pirámide + Top sementales + Recientes */}
      <div className="panels">
        <div className="panel" style={{gridColumn: 'span 4'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Distribución</div>
              <h3 className="panel-title">Pirámide por edad</h3>
            </div>
          </div>
          <AgePyramid data={data} />
        </div>

        <div className="panel dark" style={{gridColumn: 'span 5'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Línea genética</div>
              <h3 className="panel-title">Ranking de sementales</h3>
            </div>
            <button className="panel-action" style={{color: 'rgba(239,231,214,0.55)'}} onClick={() => setFilter('padre', null)}>Reset</button>
          </div>
          <TopSementales data={allData} selected={filters.padre} onSelect={p => setFilter('padre', p)} />
        </div>

        <div className="panel" style={{gridColumn: 'span 3'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Recientes</div>
              <h3 className="panel-title">Últimos nacimientos</h3>
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap: 8}}>
            {recentes.map((r, i) => (
              <div key={i}
                onClick={() => onSelect(r)}
                style={{display:'flex', alignItems:'center', gap: 10, padding:'8px 0', borderBottom: i < recentes.length-1 ? '1px dashed var(--rule-soft)' : 'none', cursor:'pointer'}}>
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

      {/* Row 3: Tienta summary + Herradero */}
      <div className="panels">
        <div className="panel" style={{gridColumn: 'span 7'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Calificación de tienta</div>
              <h3 className="panel-title">Distribución {tientaField}</h3>
            </div>
            <div className="seg-toggle">
              <button className={tientaField==='TP' ? 'on' : ''} onClick={() => setTientaField('TP')}>Muleta · TP</button>
              <button className={tientaField==='TC' ? 'on' : ''} onClick={() => setTientaField('TC')}>Caballo · TC</button>
            </div>
          </div>
          <GradeDistribution
            data={data}
            field={tientaField}
            selectedGrade={tientaField === 'TP' ? filters.tpGrade : filters.tcGrade}
            onCellClick={g => setFilter(tientaField === 'TP' ? 'tpGrade' : 'tcGrade', g)}
          />
          {/* FIX: GradeLegend reutilizable — antes duplicado aquí y en TientaPage */}
          <GradeLegend />
          <div style={{marginLeft:'auto', color:'var(--red)', fontStyle:'italic', fontSize: 11, textAlign:'right', marginTop: 4}}>
            Clic en una celda para listar
          </div>
          {(() => {
            const activeKey = tientaField === 'TP' ? 'tpGrade' : 'tcGrade';
            const activeGrade = filters[activeKey];
            if (!activeGrade) return null;
            const matches = data.filter(d => d[tientaField] === activeGrade);
            return (
              <div style={{marginTop: 16, paddingTop: 14, borderTop:'1px dashed var(--rule-soft)'}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10}}>
                  <div className="eyebrow">Animales con {tientaField} = <span style={{color: GRADE_INFO[activeGrade]?.color, fontWeight:600, fontSize: 13}}>{activeGrade}</span> ({matches.length})</div>
                  <button className="panel-action" onClick={() => setFilter(activeKey, null)}>Cerrar ×</button>
                </div>
                <AnimalTable
                  data={matches}
                  onRowClick={onSelect}
                  sort={{ key: 'year', dir: 'desc' }}
                  setSort={() => {}}
                  columns={['arete','nombre','sex','year','pelaje','padre','tienta']}
                />
              </div>
            );
          })()}
        </div>

        <div className="panel" style={{gridColumn: 'span 5'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Herradero</div>
              <h3 className="panel-title">Animales herrados</h3>
            </div>
          </div>
          <HerraderoMini data={allData} />
        </div>
      </div>
    </>
  );
}

// ============================================================
// HerraderoMini — FIX: usa parseRanchDate() centralizado
// ============================================================
function HerraderoMini({ data }) {
  const byYear = {};
  data.forEach(d => {
    if (!d.FechaHerra) return;
    const yr = parseRanchDate(d.FechaHerra); // FIX: antes había regex inline duplicado
    if (yr) byYear[yr] = (byYear[yr]||0)+1;
  });
  const years = Object.keys(byYear).map(Number).sort((a,b)=>a-b);
  if (years.length === 0) {
    return (
      <div style={{padding:'20px 0'}}>
        <div className="muted" style={{fontStyle:'italic', fontSize: 13, marginBottom: 12}}>
          Pocos registros con fecha de herra en la base.
        </div>
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
  const innerW = W - PADL - PADR;
  const innerH = H - PADT - PADB;
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
              {v > 0 && (
                <text x={x + w/2} y={yPos - 4} textAnchor="middle" className="bar-value" fill="#1A1410">{v}</text>
              )}
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

// ============================================================
// INVENTARIO PAGE
// ============================================================
function InventarioPage({ data, allData, filters, setFilters, setFilter, onSelect, sort, setSort }) {
  const uniqueYears = useMemo(() => [...new Set(allData.map(d => d.AñoN))].filter(Boolean).sort((a,b)=>+b-+a), [allData]);
  const uniquePadres = useMemo(() => [...new Set(allData.map(d => d.Padre))].filter(Boolean).sort(), [allData]);
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Libro de campo</div>
          <h2>Inventario del hato</h2>
        </div>
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

// ============================================================
// GENEALOGIA PAGE
// ============================================================
function GenealogiaPage({ data, allData, filters, setFilters, setFilter, onSelect }) {
  const padres = useMemo(() => {
    const counts = {};
    allData.forEach(d => { if (d.Padre) counts[d.Padre] = (counts[d.Padre]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  }, [allData]);

  const [picked, setPicked] = useState(padres[0]?.[0]);

  const pickedAnimal = useMemo(() => {
    return allData.find(d => `${d['#Reg']} C ${d.AñoN}` === picked);
  }, [allData, picked]);

  const hijos = useMemo(() => {
    return allData.filter(d => d.Padre === picked || d.Madre === picked);
  }, [allData, picked]);

  const hijosByYear = useMemo(() => {
    const g = {};
    hijos.forEach(h => { if (h.AñoN) (g[h.AñoN] = g[h.AñoN]||[]).push(h); });
    return Object.entries(g).sort((a,b)=>+b[0]-+a[0]);
  }, [hijos]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Líneas de sangre</div>
          <h2>Genealogía</h2>
        </div>
        <div className="meta">{padres.length} sementales · {fmt(allData.length)} cabezas</div>
      </div>

      <div className="panels">
        <div className="panel" style={{gridColumn: 'span 4'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Selecciona un padre</div>
              <h3 className="panel-title">Sementales</h3>
            </div>
          </div>
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
            {pickedAnimal && (
              <button className="panel-action" style={{color:'rgba(239,231,214,0.7)'}} onClick={() => onSelect(pickedAnimal)}>Ver ficha →</button>
            )}
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
                      <div key={i} onClick={() => onSelect(h)} style={{
                        display:'flex', alignItems:'center', gap: 10, padding:'8px 10px',
                        background:'rgba(239,231,214,0.06)', border:'1px solid rgba(239,231,214,0.12)', cursor:'pointer',
                      }}>
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
          <div>
            <div className="eyebrow">Tabla</div>
            <h2 style={{fontSize: 22}}>Listado de descendientes</h2>
          </div>
          <div className="meta">Filtrable · clic en fila abre ficha</div>
        </div>
        <AnimalTable
          data={hijos} onRowClick={onSelect}
          sort={{ key: 'year', dir: 'desc' }} setSort={() => {}}
          columns={['arete', 'nombre', 'sex', 'year', 'pelaje', 'madre', 'tienta']}
        />
      </div>
    </>
  );
}

// ============================================================
// TIENTA PAGE
// FIX: KPI "Última tienta" y "animales este año" calculados desde datos
// FIX: usa parseRanchDate() en lugar de regex inline
// FIX: GradeLegend reutilizable en lugar de JSX duplicado
// ============================================================
function TientaPage({ data, allData, filters, setFilters, setFilter, onSelect, sort, setSort, currentYear }) {
  const [tientaField, setTientaField] = useState('TP');
  const tentados = useMemo(() => allData.filter(d => d.FechTienta && d.FechTienta !== 'N/A'), [allData]);
  const filteredTentados = useMemo(() => data.filter(d => d.FechTienta && d.FechTienta !== 'N/A'), [data]);

  // FIX: parseRanchDate() centralizado — antes era regex duplicado inline
  const byYear = {};
  tentados.forEach(d => {
    const yr = parseRanchDate(d.FechTienta);
    if (yr) byYear[yr] = (byYear[yr]||0)+1;
  });
  const yrs = Object.keys(byYear).map(Number).sort((a,b)=>a-b);
  const maxYr = Math.max(...Object.values(byYear), 1);

  // FIX: "última tienta" derivada del dato
  const ultimaTientaYear = yrs.length ? Math.max(...yrs) : null;
  const tentadosEsteAnio = ultimaTientaYear ? (byYear[ultimaTientaYear] || 0) : 0;

  const tpScores = tentados.map(d => GRADE_INFO[d.TP]?.score).filter(s => s != null && s >= 0);
  const avgTP = tpScores.length ? (tpScores.reduce((a,b)=>a+b,0)/tpScores.length).toFixed(2) : '—';
  const tcScores = tentados.map(d => GRADE_INFO[d.TC]?.score).filter(s => s != null && s >= 0);
  const avgTC = tcScores.length ? (tcScores.reduce((a,b)=>a+b,0)/tcScores.length).toFixed(2) : '—';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Comportamiento</div>
          <h2>Tienta</h2>
        </div>
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
        {/* FIX: antes hardcodeado "2025 · 3 animales" */}
        <div className="kpi">
          <div className="kpi-label">Última tienta</div>
          <div className="kpi-value font-display" style={{fontSize: 24, lineHeight: 1.2}}>
            {ultimaTientaYear || '—'}
          </div>
          <div className="kpi-foot">{tentadosEsteAnio} animales tentados ese año</div>
        </div>
      </div>

      <div className="panels" style={{marginTop: 22}}>
        <div className="panel" style={{gridColumn: 'span 6'}}>
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Histórico</div>
              <h3 className="panel-title">Tientas por año</h3>
            </div>
          </div>
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
            <div>
              <div className="panel-eyebrow">Calificación de tienta</div>
              <h3 className="panel-title">Distribución {tientaField}</h3>
            </div>
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
          {/* FIX: componente reutilizable en lugar de JSX duplicado */}
          <GradeLegend />
        </div>
      </div>

      <div style={{marginTop: 12}}>
        <div className="page-head" style={{marginTop: 28}}>
          <div>
            <div className="eyebrow">Detalle</div>
            <h2 style={{fontSize: 22}}>Animales tentados</h2>
          </div>
          <div className="meta">{filteredTentados.length} registros</div>
        </div>
        <AnimalTable
          data={filteredTentados} onRowClick={onSelect}
          sort={sort} setSort={setSort}
          columns={['arete', 'nombre', 'sex', 'year', 'pelaje', 'padre', 'tienta']}
        />
      </div>
    </>
  );
}

// Mount
window.App = App;
window.ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
