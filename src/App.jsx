import { useState, useRef, useEffect } from 'react'

// ─── MATH DIN 32712 ─────────────────────────────────────────
function generateProfile(d4, e, P = 4, step = 0.01) {
  const Rm = d4 / 2.0
  const points = []
  for (let deg = 0; deg <= 360; deg += step) {
    const a = (deg * Math.PI) / 180
    const x =
      (Rm - e * Math.cos(P * a)) * Math.cos(a) -
      P * e * Math.sin(P * a) * Math.sin(a)
    const y =
      (Rm - e * Math.cos(P * a)) * Math.sin(a) +
      P * e * Math.sin(P * a) * Math.cos(a)
    points.push({ x, y })
  }
  return points
}

function computeCotes(d4, e, P = 4) {
  const pts = generateProfile(d4, e, P, 0.1)
  const rs = pts.map(({ x, y }) => Math.sqrt(x * x + y * y))
  return {
    Rm: (d4 / 2).toFixed(4),
    dMini: (Math.min(...rs) * 2).toFixed(4),
    dMaxi: (Math.max(...rs) * 2).toFixed(4),
    nbPoints: Math.round(360 / 0.01) + 1,
  }
}

// ─── DXF EXPORT ─────────────────────────────────────────────
function generateDXF(points, profondeur) {
  const nb = points.length - 1
  let vertices = ''
  for (let i = 0; i < nb; i++) {
    vertices += `0\nVERTEX\n8\nPROFIL\n10\n${points[i].x.toFixed(6)}\n20\n${points[i].y.toFixed(6)}\n30\n0.0\n`
  }
  return `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nPOLYLINE\n8\nPROFIL\n66\n1\n70\n1\n${vertices}0\nSEQEND\n0\nTEXT\n8\nINFOS\n10\n0\n20\n-10\n30\n0\n40\n1.5\n1\nDIN 32712 - Profondeur: ${profondeur} mm\n0\nENDSEC\n0\nEOF`
}

// ─── CANVAS DRAW ─────────────────────────────────────────────
function drawCanvas(canvas, points, d4, e, cotes) {
  if (!canvas || !points.length) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  const cx = W / 2
  const cy = H / 2

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#fafaf8'
  ctx.fillRect(0, 0, W, H)

  // Grid
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 20; i++) {
    ctx.beginPath(); ctx.moveTo((i * W) / 20, 0); ctx.lineTo((i * W) / 20, H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, (i * H) / 20); ctx.lineTo(W, (i * H) / 20); ctx.stroke()
  }

  // Axes
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 4])
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke()
  ctx.setLineDash([])

  const maxR = parseFloat(cotes.dMaxi) / 2
  const scale = (W * 0.40) / maxR

  // Rm circle
  ctx.strokeStyle = 'rgba(180,140,60,0.35)'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 3])
  ctx.beginPath()
  ctx.arc(cx, cy, (parseFloat(d4) / 2) * scale, 0, 2 * Math.PI)
  ctx.stroke()
  ctx.setLineDash([])

  // Profile fill
  ctx.beginPath()
  ctx.moveTo(cx + points[0].x * scale, cy - points[0].y * scale)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(cx + points[i].x * scale, cy - points[i].y * scale)
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(26,58,110,0.07)'
  ctx.fill()

  // Profile stroke
  ctx.beginPath()
  ctx.moveTo(cx + points[0].x * scale, cy - points[0].y * scale)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(cx + points[i].x * scale, cy - points[i].y * scale)
  }
  ctx.closePath()
  ctx.strokeStyle = '#1a3a6e'
  ctx.lineWidth = 2
  ctx.stroke()

  // Center cross
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 1
  const cs = 7
  ctx.beginPath(); ctx.moveTo(cx - cs, cy); ctx.lineTo(cx + cs, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - cs); ctx.lineTo(cx, cy + cs); ctx.stroke()

  // Labels
  ctx.font = "10px 'DM Mono', monospace"
  ctx.fillStyle = 'rgba(150,110,40,0.9)'
  const rmPx = (parseFloat(d4) / 2) * scale
  ctx.fillText(`Rm = ${cotes.Rm} mm`, cx + rmPx + 8, cy - 5)
  ctx.fillStyle = '#1a3a6e'
  ctx.fillText(`Ø mini = ${cotes.dMini} mm`, cx + 8, cy + 18)
  ctx.fillText(`Ø maxi = ${cotes.dMaxi} mm`, cx + 8, cy + 32)
}

// ─── STYLES ──────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: '#f2f1ed',
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    background: '#1a3a6e',
    padding: '20px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSub: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '3px',
    fontFamily: "'DM Mono', monospace",
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: '20px',
    color: '#fff',
    fontWeight: 500,
    letterSpacing: '0.3px',
  },
  headerRight: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.25)',
    fontFamily: "'DM Mono', monospace",
    textAlign: 'right',
    lineHeight: 1.8,
  },
  container: {
    maxWidth: '820px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  card: {
    background: '#fff',
    border: '1px solid #e4e1d9',
    borderRadius: '8px',
    padding: '28px',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '10px',
    color: '#aaa',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '2px',
    textTransform: 'uppercase',
    marginBottom: '22px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f0ede6',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '1px',
    color: '#999',
    marginBottom: '7px',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    fontSize: '15px',
    fontFamily: "'DM Mono', monospace",
    background: '#fdfdfc',
    border: '1px solid #e0ddd6',
    borderRadius: '5px',
    color: '#1a1a1a',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  btnPrimary: {
    width: '100%',
    padding: '14px',
    background: '#1a3a6e',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    fontSize: '12px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '2.5px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    textTransform: 'uppercase',
  },
  btnSecondary: {
    width: '100%',
    padding: '14px',
    background: '#fff',
    color: '#1a3a6e',
    border: '1.5px solid #1a3a6e',
    borderRadius: '5px',
    fontSize: '12px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '2.5px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textTransform: 'uppercase',
  },
  error: {
    background: '#fff5f5',
    border: '1px solid #ffd0d0',
    borderRadius: '5px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#c00',
    marginBottom: '16px',
    fontFamily: "'DM Mono', monospace",
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  resultBox: (accent) => ({
    background: accent ? '#1a3a6e' : '#fdfdfc',
    border: `1px solid ${accent ? '#1a3a6e' : '#e4e1d9'}`,
    borderRadius: '6px',
    padding: '18px 20px',
  }),
  resultLabel: (accent) => ({
    fontSize: '10px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '1.5px',
    color: accent ? 'rgba(255,255,255,0.5)' : '#aaa',
    marginBottom: '6px',
    textTransform: 'uppercase',
  }),
  resultValue: (accent) => ({
    fontSize: '22px',
    color: accent ? '#fff' : '#1a1a1a',
    fontFamily: "'DM Mono', monospace",
    fontWeight: 600,
  }),
  resultUnit: (accent) => ({
    fontSize: '11px',
    color: accent ? 'rgba(255,255,255,0.4)' : '#ccc',
    fontFamily: "'DM Mono', monospace",
    marginTop: '2px',
  }),
}

// ─── APP ─────────────────────────────────────────────────────
export default function App() {
  const [d4, setD4] = useState('')
  const [e, setE] = useState('')
  const [prof, setProf] = useState('')
  const [lobes, setLobes] = useState('4')
  const [result, setResult] = useState(null)
  const [points, setPoints] = useState([])
  const [error, setError] = useState('')
  const canvasRef = useRef(null)

  useEffect(() => {
    if (result && points.length && canvasRef.current) {
      drawCanvas(canvasRef.current, points, d4, e, result)
    }
  }, [result, points])

  function handleCalculate() {
    setError('')
    const d4v = parseFloat(d4)
    const ev = parseFloat(e)
    const pv = parseInt(lobes)
    const profv = parseFloat(prof)

    if (isNaN(d4v) || isNaN(ev) || isNaN(pv) || isNaN(profv)) {
      setError('Veuillez remplir tous les champs avec des valeurs numériques valides.')
      return
    }
    if (d4v <= 0 || ev <= 0 || profv <= 0) {
      setError('Toutes les valeurs doivent être supérieures à 0.')
      return
    }
    if (ev >= d4v / 2) {
      setError(`L'excentricité e doit être inférieure à d₄/2 (${(d4v / 2).toFixed(4)} mm).`)
      return
    }

    const pts = generateProfile(d4v, ev, pv, 0.01)
    const cotes = computeCotes(d4v, ev, pv)
    setPoints(pts)
    setResult(cotes)
  }

  function handleDownload() {
    if (!points.length) return
    const dxf = generateDXF(points, prof)
    const blob = new Blob([dxf], { type: 'application/dxf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profil_DIN32712_P${lobes}C_d${d4}_e${e}.dxf`
    a.click()
    URL.revokeObjectURL(url)
  }

  function focusInput(e) { e.target.style.borderColor = '#1a3a6e'; e.target.style.boxShadow = '0 0 0 3px rgba(26,58,110,0.08)' }
  function blurInput(e)  { e.target.style.borderColor = '#e0ddd6'; e.target.style.boxShadow = 'none' }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.headerSub}>Norme DIN 32712 · Polygone P{lobes}C</div>
          <div style={S.headerTitle}>Générateur de Profil Polygone</div>
        </div>
        <div style={S.headerRight}>
          <div>ESPRIT CAM</div>
          <div>FANUC COMPATIBLE</div>
          <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.15)' }}>Nelson Flow © 2026</div>
        </div>
      </div>

      <div style={S.container}>
        {/* Input card */}
        <div style={S.card}>
          <div style={S.cardTitle}>Paramètres d'entrée</div>
          <div style={{ ...S.grid2, marginBottom: 18 }}>
            {[
              { label: 'Ø d₄ — Diamètre nominal (mm)', val: d4, set: setD4, ph: 'ex : 18.85' },
              { label: 'e — Excentricité (mm)',         val: e,  set: setE,  ph: 'ex : 0.425' },
              { label: 'L — Profondeur / longueur (mm)',val: prof,set: setProf, ph: 'ex : 40' },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label style={S.label}>{label}</label>
                <input
                  style={S.input}
                  type="number"
                  step="0.001"
                  placeholder={ph}
                  value={val}
                  onChange={ev => set(ev.target.value)}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
            ))}
            <div>
              <label style={S.label}>P — Nombre de lobes</label>
              <select
                style={{ ...S.input, cursor: 'pointer' }}
                value={lobes}
                onChange={ev => setLobes(ev.target.value)}
                onFocus={focusInput}
                onBlur={blurInput}
              >
                <option value="3">P3C — 3 lobes</option>
                <option value="4">P4C — 4 lobes</option>
                <option value="5">P5C — 5 lobes</option>
                <option value="6">P6C — 6 lobes</option>
              </select>
            </div>
          </div>

          {error && <div style={S.error}>⚠ {error}</div>}

          <button
            style={S.btnPrimary}
            onClick={handleCalculate}
            onMouseEnter={e => e.target.style.background = '#16305c'}
            onMouseLeave={e => e.target.style.background = '#1a3a6e'}
          >
            Calculer le profil
          </button>
        </div>

        {result && (
          <>
            {/* Results */}
            <div style={{ ...S.grid2, marginBottom: 20 }}>
              {[
                { label: 'Ø Mini calculé',    value: result.dMini, unit: 'mm', accent: false },
                { label: 'Ø Maxi calculé',    value: result.dMaxi, unit: 'mm', accent: false },
                { label: 'Rm — Rayon moyen',  value: result.Rm,    unit: 'mm', accent: true  },
                { label: 'Pas angulaire',      value: '0.01',       unit: '° — ' + result.nbPoints.toLocaleString('fr') + ' pts', accent: false },
              ].map(({ label, value, unit, accent }) => (
                <div key={label} style={S.resultBox(accent)}>
                  <div style={S.resultLabel(accent)}>{label}</div>
                  <div style={S.resultValue(accent)}>{value}</div>
                  <div style={S.resultUnit(accent)}>{unit}</div>
                </div>
              ))}
            </div>

            {/* Canvas */}
            <div style={S.card}>
              <div style={S.cardTitle}>Visualisation du profil — Vue de face</div>
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                style={{ width: '100%', borderRadius: 4, background: '#fafaf8', display: 'block' }}
              />
              <div style={{ fontSize: 10, color: '#ccc', fontFamily: "'DM Mono', monospace", marginTop: 12, textAlign: 'center' }}>
                Profil calculé avec incrément α = 0.01° · Norme DIN 32712 : 2012-03 · P{lobes}C
              </div>
            </div>

            {/* Formulas */}
            <div style={S.card}>
              <div style={S.cardTitle}>Formules appliquées — DIN 32712 : 2012-03</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#555', lineHeight: 2 }}>
                <div>x(α) = [Rm − e·cos({lobes}α)]·cos(α) − {lobes}·e·sin({lobes}α)·sin(α)</div>
                <div>y(α) = [Rm − e·cos({lobes}α)]·sin(α) + {lobes}·e·sin({lobes}α)·cos(α)</div>
                <div style={{ marginTop: 10, color: '#bbb', fontSize: 11 }}>
                  Rm = d₄/2 = {result.Rm} mm &nbsp;|&nbsp; e = {e} mm &nbsp;|&nbsp; P = {lobes} lobes &nbsp;|&nbsp; Profondeur = {prof} mm
                </div>
              </div>
            </div>

            {/* Download */}
            <button
              style={S.btnSecondary}
              onClick={handleDownload}
              onMouseEnter={e => { e.target.style.background = '#1a3a6e'; e.target.style.color = '#fff' }}
              onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.color = '#1a3a6e' }}
            >
              ↓ Télécharger le fichier DXF
            </button>
            <div style={{ fontSize: 11, color: '#ccc', fontFamily: "'DM Mono', monospace", textAlign: 'center', marginTop: 10, marginBottom: 32 }}>
              Format DXF compatible ESPRIT CAM · Import direct dans votre logiciel FAO
            </div>
          </>
        )}
      </div>
    </div>
  )
}
