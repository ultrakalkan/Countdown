import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "countdown-arcade-v1";
const MONTHS_TR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const DAYS_TR = ["Pz","Pt","Sa","Ça","Pe","Cu","Ct"];

const CARD_THEMES = [
  { name:"🔥 Ateş",   glow:"#ff4d00", grad:"linear-gradient(135deg,#ff4d00,#ff9500)", dark:"#1a0800", mid:"#2a1200" },
  { name:"💜 Mor",    glow:"#c061f7", grad:"linear-gradient(135deg,#9b59b6,#e056fd)", dark:"#0e0016", mid:"#1a0028" },
  { name:"🩵 Buz",    glow:"#00c8ff", grad:"linear-gradient(135deg,#0080ff,#00c8ff)", dark:"#00080f", mid:"#001525" },
  { name:"💚 Matrix", glow:"#00ff88", grad:"linear-gradient(135deg,#00ff88,#00e5cc)", dark:"#000f08", mid:"#001a10" },
  { name:"🌸 Pembe",  glow:"#ff6eb4", grad:"linear-gradient(135deg,#ff6eb4,#ffb347)", dark:"#160009", mid:"#240015" },
];

function pad(n) { return String(n).padStart(2,"0"); }

function parseInput(val) {
  const parts = val.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  if (parts.length === 2) return parts[0]*60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

function calcRemaining(ts) {
  const diff = Math.max(0, Math.floor((ts - Date.now()) / 1000));
  return { d:Math.floor(diff/86400), h:Math.floor((diff%86400)/3600), m:Math.floor((diff%3600)/60), s:diff%60, total:diff };
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage(timers) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(timers)); } catch {}
}

// ── Parçacık Patlaması ───────────────────────────────────────
function Particles({ active, color }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const particles = Array.from({length:60}, () => ({
      x:W/2, y:H/2,
      vx:(Math.random()-0.5)*14, vy:(Math.random()-0.5)*14,
      r:Math.random()*4+1, alpha:1,
    }));
    const tick = () => {
      ctx.clearRect(0,0,W,H);
      particles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.25; p.alpha-=0.016; p.r*=0.99;
        if (p.alpha > 0) {
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          ctx.fillStyle = color + Math.floor(p.alpha*255).toString(16).padStart(2,"0");
          ctx.fill();
        }
      });
      if (particles.some(p=>p.alpha>0)) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, color]);
  return <canvas ref={canvasRef} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",borderRadius:20 }} />;
}

// ── Dijital Blok ─────────────────────────────────────────────
function DigitBlock({ value, label, color, big=true }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:big?52:36, fontWeight:400, lineHeight:1,
        color, textShadow:`0 0 20px ${color}, 0 0 40px ${color}88`, letterSpacing:2, transition:"all 0.15s" }}>
        {pad(value)}
      </div>
      {label && <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:color+"88",letterSpacing:3 }}>{label}</div>}
    </div>
  );
}

function Colon({ color }) {
  const [vis,setVis] = useState(true);
  useEffect(() => { const iv = setInterval(()=>setVis(v=>!v), 500); return ()=>clearInterval(iv); }, []);
  return <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:44,color,opacity:vis?1:0.15,transition:"opacity 0.1s",lineHeight:1,alignSelf:"flex-start",marginTop:4 }}>:</div>;
}

// ── Süre Kartı ───────────────────────────────────────────────
function TimerCard({ timer, onUpdate, onDelete }) {
  const theme = CARD_THEMES[timer.themeIdx||0];
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(timer.seconds);
  const [finished, setFinished] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const intRef = useRef(null);

  useEffect(() => { setRemaining(timer.seconds); setRunning(false); setFinished(false); setUrgent(false); }, [timer.seconds]);

  useEffect(() => {
    if (running) {
      intRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) { clearInterval(intRef.current); setRunning(false); setFinished(true); return 0; }
          if (prev <= 10) setUrgent(true);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intRef.current);
  }, [running]);

  const pct = timer.seconds > 0 ? remaining / timer.seconds : 0;
  const h = Math.floor(remaining/3600), m = Math.floor((remaining%3600)/60), s = remaining%60;
  const reset = () => { clearInterval(intRef.current); setRunning(false); setRemaining(timer.seconds); setFinished(false); setUrgent(false); };

  return (
    <div style={{ background:`linear-gradient(160deg,${theme.mid},${theme.dark})`, border:`1px solid ${theme.glow}33`, borderRadius:20, padding:"24px 20px",
      display:"flex",flexDirection:"column",alignItems:"center",gap:16, position:"relative", overflow:"hidden",
      boxShadow: finished?`0 0 50px ${theme.glow}99`:`0 0 20px ${theme.glow}22`,
      animation: finished?"cardPulse 0.7s ease infinite alternate": urgent?"urgentPulse 0.4s ease infinite alternate":"none",
      transition:"box-shadow 0.5s", minWidth:0 }}>

      <div style={{ position:"absolute",inset:0,opacity:0.04,
        backgroundImage:`linear-gradient(${theme.glow} 1px,transparent 1px),linear-gradient(90deg,${theme.glow} 1px,transparent 1px)`,
        backgroundSize:"20px 20px",borderRadius:20,pointerEvents:"none" }} />

      <Particles active={finished} color={theme.glow} />

      <button onClick={onDelete} style={{ position:"absolute",top:12,right:12,background:"none",border:"none",cursor:"pointer",color:theme.glow+"33",fontSize:14,padding:4,transition:"color 0.2s",zIndex:2 }}
        onMouseOver={e=>e.target.style.color=theme.glow} onMouseOut={e=>e.target.style.color=theme.glow+"33"}>✕</button>
      <div style={{ position:"absolute",top:14,left:16,fontFamily:"'Share Tech Mono',monospace",fontSize:8,letterSpacing:3,color:theme.glow+"55" }}>⏱ SÜRE</div>

      <input value={timer.label} onChange={e=>onUpdate({label:e.target.value})} placeholder="İsim ver…"
        style={{ background:"none",border:"none",outline:"none",color:theme.glow+"cc",fontSize:12,textAlign:"center",fontFamily:"'Share Tech Mono',monospace",letterSpacing:2,width:"85%",borderBottom:`1px solid ${theme.glow}33`,paddingBottom:4,marginTop:14 }} />

      {finished ? (
        <div style={{ textAlign:"center",padding:"20px 0" }}>
          <div style={{ fontSize:52,animation:"bounce 0.5s ease infinite alternate" }}>🎯</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:16,color:theme.glow,letterSpacing:3,marginTop:8,textShadow:`0 0 20px ${theme.glow}` }}>TAMAM!</div>
        </div>
      ) : (
        <div style={{ display:"flex",alignItems:"center",gap:6,padding:"10px 0" }}>
          {h>0 && <><DigitBlock value={h} label="sa" color={theme.glow} /><Colon color={theme.glow} /></>}
          <DigitBlock value={m} label="dk" color={theme.glow} big={!h} />
          <Colon color={theme.glow} />
          <DigitBlock value={s} label="sn" color={theme.glow} />
        </div>
      )}

      {/* Segmentli bar */}
      <div style={{ width:"100%",display:"flex",gap:3 }}>
        {Array.from({length:20}).map((_,i)=>(
          <div key={i} style={{ flex:1,height:5,borderRadius:2,
            background: i/20 < pct ? theme.glow : theme.glow+"15",
            boxShadow: i/20 < pct ? `0 0 6px ${theme.glow}` : "none",
            transition:"background 1s" }} />
        ))}
      </div>

      <div style={{ display:"flex",gap:8,width:"100%" }}>
        <button onClick={()=>setRunning(r=>!r)} disabled={finished||remaining===0}
          style={{ flex:1,background:running?"transparent":theme.grad,border:`1px solid ${theme.glow}`,color:running?theme.glow:"#000",borderRadius:10,padding:"10px",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:12,letterSpacing:1,transition:"all 0.2s",opacity:(finished||remaining===0)?0.3:1 }}>
          {running?"⏸ DURDUR":"▶ BAŞLAT"}
        </button>
        <button onClick={reset}
          style={{ background:"transparent",border:`1px solid ${theme.glow}33`,color:theme.glow+"77",borderRadius:10,padding:"10px 14px",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:14,transition:"all 0.2s" }}
          onMouseOver={e=>{e.currentTarget.style.borderColor=theme.glow;e.currentTarget.style.color=theme.glow;}}
          onMouseOut={e=>{e.currentTarget.style.borderColor=theme.glow+"33";e.currentTarget.style.color=theme.glow+"77";}}>↺</button>
      </div>
    </div>
  );
}

// ── Tarih Kartı ──────────────────────────────────────────────
function DateCountdownCard({ timer, onUpdate, onDelete }) {
  const theme = CARD_THEMES[timer.themeIdx||0];
  const [rem, setRem] = useState(()=>calcRemaining(timer.targetTs));
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    const iv = setInterval(()=>{ const r=calcRemaining(timer.targetTs); setRem(r); if(r.total===0) setFinished(true); },1000);
    return ()=>clearInterval(iv);
  },[timer.targetTs]);

  const totalSecs = Math.max(1, Math.floor((timer.targetTs - timer.createdAt)/1000));
  const pct = rem.total/totalSecs;
  const tDate = new Date(timer.targetTs);
  const dateStr = `${tDate.getDate()} ${MONTHS_TR[tDate.getMonth()]} ${tDate.getFullYear()}`;

  return (
    <div style={{ background:`linear-gradient(160deg,${theme.mid},${theme.dark})`, border:`1px solid ${theme.glow}33`, borderRadius:20, padding:"24px 20px",
      display:"flex",flexDirection:"column",alignItems:"center",gap:16, position:"relative", overflow:"hidden",
      boxShadow: finished?`0 0 50px ${theme.glow}99`:`0 0 20px ${theme.glow}22`, minWidth:0 }}>

      <div style={{ position:"absolute",inset:0,opacity:0.04,
        backgroundImage:`linear-gradient(${theme.glow} 1px,transparent 1px),linear-gradient(90deg,${theme.glow} 1px,transparent 1px)`,
        backgroundSize:"20px 20px",borderRadius:20,pointerEvents:"none" }} />
      <Particles active={finished} color={theme.glow} />

      <button onClick={onDelete} style={{ position:"absolute",top:12,right:12,background:"none",border:"none",cursor:"pointer",color:theme.glow+"33",fontSize:14,padding:4,transition:"color 0.2s",zIndex:2 }}
        onMouseOver={e=>e.target.style.color=theme.glow} onMouseOut={e=>e.target.style.color=theme.glow+"33"}>✕</button>
      <div style={{ position:"absolute",top:14,left:16,fontFamily:"'Share Tech Mono',monospace",fontSize:8,letterSpacing:3,color:theme.glow+"55" }}>📅 TARİH</div>

      <input value={timer.label} onChange={e=>onUpdate({label:e.target.value})} placeholder="İsim ver…"
        style={{ background:"none",border:"none",outline:"none",color:theme.glow+"cc",fontSize:12,textAlign:"center",fontFamily:"'Share Tech Mono',monospace",letterSpacing:2,width:"85%",borderBottom:`1px solid ${theme.glow}33`,paddingBottom:4,marginTop:14 }} />

      {finished ? (
        <div style={{ textAlign:"center",padding:"16px 0" }}>
          <div style={{ fontSize:52 }}>🎉</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:16,color:theme.glow,letterSpacing:3,marginTop:8,textShadow:`0 0 20px ${theme.glow}` }}>GELDİ!</div>
        </div>
      ) : (
        <>
          {rem.d > 0 && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:72,fontWeight:400,lineHeight:1,color:theme.glow,textShadow:`0 0 30px ${theme.glow}, 0 0 60px ${theme.glow}44`,letterSpacing:4 }}>
                {String(rem.d).padStart(3,"0")}
              </div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:theme.glow+"77",letterSpacing:4,marginTop:4 }}>GÜN KALDI</div>
            </div>
          )}
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <DigitBlock value={rem.h} label="sa" color={theme.glow} big={false} />
            <Colon color={theme.glow} />
            <DigitBlock value={rem.m} label="dk" color={theme.glow} big={false} />
            <Colon color={theme.glow} />
            <DigitBlock value={rem.s} label="sn" color={theme.glow} big={false} />
          </div>
        </>
      )}

      <div style={{ width:"100%",display:"flex",gap:3 }}>
        {Array.from({length:20}).map((_,i)=>(
          <div key={i} style={{ flex:1,height:5,borderRadius:2,
            background: i/20 < pct ? theme.glow : theme.glow+"15",
            boxShadow: i/20 < pct ? `0 0 6px ${theme.glow}` : "none",
            transition:"background 1s" }} />
        ))}
      </div>

      <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:theme.glow+"55",letterSpacing:2 }}>{dateStr}</div>
    </div>
  );
}

// ── Takvim ───────────────────────────────────────────────────
function Calendar({ calYear, calMonth, selectedDate, onSelect, onPrev, onNext, color }) {
  const today = new Date();
  const firstDay = new Date(calYear,calMonth,1).getDay();
  const daysInMonth = new Date(calYear,calMonth+1,0).getDate();
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const isToday = d=>d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
  const isPast = d=>new Date(calYear,calMonth,d)<new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const isSel = d=>selectedDate&&d===new Date(selectedDate).getDate()&&calMonth===new Date(selectedDate).getMonth()&&calYear===new Date(selectedDate).getFullYear();

  return (
    <div style={{ background:"#050510",borderRadius:12,padding:"12px 10px",border:`1px solid ${color}22` }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
        <button onClick={onPrev} style={{ background:"none",border:"none",color:color+"77",cursor:"pointer",fontSize:20,padding:"0 8px",transition:"color 0.2s" }} onMouseOver={e=>e.target.style.color=color} onMouseOut={e=>e.target.style.color=color+"77"}>‹</button>
        <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:12,color,letterSpacing:2 }}>{MONTHS_TR[calMonth]} {calYear}</span>
        <button onClick={onNext} style={{ background:"none",border:"none",color:color+"77",cursor:"pointer",fontSize:20,padding:"0 8px",transition:"color 0.2s" }} onMouseOver={e=>e.target.style.color=color} onMouseOut={e=>e.target.style.color=color+"77"}>›</button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6 }}>
        {DAYS_TR.map(d=><div key={d} style={{ textAlign:"center",fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:color+"44",letterSpacing:0.5 }}>{d}</div>)}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3 }}>
        {cells.map((d,i)=>(
          <button key={i} disabled={!d||isPast(d)} onClick={()=>d&&!isPast(d)&&onSelect(new Date(calYear,calMonth,d).toISOString())}
            style={{ width:"100%",aspectRatio:"1",border:"none",borderRadius:6,cursor:(!d||isPast(d))?"default":"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11,transition:"all 0.15s",
              background: isSel(d)?color:isToday(d)?color+"22":"transparent",
              color: !d?"transparent":isPast(d)?"#252535":isSel(d)?"#000":isToday(d)?color:"#777",
              fontWeight:(isSel(d)||isToday(d))?700:400,
              boxShadow:isSel(d)?`0 0 10px ${color}`:"none" }}>
            {d||""}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────
const PRESETS = [{label:"5 dk",s:300},{label:"15 dk",s:900},{label:"25 dk",s:1500},{label:"1 sa",s:3600}];

function AddTimerModal({ onAdd, onClose }) {
  const [tab,setTab]=useState("sure");
  const [input,setInput]=useState("");
  const [label,setLabel]=useState("");
  const [themeIdx,setThemeIdx]=useState(0);
  const [error,setError]=useState("");
  const today=new Date();
  const [calYear,setCalYear]=useState(today.getFullYear());
  const [calMonth,setCalMonth]=useState(today.getMonth());
  const [selectedDate,setSelectedDate]=useState(null);
  const [selHour,setSelHour]=useState("09");
  const [selMin,setSelMin]=useState("00");
  const theme=CARD_THEMES[themeIdx];

  const handleAdd=()=>{
    setError("");
    if(tab==="sure"){
      const secs=parseInput(input.trim());
      if(!secs||secs<=0){setError("Geçerli bir süre gir (ör: 25:00)");return;}
      onAdd({type:"duration",label:label||"Sayaç",seconds:secs,themeIdx});
    } else {
      if(!selectedDate){setError("Bir tarih seç");return;}
      const target=new Date(selectedDate);
      target.setHours(Number(selHour),Number(selMin),0,0);
      if(target<=new Date()){setError("Geçmiş tarih/saat seçildi");return;}
      onAdd({type:"date",label:label||"Etkinlik",targetTs:target.getTime(),createdAt:Date.now(),themeIdx});
    }
    onClose();
  };

  const inp = { background:"#050510",border:`1px solid ${theme.glow}44`,borderRadius:8,color:theme.glow,padding:"10px 12px",fontFamily:"'Share Tech Mono',monospace",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",letterSpacing:1 };

  return (
    <div style={{ position:"fixed",inset:0,background:"#000000bb",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(8px)" }}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:"#08080f",border:`1px solid ${theme.glow}44`,borderRadius:20,padding:"28px 24px",width:360,display:"flex",flexDirection:"column",gap:14,boxShadow:`0 0 40px ${theme.glow}22,0 24px 64px #000c`,maxHeight:"92vh",overflowY:"auto" }}>

        <h2 style={{ margin:0,fontFamily:"'Share Tech Mono',monospace",fontSize:14,letterSpacing:3,color:theme.glow,textShadow:`0 0 10px ${theme.glow}` }}>+ YENİ SAYAÇ</h2>

        <div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"#444",letterSpacing:3,marginBottom:8 }}>TEMA:</div>
          <div style={{ display:"flex",gap:6 }}>
            {CARD_THEMES.map((t,i)=>(
              <button key={i} onClick={()=>setThemeIdx(i)}
                style={{ flex:1,height:30,border:`1px solid ${i===themeIdx?t.glow:"#222"}`,borderRadius:6,background:i===themeIdx?t.grad:"transparent",cursor:"pointer",fontSize:14,transition:"all 0.2s",boxShadow:i===themeIdx?`0 0 10px ${t.glow}`:"none" }}>
                {t.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"flex",gap:4,background:"#050510",borderRadius:10,padding:4 }}>
          {[["sure","⏱ SÜRE"],["tarih","📅 TARİH"]].map(([k,l])=>(
            <button key={k} onClick={()=>{setTab(k);setError("");}}
              style={{ flex:1,padding:"9px 0",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:1,transition:"all 0.2s",
                background:tab===k?theme.grad:"transparent",color:tab===k?"#000":theme.glow+"66",
                boxShadow:tab===k?`0 0 12px ${theme.glow}`:"none" }}>
              {l}
            </button>
          ))}
        </div>

        <input placeholder="İSİM (opsiyonel)" value={label} onChange={e=>setLabel(e.target.value)} style={inp} />

        {tab==="sure" ? (
          <>
            <input placeholder="SÜRE: 25:00 veya 1:30:00" value={input}
              onChange={e=>{setInput(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&handleAdd()}
              style={inp} autoFocus />
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {PRESETS.map(p=>(
                <button key={p.label} onClick={()=>setInput(pad(Math.floor(p.s/60))+":00")}
                  style={{ background:"transparent",border:`1px solid ${theme.glow}44`,color:theme.glow+"99",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontFamily:"'Share Tech Mono',monospace",letterSpacing:1,transition:"all 0.2s" }}
                  onMouseOver={e=>{e.currentTarget.style.borderColor=theme.glow;e.currentTarget.style.color=theme.glow;e.currentTarget.style.boxShadow=`0 0 8px ${theme.glow}`;}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor=theme.glow+"44";e.currentTarget.style.color=theme.glow+"99";e.currentTarget.style.boxShadow="none";}}>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <Calendar calYear={calYear} calMonth={calMonth} selectedDate={selectedDate}
              onSelect={setSelectedDate}
              onPrev={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}
              onNext={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}
              color={theme.glow} />
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:theme.glow+"66",letterSpacing:2,whiteSpace:"nowrap" }}>SAAT:</span>
              <input type="number" min={0} max={23} value={selHour} onChange={e=>setSelHour(pad(Math.min(23,Math.max(0,Number(e.target.value)))))} style={{...inp,width:62,textAlign:"center",padding:"8px 4px"}} />
              <span style={{ color:theme.glow,fontSize:18,fontFamily:"'Share Tech Mono',monospace" }}>:</span>
              <input type="number" min={0} max={59} value={selMin} onChange={e=>setSelMin(pad(Math.min(59,Math.max(0,Number(e.target.value)))))} style={{...inp,width:62,textAlign:"center",padding:"8px 4px"}} />
            </div>
            {selectedDate&&(
              <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:theme.glow,textAlign:"center",letterSpacing:2,textShadow:`0 0 8px ${theme.glow}` }}>
                {new Date(selectedDate).getDate()} {MONTHS_TR[new Date(selectedDate).getMonth()]} {new Date(selectedDate).getFullYear()} · {selHour}:{selMin}
              </div>
            )}
          </>
        )}

        {error&&<div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"#ff4444",letterSpacing:1 }}>⚠ {error}</div>}

        <div style={{ display:"flex",gap:8 }}>
          <button onClick={handleAdd} style={{ flex:1,background:theme.grad,border:"none",borderRadius:10,color:"#000",padding:"12px",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:13,letterSpacing:2,fontWeight:700,boxShadow:`0 0 16px ${theme.glow}66`,transition:"box-shadow 0.2s" }}
            onMouseOver={e=>e.currentTarget.style.boxShadow=`0 0 28px ${theme.glow}99`}
            onMouseOut={e=>e.currentTarget.style.boxShadow=`0 0 16px ${theme.glow}66`}>
            EKLE
          </button>
          <button onClick={onClose} style={{ background:"transparent",border:"1px solid #222",borderRadius:10,color:"#444",padding:"12px 16px",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:13 }}>İPTAL</button>
        </div>
      </div>
    </div>
  );
}

// ── Ana Uygulama ─────────────────────────────────────────────
export default function App() {
  const [timers, setTimers] = useState(()=>loadFromStorage());
  const [showModal, setShowModal] = useState(false);

  // Her değişiklikte localStorage'a kaydet
  useEffect(()=>{ saveToStorage(timers); }, [timers]);

  const addTimer = useCallback(t=>setTimers(prev=>[...prev,{...t,id:Date.now()}]),[]);
  const updateTimer = useCallback((id,c)=>setTimers(prev=>prev.map(t=>t.id===id?{...t,...c}:t)),[]);
  const deleteTimer = useCallback(id=>setTimers(prev=>prev.filter(t=>t.id!==id)),[]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes cardPulse { from{box-shadow:0 0 30px var(--glow);} to{box-shadow:0 0 80px var(--glow),0 0 120px var(--glow);} }
        @keyframes urgentPulse { from{opacity:1;} to{opacity:0.55;} }
        @keyframes bounce { from{transform:translateY(0);} to{transform:translateY(-10px);} }
        @keyframes scanline { 0%{transform:translateY(-100%);} 100%{transform:translateY(100vh);} }
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#050510;} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
      `}</style>

      <div style={{ minHeight:"100vh",background:"#030308",padding:"36px 20px 60px",fontFamily:"'Share Tech Mono',monospace",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"fixed",top:0,left:0,right:0,height:2,background:"linear-gradient(transparent,rgba(255,255,255,0.03),transparent)",animation:"scanline 8s linear infinite",pointerEvents:"none",zIndex:1 }} />

        <div style={{ textAlign:"center",marginBottom:52 }}>
          <div style={{ fontSize:9,letterSpacing:6,color:"#2a2a3a",marginBottom:8 }}>[ ZAMAN YÖNETİM SİSTEMİ ]</div>
          <h1 style={{ margin:0,fontSize:42,fontWeight:400,letterSpacing:8,
            background:"linear-gradient(90deg,#ff4d00,#ff9500,#ffcc00,#00ff88,#00c8ff,#c061f7)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>COUNTDOWN</h1>
          <div style={{ marginTop:6,fontSize:9,letterSpacing:4,color:"#1a1a2a" }}>▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</div>
        </div>

        {timers.length===0 ? (
          <div style={{ textAlign:"center",marginTop:80 }}>
            <div style={{ fontSize:52,marginBottom:12 }}>⏱</div>
            <div style={{ fontSize:11,letterSpacing:4,color:"#1e1e2e" }}>[ HENÜZ SAYAÇ YOK ]</div>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:18,maxWidth:1000,margin:"0 auto" }}>
            {timers.map(t=>t.type==="date"
              ? <DateCountdownCard key={t.id} timer={t} onUpdate={c=>updateTimer(t.id,c)} onDelete={()=>deleteTimer(t.id)} />
              : <TimerCard key={t.id} timer={t} onUpdate={c=>updateTimer(t.id,c)} onDelete={()=>deleteTimer(t.id)} />
            )}
          </div>
        )}

        <div style={{ textAlign:"center",marginTop:44 }}>
          <button onClick={()=>setShowModal(true)}
            style={{ background:"transparent",border:"1px solid #2a2a3a",borderRadius:12,color:"#444",padding:"14px 36px",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:13,letterSpacing:3,transition:"all 0.3s" }}
            onMouseOver={e=>{e.currentTarget.style.border="1px solid #ff9500";e.currentTarget.style.color="#ff9500";e.currentTarget.style.boxShadow="0 0 20px #ff950044";e.currentTarget.style.background="#ff950011";}}
            onMouseOut={e=>{e.currentTarget.style.border="1px solid #2a2a3a";e.currentTarget.style.color="#444";e.currentTarget.style.boxShadow="none";e.currentTarget.style.background="transparent";}}>
            + SAYAÇ EKLE
          </button>
        </div>
      </div>

      {showModal&&<AddTimerModal onAdd={addTimer} onClose={()=>setShowModal(false)} />}
    </>
  );
}
