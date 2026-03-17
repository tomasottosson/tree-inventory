import { useState, useCallback, useRef, useEffect } from "react";

const STATUSES = [
  { key: "unknown", label: "Okänd", color: "#d4d4d4", border: "#a3a3a3" },
  { key: "healthy", label: "Friskt träd", color: "#22c55e", border: "#15803d" },
  { key: "weak", label: "Svagt träd", color: "#facc15", border: "#a16207" },
  { key: "dead", label: "Dött träd", color: "#1c1917", border: "#525252" },
  { key: "stump", label: "Stubbe", color: "#92400e", border: "#78350f" },
  { key: "empty", label: "Tom position", color: "transparent", border: "#a3a3a3" },
  { key: "landmark", label: "Landmärke", color: "#8b5cf6", border: "#6d28d9" },
];
const SM = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

function buildData() {
  const q = {};

  // GRAVENSTEINER — 6 main rows × 38 positions + 4 pump rows (12,11,10,8)
  const gR = [];
  for (let r = 0; r < 6; r++) {
    const p = [];
    for (let i = 1; i <= 38; i++) p.push({ id: `gv-${r + 1}-${i}`, status: "unknown" });
    gR.push({ label: `G${r + 1}`, positions: p });
  }
  [12, 11, 10, 8].forEach((n, r) => {
    const p = [];
    for (let i = 1; i <= n; i++) p.push({ id: `gv-p${r + 1}-${i}`, status: "unknown" });
    gR.push({ label: `P${r + 1}`, positions: p });
  });
  q.gravensteiner = { id: "gravensteiner", name: "Gravensteiner", sub: "Norra & centrala kvarteret", rows: gR, color: "#f59e0b", bg: "#fffbeb" };

  // COX ORANGE — 5 rows × 19 positions each
  const cR = [];
  for (let r = 0; r < 5; r++) {
    const p = [];
    for (let i = 1; i <= 19; i++) p.push({ id: `co-${r + 1}-${i}`, status: "unknown" });
    cR.push({ label: `C${r + 1}`, positions: p });
  }
  q.coxOrange = { id: "cox-orange", name: "Cox Orange", sub: "Mittkvarteret, 5 rader × 19", rows: cR, color: "#ef4444", bg: "#fef2f2" };

  // INGRID MARIE — 12×23 + 3×20 = 336
  const iR = [];
  for (let r = 0; r < 15; r++) {
    const n = r < 12 ? 23 : 20;
    const p = [];
    for (let i = 1; i <= n; i++) p.push({ id: `im-${r + 1}-${i}`, status: "unknown" });
    iR.push({ label: `I${r + 1}`, positions: p });
  }
  q.ingridMarie = { id: "ingrid-marie", name: "Ingrid Marie", sub: "Tätplantering, sydväst, 15 rader", rows: iR, color: "#22c55e", bg: "#f0fdf4" };

  return q;
}

function Cell({ pos, tool, onToggle, qId, size }) {
  const st = SM[pos.status];
  const ref = useRef(null);
  return (
    <div
      ref={ref}
      onClick={() => onToggle(qId, pos.id, tool)}
      title={`${pos.id} — ${st.label}`}
      style={{
        width: size, height: size,
        borderRadius: pos.status === "landmark" ? 3 : "50%",
        background: st.color,
        border: `1px ${pos.status === "empty" ? "dashed" : "solid"} ${st.border}`,
        cursor: "pointer", flexShrink: 0, transition: "transform 0.08s",
      }}
      onMouseEnter={() => { if (ref.current) ref.current.style.transform = "scale(1.5)"; }}
      onMouseLeave={() => { if (ref.current) ref.current.style.transform = "scale(1)"; }}
    />
  );
}

function VerticalRow({ row, qId, tool, onToggle, cellSize, gap }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, alignItems: "center" }}>
      <span style={{ fontSize: 9, color: "#a8a29e", fontFamily: "monospace", userSelect: "none" }}>{row.label}</span>
      {row.positions.map((p) => (
        <Cell key={p.id} pos={p} tool={tool} onToggle={onToggle} qId={qId} size={cellSize} />
      ))}
    </div>
  );
}

function SpatialView({ quarters, tool, onToggle, zoom }) {
  const cs = Math.round(14 * zoom);
  const g = Math.max(1, Math.round(2 * zoom));
  const colW = cs + g;

  // Layout constants
  const gvMainCols = 6;
  const gvPumpCols = 4;
  const coCols = 5;
  const imCols = 15;

  const gvMaxLen = 38; // longest Gravensteiner row
  const coMaxLen = 19;
  const imMaxLen = 23;

  // SPATIAL PLACEMENT:
  // Gravensteiner main at top-left, rows run vertically (38 positions tall)
  const gvX = 20;
  const gvY = 30;

  // Pump rows — right of main Gravensteiner, near the top (northeast)
  const pumpX = gvX + gvMainCols * colW + 20;
  const pumpY = gvY;

  // Cox Orange — east, starting partway down. Its rows are 19 positions tall.
  // It should END where Ingrid Marie begins (position 38), so start at 38-19=19
  const coX = gvX + gvMainCols * colW + 20;
  const coY = gvY + Math.round(19 * colW); // starts at position 19, ends at 38

  // Ingrid Marie — BELOW Gravensteiner and Cox Orange.
  // The key constraint: it starts where the longest rows end (position 38).
  // Add a small gap for clarity.
  const imY = gvY + gvMaxLen * colW + 20 + 14; // 14px label space
  const imX = gvX;

  // Canvas size
  const w = Math.max(
    coX + coCols * colW + 40,
    pumpX + gvPumpCols * colW + 40,
    imX + imCols * colW + 40
  );
  const h = imY + imMaxLen * colW + 50;

  const renderBlock = (rows, x, y, qId, color, name) => (
    <div key={qId + name} style={{ position: "absolute", left: x, top: y, zIndex: 1 }}>
      <div style={{
        position: "absolute", top: -16, left: 0, whiteSpace: "nowrap",
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: Math.max(11, Math.round(13 * zoom)), fontWeight: 700, color,
      }}>{name}</div>
      <div style={{ display: "flex", gap: g }}>
        {rows.map((row, i) => (
          <VerticalRow key={i} row={row} qId={qId} tool={tool} onToggle={onToggle} cellSize={cs} gap={g} />
        ))}
      </div>
    </div>
  );

  const gvMain = quarters.gravensteiner.rows.slice(0, 6);
  const gvPump = quarters.gravensteiner.rows.slice(6);

  return (
    <div style={{ position: "relative", width: w, height: h, minWidth: w, minHeight: h }}>
      {/* Background zones */}
      {/* Gravensteiner main */}
      <div style={{
        position: "absolute", left: gvX - 8, top: gvY - 8,
        width: gvMainCols * colW + 14, height: gvMaxLen * colW + 30,
        background: quarters.gravensteiner.bg, border: `1px solid ${quarters.gravensteiner.color}25`,
        borderRadius: 8, zIndex: 0,
      }} />
      {/* Pump rows zone */}
      <div style={{
        position: "absolute", left: pumpX - 8, top: pumpY - 8,
        width: gvPumpCols * colW + 14, height: 12 * colW + 30,
        background: quarters.gravensteiner.bg, border: `1px dashed ${quarters.gravensteiner.color}40`,
        borderRadius: 8, zIndex: 0,
      }} />
      {/* Cox Orange zone */}
      <div style={{
        position: "absolute", left: coX - 8, top: coY - 8,
        width: coCols * colW + 14, height: coMaxLen * colW + 30,
        background: quarters.coxOrange.bg, border: `1px solid ${quarters.coxOrange.color}25`,
        borderRadius: 8, zIndex: 0,
      }} />
      {/* Ingrid Marie zone */}
      <div style={{
        position: "absolute", left: imX - 8, top: imY - 8,
        width: imCols * colW + 14, height: imMaxLen * colW + 30,
        background: quarters.ingridMarie.bg, border: `1px solid ${quarters.ingridMarie.color}25`,
        borderRadius: 8, zIndex: 0,
      }} />

      {/* Landmark annotations */}
      <div style={{
        position: "absolute",
        left: gvX + Math.round(2.5 * colW), top: gvY + 7 * colW,
        background: "#f5f3ffdd", border: "1.5px solid #8b5cf6", borderRadius: 5,
        padding: "1px 5px", fontSize: Math.max(8, Math.round(10 * zoom)),
        color: "#6d28d9", fontWeight: 600, zIndex: 5, pointerEvents: "none", whiteSpace: "nowrap",
      }}>Jordkällare</div>

      <div style={{
        position: "absolute",
        left: coX - 6, top: gvY + Math.round(17.5 * colW),
        background: "#f0fdf4dd", border: "1.5px solid #15803d", borderRadius: 5,
        padding: "1px 5px", fontSize: Math.max(8, Math.round(10 * zoom)),
        color: "#15803d", fontWeight: 600, zIndex: 5, pointerEvents: "none", whiteSpace: "nowrap",
      }}>Solitär-ek</div>

      <div style={{
        position: "absolute",
        left: pumpX + Math.round(1.5 * colW), top: pumpY + 3 * colW,
        background: "#eff6ffdd", border: "1.5px solid #3b82f6", borderRadius: 5,
        padding: "1px 5px", fontSize: Math.max(8, Math.round(10 * zoom)),
        color: "#2563eb", fontWeight: 600, zIndex: 5, pointerEvents: "none", whiteSpace: "nowrap",
      }}>Pumphus</div>

      {/* Compass */}
      <div style={{
        position: "absolute", right: 8, top: 4,
        display: "flex", flexDirection: "column", alignItems: "center",
        color: "#78716c", fontSize: 11, zIndex: 5, userSelect: "none",
      }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>N</span>
        <span>↑</span>
      </div>

      {/* Divider line between Gravensteiner and Ingrid Marie */}
      <div style={{
        position: "absolute",
        left: gvX - 12, top: imY - 12,
        width: Math.max(gvMainCols, imCols) * colW + 30,
        height: 0, borderTop: "1.5px dashed #a8a29e",
        zIndex: 2,
      }} />

      {renderBlock(gvMain, gvX, gvY, "gravensteiner", "#f59e0b", "Gravensteiner")}
      {renderBlock(gvPump, pumpX, pumpY, "gravensteiner", "#f59e0b", "Pumphus-rader")}
      {renderBlock(quarters.coxOrange.rows, coX, coY, "cox-orange", "#ef4444", "Cox Orange")}
      {renderBlock(quarters.ingridMarie.rows, imX, imY, "ingrid-marie", "#22c55e", "Ingrid Marie")}
    </div>
  );
}

function ListView({ quarters, tool, onToggle, zoom }) {
  const cs = Math.round(14 * zoom);
  return (
    <div>
      {Object.values(quarters).forEach === undefined ? null : Object.values(quarters).map((q) => (
        <div key={q.id} style={{
          marginBottom: 20, background: q.bg, borderRadius: 10,
          padding: "10px 14px", border: `2px solid ${q.color}30`,
        }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: q.color }}>{q.name}</span>
            <span style={{ marginLeft: 8, fontSize: 11, color: "#737373" }}>{q.sub}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            {q.rows.map((row, ri) => (
              <div key={ri} style={{ display: "flex", alignItems: "center", marginBottom: 2, gap: 1 }}>
                <span style={{ width: 28, fontSize: 9, color: "#a8a29e", textAlign: "right", paddingRight: 3, fontFamily: "monospace", flexShrink: 0 }}>{row.label}</span>
                {row.positions.map((p) => (
                  <Cell key={p.id} pos={p} tool={tool} onToggle={onToggle} qId={q.id} size={cs} />
                ))}
                <span style={{ marginLeft: 3, fontSize: 8, color: "#d4d4d4", flexShrink: 0 }}>{row.positions.length}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stats({ quarters }) {
  const c = {};
  STATUSES.forEach((s) => (c[s.key] = 0));
  let t = 0;
  Object.values(quarters).forEach((q) => q.rows.forEach((r) => r.positions.forEach((p) => { c[p.status]++; t++; })));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10, fontSize: 11 }}>
      <span style={{ background: "#f5f5f5", borderRadius: 5, padding: "3px 8px", fontWeight: 600, color: "#525252" }}>Totalt: {t}</span>
      {STATUSES.filter((s) => c[s.key] > 0).map((s) => (
        <span key={s.key} style={{ background: "#f5f5f5", borderRadius: 5, padding: "3px 8px", display: "flex", alignItems: "center", gap: 3, color: "#525252" }}>
          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: s.key === "landmark" ? 2 : "50%", background: s.color === "transparent" ? "#fff" : s.color, border: `1px solid ${s.border}` }} />
          {s.label}: {c[s.key]}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const [quarters, setQuarters] = useState(buildData);
  const [tool, setTool] = useState("healthy");
  const [zoom, setZoom] = useState(1);
  const [toast, setToast] = useState(null);
  const [view, setView] = useState("spatial");
  const tr = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("orchard-map-v5");
        if (r?.value) {
          const saved = JSON.parse(r.value);
          setQuarters((prev) => {
            const lu = {};
            Object.values(saved).forEach((sq) => sq.rows.forEach((sr) => sr.positions.forEach((sp) => { lu[sp.id] = sp.status; })));
            const n = {};
            Object.entries(prev).forEach(([k, q]) => {
              n[k] = { ...q, rows: q.rows.map((row) => ({ ...row, positions: row.positions.map((p) => ({ ...p, status: lu[p.id] || p.status })) })) };
            });
            return n;
          });
        }
      } catch (e) { }
    })();
  }, []);

  const save = useCallback(async (d) => { try { await window.storage.set("orchard-map-v5", JSON.stringify(d)); } catch (e) { } }, []);
  const flash = useCallback((m) => { setToast(m); if (tr.current) clearTimeout(tr.current); tr.current = setTimeout(() => setToast(null), 1500); }, []);

  const toggle = useCallback((qId, pId, t) => {
    setQuarters((prev) => {
      const n = {};
      Object.entries(prev).forEach(([k, q]) => {
        if (q.id !== qId) { n[k] = q; return; }
        n[k] = { ...q, rows: q.rows.map((r) => ({ ...r, positions: r.positions.map((p) => p.id !== pId ? p : { ...p, status: p.status === t ? "unknown" : t }) })) };
      });
      save(n);
      return n;
    });
  }, [save]);

  const csvExport = useCallback(() => {
    const l = ["kvarter,rad,position,status"];
    Object.values(quarters).forEach((q) => q.rows.forEach((r) => r.positions.forEach((p, i) => l.push(`${q.name},${r.label},${i + 1},${SM[p.status].label}`))));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + l.join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "odlingskarta.csv"; a.click();
    flash("Exporterat");
  }, [quarters, flash]);

  const reset = useCallback(() => {
    if (confirm("Nollställ alla positioner?")) { const f = buildData(); setQuarters(f); save(f); flash("Nollställd"); }
  }, [save, flash]);

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 1200, margin: "0 auto", padding: "16px 10px", background: "#fafaf9", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: "#1c1917", margin: "0 0 2px", letterSpacing: "-0.03em" }}>
        Äppelodlingen — trädkarta
      </h1>
      <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 12px" }}>Välj verktyg, klicka position. Klicka igen = återställ. Sparas automatiskt.</p>

      {/* Toolbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fafaf9ee", backdropFilter: "blur(8px)", padding: "8px 0 6px", marginBottom: 10, borderBottom: "1px solid #e7e5e4" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          {STATUSES.filter((s) => s.key !== "unknown").map((s) => (
            <button key={s.key} onClick={() => setTool(s.key)} style={{
              display: "flex", alignItems: "center", gap: 3, padding: "3px 7px", borderRadius: 5,
              border: tool === s.key ? `2px solid ${s.border}` : "2px solid #e7e5e4",
              background: tool === s.key ? `${s.color}18` : "#fff",
              cursor: "pointer", fontSize: 11, fontWeight: 500, color: tool === s.key ? s.border : "#78716c",
            }}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: s.key === "landmark" ? 2 : "50%", background: s.color === "transparent" ? "#fff" : s.color, border: `1px ${s.key === "empty" ? "dashed" : "solid"} ${s.border}` }} />
              {s.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => setView(view === "spatial" ? "list" : "spatial")} style={{ padding: "3px 7px", borderRadius: 5, border: "2px solid #e7e5e4", background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 500, color: "#78716c" }}>
            {view === "spatial" ? "Lista" : "Karta"}
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#a8a29e" }}>
            <input type="range" min={50} max={180} value={Math.round(zoom * 100)} onChange={(e) => setZoom(+e.target.value / 100)} style={{ width: 44 }} />
          </label>
          <button onClick={csvExport} style={{ padding: "3px 7px", borderRadius: 5, border: "2px solid #e7e5e4", background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 500, color: "#78716c" }}>CSV</button>
          <button onClick={reset} style={{ padding: "3px 7px", borderRadius: 5, border: "2px solid #fecaca", background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 500, color: "#ef4444" }}>Nollställ</button>
        </div>
      </div>

      <Stats quarters={quarters} />

      <div style={{ overflow: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: 12 }}>
        {view === "spatial"
          ? <SpatialView quarters={quarters} tool={tool} onToggle={toggle} zoom={zoom} />
          : <ListView quarters={quarters} tool={tool} onToggle={toggle} zoom={zoom} />}
      </div>

      <div style={{ marginTop: 10, padding: "8px 12px", background: "#f5f3ff", borderRadius: 7, border: "1px solid #ddd6fe", fontSize: 11, color: "#6d28d9" }}>
        <strong>Landmärken:</strong> Markera jordkällare, solitäreken och pumphuset med "Landmärke"-verktyget på de positioner de upptar.
        Streckad linje = gräns mellan Gravensteiner och Ingrid Marie.
      </div>

      {toast && <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "#1c1917", color: "#fff", padding: "5px 14px", borderRadius: 6, fontSize: 11, fontWeight: 500, zIndex: 100 }}>{toast}</div>}
    </div>
  );
}