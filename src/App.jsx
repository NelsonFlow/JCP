import { useState, useRef, useEffect } from 'react'

function generateProfile(d4, e, P = 4, step = 0.01) {
  const Rm = d4 / 2.0
  const points = []
  for (let deg = 0; deg <= 360; deg += step) {
    const a = (deg * Math.PI) / 180
    const x = (Rm - e * Math.cos(P * a)) * Math.cos(a) - P * e * Math.sin(P * a) * Math.sin(a)
    const y = (Rm - e * Math.cos(P * a)) * Math.sin(a) + P * e * Math.sin(P * a) * Math.cos(a)
    points.push({ x, y })
  }
  return points
}

function computeCotes(d4, e, P = 4, step = 0.01) {
  const pts = generateProfile(d4, e, P, step)
  const rs = pts.map(({ x, y }) => Math.sqrt(x * x + y * y))
  return {
    Rm: (d4 / 2).toFixed(4),
    dMini: (Math.min(...rs) * 2).toFixed(4),
    dMaxi: (Math.max(...rs) * 2).toFixed(4),
    nbPoints: pts.length,
  }
}

function generateSTEP(points, profondeur, d4, e, P) {
  const now = new Date().toISOString().slice(0, 19)
  const nb = points.length - 1
  let idx = 1
  const entities = []
  const add = (line) => { entities.push(`#${idx}=${line};`); return idx++ }
  const pntBas = []
  for (let i = 0; i < nb; i++) {
    pntBas.push(add(`CARTESIAN_POINT('', (${points[i].x.toFixed(6)}, ${points[i].y.toFixed(6)}, 0.0))`))
  }
  const pntHaut = []
  for (let i = 0; i < nb; i++) {
    pntHaut.push(add(`CARTESIAN_POINT('', (${points[i].x.toFixed(6)}, ${points[i].y.toFixed(6)}, ${parseFloat(profondeur).toFixed(6)}))`))
  }
  const knots = [0.0, ...Array.from({ length: nb }, (_, i) => i / (nb - 1)), 1.0]
  const knotStr = '(' + knots.map(k => k.toFixed(6)).join(',') + ')'
  const multStr = '(' + Array(nb + 2).fill('1').join(',') + ')'
  const listBas  = '(' + pntBas.map(i => `#${i}`).join(',') + ')'
  const listHaut = '(' + pntHaut.map(i => `#${i}`).join(',') + ')'
  add(`B_SPLINE_CURVE_WITH_KNOTS('PROFIL_BAS',1,${listBas},.UNSPECIFIED.,.T.,.F.,${multStr},${knotStr},.PIECEWISE_BEZIER_KNOTS.)`)
  add(`B_SPLINE_CURVE_WITH_KNOTS('PROFIL_HAUT',1,${listHaut},.UNSPECIFIED.,.T.,.F.,${multStr},${knotStr},.PIECEWISE_BEZIER_KNOTS.)`)
  return `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Profil Polygone DIN 32712:2012-03 P${P}C - d4=${d4}mm - e=${e}mm - L=${profondeur}mm'),'2;1');\nFILE_NAME('profil_DIN32712_P${P}C.step','${now}',('Nelson Flow'),('Client'),'Generateur DIN32712 v1.0','DIN 32712:2012-03','');\nFILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));\nENDSEC;\nDATA;\n${entities.join('\n')}\nENDSEC;\nEND-ISO-10303-21;`
}

function drawCanvas(canvas, points, d4, e, cotes) {
  if (!canvas || !points.length) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#fafaf8'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 0.5
  for (let i = 0; i <= 20; i++) {
    ctx.beginPath(); ctx.moveTo((i*W)/20,0); ctx.lineTo((i*W)/20,H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0,(i*H)/20); ctx.lineTo(W,(i*H)/20); ctx.stroke()
  }
  ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=1; ctx.setLineDash([5,4])
  ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,H); ctx.stroke()
  ctx.setLineDash([])
  const scale = (W*0.40)/(parseFloat(cotes.dMaxi)/2)
  ctx.strokeStyle='rgba(180,140,60,0.35)'; ctx.lineWidth=1; ctx.setLineDash([5,3])
  ctx.beginPath(); ctx.arc(cx,cy,(parseFloat(d4)/2)*scale,0,2*Math.PI); ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath(); ctx.moveTo(cx+points[0].x*scale, cy-points[0].y*scale)
  for(let i=1;i<points.length;i++) ctx.lineTo(cx+points[i].x*scale, cy-points[i].y*scale)
  ctx.closePath(); ctx.fillStyle='rgba(26,58,110,0.07)'; ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx+points[0].x*scale, cy-points[0].y*scale)
  for(let i=1;i<points.length;i++) ctx.lineTo(cx+points[i].x*scale, cy-points[i].y*scale)
  ctx.closePath(); ctx.strokeStyle='#1a3a6e'; ctx.lineWidth=2; ctx.stroke()
  ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1
  ctx.beginPath(); ctx.moveTo(cx-7,cy); ctx.lineTo(cx+7,cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx,cy-7); ctx.lineTo(cx,cy+7); ctx.stroke()
  ctx.font="10px 'DM Mono',monospace"
  ctx.fillStyle='rgba(150,110,40,0.9)'; ctx.fillText(`Rm = ${cotes.Rm} mm`, cx+(parseFloat(d4)/2)*scale+8, cy-5)
  ctx.fillStyle='#1a3a6e'
  ctx.fillText(`Ø mini = ${cotes.dMini} mm`, cx+8, cy+18)
  ctx.fillText(`Ø maxi = ${cotes.dMaxi} mm`, cx+8, cy+32)
}

const S = {
  page:{minHeight:'100vh',background:'#f2f1ed',fontFamily:"'DM Sans',sans-serif"},
  header:{background:'#1a3a6e',padding:'20px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'},
  headerSub:{fontSize:'10px',color:'rgba(255,255,255,0.45)',letterSpacing:'3px',fontFamily:"'DM Mono',monospace",marginBottom:'4px',textTransform:'uppercase'},
  headerTitle:{fontSize:'20px',color:'#fff',fontWeight:500},
  headerRight:{fontSize:'10px',color:'rgba(255,255,255,0.25)',fontFamily:"'DM Mono',monospace",textAlign:'right',lineHeight:1.8},
  container:{maxWidth:'820px',margin:'0 auto',padding:'32px 24px'},
  card:{background:'#fff',border:'1px solid #e4e1d9',borderRadius:'8px',padding:'28px',marginBottom:'20px'},
  cardTitle:{fontSize:'10px',color:'#aaa',fontFamily:"'DM Mono',monospace",letterSpacing:'2px',textTransform:'uppercase',marginBottom:'22px',paddingBottom:'12px',borderBottom:'1px solid #f0ede6'},
  label:{display:'block',fontSize:'11px',fontFamily:"'DM Mono',monospace",letterSpacing:'1px',color:'#999',marginBottom:'7px',textTransform:'uppercase'},
  input:{width:'100%',padding:'11px 14px',fontSize:'15px',fontFamily:"'DM Mono',monospace",background:'#fdfdfc',border:'1px solid #e0ddd6',borderRadius:'5px',color:'#1a1a1a',outline:'none',transition:'border-color 0.15s'},
  btnPrimary:{width:'100%',padding:'14px',background:'#1a3a6e',color:'#fff',border:'none',borderRadius:'5px',fontSize:'12px',fontFamily:"'DM Mono',monospace",letterSpacing:'2.5px',cursor:'pointer',textTransform:'uppercase'},
  btnSecondary:{width:'100%',padding:'14px',background:'#fff',color:'#1a3a6e',border:'1.5px solid #1a3a6e',borderRadius:'5px',fontSize:'12px',fontFamily:"'DM Mono',monospace",letterSpacing:'2.5px',cursor:'pointer'},
  error:{background:'#fff5f5',border:'1px solid #ffd0d0',borderRadius:'5px',padding:'10px 14px',fontSize:'13px',color:'#c00',marginBottom:'16px',fontFamily:"'DM Mono',monospace"},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'},
  resultBox:(a)=>({background:a?'#1a3a6e':'#fdfdfc',border:`1px solid ${a?'#1a3a6e':'#e4e1d9'}`,borderRadius:'6px',padding:'18px 20px'}),
  resultLabel:(a)=>({fontSize:'10px',fontFamily:"'DM Mono',monospace",letterSpacing:'1.5px',color:a?'rgba(255,255,255,0.5)':'#aaa',marginBottom:'6px',textTransform:'uppercase'}),
  resultValue:(a)=>({fontSize:'22px',color:a?'#fff':'#1a1a1a',fontFamily:"'DM Mono',monospace",fontWeight:600}),
  resultUnit:(a)=>({fontSize:'11px',color:a?'rgba(255,255,255,0.4)':'#ccc',fontFamily:"'DM Mono',monospace",marginTop:'2px'}),
}

export default function App() {
  const [d4,setD4]=useState(''), [e,setE]=useState(''), [prof,setProf]=useState('')
  const [lobes,setLobes]=useState('4'), [pas,setPas]=useState('0.01')
  const [result,setResult]=useState(null), [points,setPoints]=useState([]), [error,setError]=useState('')
  const canvasRef=useRef(null)

  useEffect(()=>{ if(result&&points.length&&canvasRef.current) drawCanvas(canvasRef.current,points,d4,e,result) },[result,points])

  function handleCalculate() {
    setError('')
    const d4v=parseFloat(d4), ev=parseFloat(e), pv=parseInt(lobes), profv=parseFloat(prof), pasv=parseFloat(pas)
    if(isNaN(d4v)||isNaN(ev)||isNaN(pv)||isNaN(profv)||isNaN(pasv)){setError('Veuillez remplir tous les champs.');return}
    if(d4v<=0||ev<=0||profv<=0){setError('Toutes les valeurs doivent être supérieures à 0.');return}
    if(ev>=d4v/2){setError(`e doit être inférieur à d₄/2 (${(d4v/2).toFixed(4)} mm).`);return}
    if(pasv<=0||pasv>1){setError('Le pas angulaire doit être entre 0.001° et 1°.');return}
    const pts = generateProfile(d4v,ev,pv,pasv)
    setPoints(pts)
    setResult(computeCotes(d4v,ev,pv,pasv))
  }

  function handleDownload() {
    if(!points.length) return
    const step=generateSTEP(points,prof,d4,e,lobes)
    const blob=new Blob([step],{type:'application/step'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a')
    a.href=url; a.download=`profil_DIN32712_P${lobes}C_d${d4}_e${e}.step`; a.click()
    URL.revokeObjectURL(url)
  }

  const fi=e=>{e.target.style.borderColor='#1a3a6e'}
  const bi=e=>{e.target.style.borderColor='#e0ddd6'}

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.headerSub}>Norme DIN 32712 · Polygone P{lobes}C</div>
          <div style={S.headerTitle}>Générateur de Profil Polygone</div>
        </div>
        <div style={S.headerRight}><div>ESPRIT CAM</div><div>FANUC COMPATIBLE</div><div style={{marginTop:4,color:'rgba(255,255,255,0.15)'}}>Nelson Flow © 2026</div></div>
      </div>
      <div style={S.container}>
        <div style={S.card}>
          <div style={S.cardTitle}>Paramètres d'entrée</div>
          <div style={{...S.grid2,marginBottom:18}}>
            {[
              {label:'Ø d₄ — Diamètre nominal (mm)',val:d4,set:setD4,ph:'ex : 18.85'},
              {label:'e — Excentricité (mm)',val:e,set:setE,ph:'ex : 0.425'},
              {label:'L — Profondeur / longueur (mm)',val:prof,set:setProf,ph:'ex : 40'},
              {label:'Pas angulaire (°)',val:pas,set:setPas,ph:'ex : 0.01',step:'0.001'},
            ].map(({label,val,set,ph,step})=>(
              <div key={label}>
                <label style={S.label}>{label}</label>
                <input style={S.input} type="number" step={step||'0.001'} placeholder={ph} value={val}
                  onChange={ev=>set(ev.target.value)} onFocus={fi} onBlur={bi}/>
              </div>
            ))}
            <div>
              <label style={S.label}>P — Nombre de lobes</label>
              <select style={{...S.input,cursor:'pointer'}} value={lobes} onChange={ev=>setLobes(ev.target.value)} onFocus={fi} onBlur={bi}>
                <option value="3">P3C — 3 lobes</option>
                <option value="4">P4C — 4 lobes</option>
                <option value="5">P5C — 5 lobes</option>
                <option value="6">P6C — 6 lobes</option>
              </select>
            </div>
          </div>
          {error&&<div style={S.error}>⚠ {error}</div>}
          <button style={S.btnPrimary} onClick={handleCalculate}
            onMouseEnter={e=>e.target.style.background='#16305c'}
            onMouseLeave={e=>e.target.style.background='#1a3a6e'}>
            Calculer le profil
          </button>
        </div>
        {result&&(
          <>
            <div style={{...S.grid2,marginBottom:20}}>
              {[
                {label:'Ø Mini calculé',value:result.dMini,unit:'mm',accent:false},
                {label:'Ø Maxi calculé',value:result.dMaxi,unit:'mm',accent:false},
                {label:'Rm — Rayon moyen',value:result.Rm,unit:'mm',accent:true},
                {label:'Pas angulaire',value:pas,unit:`° — ${result.nbPoints.toLocaleString('fr')} pts`,accent:false},
              ].map(({label,value,unit,accent})=>(
                <div key={label} style={S.resultBox(accent)}>
                  <div style={S.resultLabel(accent)}>{label}</div>
                  <div style={S.resultValue(accent)}>{value}</div>
                  <div style={S.resultUnit(accent)}>{unit}</div>
                </div>
              ))}
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Visualisation du profil — Vue de face</div>
              <canvas ref={canvasRef} width={720} height={480} style={{width:'100%',borderRadius:4,background:'#fafaf8',display:'block'}}/>
              <div style={{fontSize:10,color:'#ccc',fontFamily:"'DM Mono',monospace",marginTop:12,textAlign:'center'}}>
                Profil calculé avec incrément α = {pas}° · Norme DIN 32712 : 2012-03 · P{lobes}C
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Formules appliquées — DIN 32712 : 2012-03</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'#555',lineHeight:2}}>
                <div>x(α) = [Rm − e·cos({lobes}α)]·cos(α) − {lobes}·e·sin({lobes}α)·sin(α)</div>
                <div>y(α) = [Rm − e·cos({lobes}α)]·sin(α) + {lobes}·e·sin({lobes}α)·cos(α)</div>
                <div style={{marginTop:10,color:'#bbb',fontSize:11}}>
                  Rm = d₄/2 = {result.Rm} mm &nbsp;|&nbsp; e = {e} mm &nbsp;|&nbsp; P = {lobes} lobes &nbsp;|&nbsp; Profondeur = {prof} mm &nbsp;|&nbsp; Pas = {pas}°
                </div>
              </div>
            </div>
            <button style={S.btnSecondary} onClick={handleDownload}
              onMouseEnter={e=>{e.target.style.background='#1a3a6e';e.target.style.color='#fff'}}
              onMouseLeave={e=>{e.target.style.background='#fff';e.target.style.color='#1a3a6e'}}>
              ↓ Télécharger le fichier STEP
            </button>
            <div style={{fontSize:11,color:'#ccc',fontFamily:"'DM Mono',monospace",textAlign:'center',marginTop:10,marginBottom:32}}>
              Format STEP AP203 compatible ESPRIT CAM · Import direct dans votre logiciel FAO
            </div>
          </>
        )}
      </div>
    </div>
  )
}
