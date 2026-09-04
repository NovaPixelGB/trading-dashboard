import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { supabase } from "./supabase";
import "./styles.css";

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-5 3 3 5-7"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
    trend: <><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    logout: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></>,
    arrowUp: <><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>,
    arrowDown: <><path d="M12 5v14"/><path d="m18 13-6 6-6-6"/></>,
    trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M6 5H4a2 2 0 0 0 2 4"/><path d="M18 5h2a2 2 0 0 1-2 4"/><path d="M12 12v5"/><path d="M8 21h8"/><path d="M9 17h6"/></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 9M5.5 15A7 7 0 0 0 18 17.5l2-2.5"/></>,
    camera: <><path d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4.5Z"/><circle cx="12" cy="12" r="4"/></>,
    brain: <><path d="M9.5 4A3.5 3.5 0 0 0 6 7.5v1A3.5 3.5 0 0 0 4 15a3 3 0 0 0 3 3h2.5"/><path d="M14.5 4A3.5 3.5 0 0 1 18 7.5v1a3.5 3.5 0 0 1 2 6.5 3 3 0 0 1-3 3h-2.5"/><path d="M9.5 4v16M14.5 4v16"/><path d="M6 10h3.5M14.5 10H18M6.5 16h3M14.5 16h3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.grid}
    </svg>
  );
}

function money(value) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function val(t, names, fallback = null) {
  for (const n of names) if (t?.[n] !== undefined && t?.[n] !== null && t?.[n] !== "") return t[n];
  return fallback;
}

function contractSize(asset) {
  const name = String(asset || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (name.includes("XAU") || name.includes("GOLD")) return 100;
  if (name.includes("NAS") || name.includes("USTEC") || name.includes("NASDAQ")) return 1;
  if (name.includes("SP500") || name.includes("US500") || name.includes("SPX")) return 1;
  return 1;
}

function parsePartials(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

function partialBreakdown(trade) {
  const partials = parsePartials(val(trade, ["partials", "partial_closes", "partials_json"]));
  const entry = Number(trade?.entry || 0);
  const sl = Number(trade?.sl || 0);
  const lotSize = Number(trade?.lot_size || 0);
  const risk = Math.abs(entry - sl);
  const isLong = String(trade?.direction || "").toLowerCase() === "long";
  const contract = contractSize(trade?.asset);
  return partials.map((p, index) => {
    const percent = Number(p?.percent || 0);
    const price = Number(p?.price || entry);
    const fraction = Math.max(0, percent / 100);
    const partialLot = lotSize * fraction;
    const move = isLong ? price - entry : entry - price;
    const profit = move * contract * partialLot;
    const r = risk > 0 ? (move / risk) * fraction : 0;
    return { index: index + 1, percent, price, profit, r };
  });
}

function periodKey(dateValue, period) {
  const d = new Date(dateValue);
  if (period === "day") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (period === "month") return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `W/C ${x.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function Login({ onSession }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg("");
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) return setMsg(result.error.message);
    if (mode === "signup" && !result.data.session) return setMsg("Account created. Check your email if confirmation is enabled.");
    onSession(result.data.session);
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="brand-lockup"><div className="brand-logo"><Icon name="trend" size={22} /></div><span>TradeLog</span></div>
          <div className="auth-copy"><span className="kicker">PERFORMANCE ANALYTICS</span><h1>Your trading journal, turned into usable data.</h1><p>Professional read-only analytics synced from your Telegram journal.</p></div>
          <div className="auth-proof-grid"><div><strong>Live</strong><span>Telegram linked</span></div><div><strong>Private</strong><span>Account scoped</span></div><div><strong>Read-only</strong><span>Safe analytics</span></div></div>
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-heading"><span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span><h2>{mode === "login" ? "Sign in to your dashboard" : "Create your account"}</h2><p>{mode === "login" ? "Review your trading performance and journal history." : "Create an account, then securely link your Telegram journal."}</p></div>
          <form onSubmit={submit}>
            <label htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <label htmlFor="password">Password</label><input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <button className="primary" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          {msg && <div className="message" role="status">{msg}</div>}
          <button className="secondary-button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Create a new account" : "Back to sign in"}</button>
        </div>
      </section>
    </main>
  );
}

function LinkTelegram({ onLinked }) {
  const [username, setUsername] = useState(""); const [code, setCode] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function createLink(e) {
    e.preventDefault(); setBusy(true); setMsg("");
    const { data, error } = await supabase.rpc("start_telegram_link", { p_username: username }); setBusy(false);
    if (error) return setMsg(error.message); setCode(data);
  }
  return <main className="center-screen app-bg"><section className="auth-card link-card"><div className="brand-logo large"><Icon name="user" size={24} /></div><div className="auth-card-heading"><span className="eyebrow">SECURE CONNECTION</span><h2>Link your Telegram journal</h2><p>Enter the same Telegram username you use with the trading journal bot.</p></div>{!code ? <form onSubmit={createLink}><label>Telegram username</label><div className="username-wrap"><span>@</span><input required value={username} onChange={(e) => setUsername(e.target.value.replace("@", ""))} placeholder="username" /></div><button className="primary" disabled={busy}>{busy ? "Creating link..." : "Continue"}</button></form> : <div className="link-instructions"><p>Send this command to your trading journal bot</p><div className="link-code">/link {code}</div><p className="muted small">This verifies the Telegram account belongs to you.</p><button className="primary" onClick={onLinked}>I've linked it</button><button className="secondary-button" onClick={() => setCode("")}>Use a different username</button></div>}{msg && <div className="message">{msg}</div>}</section></main>;
}

function TradeImage({ trade, className = "trade-shot", compact = false }) {
  const hasPhoto = Boolean(trade?.photo_file_id || val(trade, ["screenshot_url", "image_url", "photo_url"]));
  const directUrl = val(trade, ["screenshot_url", "image_url", "photo_url"]);
  const [src, setSrc] = useState(directUrl || "");
  const [status, setStatus] = useState(hasPhoto ? "loading" : "empty");

  useEffect(() => {
    let objectUrl = ""; let cancelled = false;
    if (directUrl) { setSrc(directUrl); setStatus("ready"); return; }
    if (!trade?.photo_file_id) { setStatus("empty"); return; }
    (async () => {
      try {
        setStatus("loading");
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("No active session");
        const response = await fetch(`/api/trade-image?id=${encodeURIComponent(trade.id)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("Image unavailable");
        const blob = await response.blob(); objectUrl = URL.createObjectURL(blob);
        if (!cancelled) { setSrc(objectUrl); setStatus("ready"); }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [trade?.id, trade?.photo_file_id, directUrl]);

  if (status === "empty") return <div className={`image-placeholder ${compact ? "compact" : ""}`}><Icon name="camera" size={compact ? 18 : 26} /><span>No screenshot</span></div>;
  if (status === "loading") return <div className={`image-placeholder ${compact ? "compact" : ""}`}><span className="spinner" /><span>Loading screenshot…</span></div>;
  if (status === "error") return <div className={`image-placeholder error ${compact ? "compact" : ""}`}><Icon name="camera" size={compact ? 18 : 26} /><span>Screenshot unavailable</span></div>;
  return <img className={className} src={src} alt={`Trade ${trade.id} screenshot`} />;
}

function MetricCard({ label, value, note, icon, tone = "neutral" }) {
  return <article className={`metric-card tone-${tone}`}><div className="metric-topline"><span className="metric-label">{label}</span><span className="metric-icon"><Icon name={icon} size={17} /></span></div><div className="metric-value">{value}</div>{note && <div className="metric-note">{note}</div>}</article>;
}

function PanelTitle({ title, subtitle, action }) {
  return <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function TradeModal({ trade, onClose }) {
  if (!trade) return null;
  const notes = val(trade, ["notes", "note", "trade_notes"]); const partials = partialBreakdown(trade); const plannedRR = Number(trade.rr || 0); const actualR = Number(trade.r_result || 0); const profit = Number(trade.profit || 0);
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"><div className="modal-head"><div><span className="eyebrow">TRADE #{trade.id}</span><div className="modal-title-row"><h2>{trade.asset}</h2><span className={`direction-chip ${String(trade.direction).toLowerCase()}`}>{trade.direction}</span></div><p>{new Date(trade.created_at).toLocaleString()}</p></div><button className="icon-button" onClick={onClose}><Icon name="close" /></button></div>
    <div className="modal-layout"><div className="modal-image"><TradeImage trade={trade} /></div><div className="modal-data"><div className="trade-hero-strip"><div><span>Result</span><strong>{trade.result || "—"}</strong></div><div><span>Profit</span><strong className={profit >= 0 ? "positive" : "negative"}>{money(profit)}</strong></div><div><span>Actual R</span><strong className={actualR >= 0 ? "positive" : "negative"}>{actualR >= 0 ? "+" : ""}{actualR.toFixed(2)}R</strong></div></div><div className="detail-grid"><div><span>Planned R:R</span><b>1:{plannedRR.toFixed(2)}</b></div><div><span>Entry</span><b>{Number(trade.entry || 0).toLocaleString()}</b></div><div><span>Stop Loss</span><b>{Number(trade.sl || 0).toLocaleString()}</b></div><div><span>Take Profit</span><b>{Number(trade.tp || 0).toLocaleString()}</b></div><div><span>Lot size</span><b>{trade.lot_size ?? "—"}</b></div><div><span>Feeling</span><b>{trade.feeling || "—"}</b></div></div></div></div>
    {partials.length > 0 && <div className="detail-block"><div className="detail-block-title"><span>Partial exits</span><small>{partials.length} exit{partials.length === 1 ? "" : "s"}</small></div><div className="partials-list">{partials.map((p) => <div className="partial-row" key={p.index}><div className="partial-index">{p.index}</div><div className="partial-main"><b>{p.percent.toFixed(2).replace(/\.?0+$/, "")}% @ {p.price.toLocaleString()}</b><span>Closed from original position</span></div><div className="partial-result"><strong className={p.profit >= 0 ? "positive" : "negative"}>{money(p.profit)}</strong><span>{p.r >= 0 ? "+" : ""}{p.r.toFixed(2)}R contribution</span></div></div>)}</div></div>}
    {notes && <div className="detail-block"><div className="detail-block-title"><span>Trade notes</span></div><p className="notes-text">{String(notes)}</p></div>}
  </div></div>;
}

function Dashboard({ profile }) {
  const [trades, setTrades] = useState([]); const [loading, setLoading] = useState(true); const [filter, setFilter] = useState("ALL"); const [period, setPeriod] = useState("week"); const [selectedTrade, setSelectedTrade] = useState(null); const [tab, setTab] = useState("overview");
  useEffect(() => { loadTrades(); }, []);
  async function loadTrades() { setLoading(true); const { data, error } = await supabase.from("trades").select("*").order("created_at", { ascending: true }); if (!error) setTrades(data || []); setLoading(false); }

  const analytics = useMemo(() => {
    const total = trades.length; const wins = trades.filter((t) => Number(t.r_result) > 0).length; const losses = trades.filter((t) => Number(t.r_result) < 0).length; const breakevens = trades.filter((t) => Number(t.r_result) === 0).length;
    const totalProfit = trades.reduce((s,t)=>s+Number(t.profit||0),0); const totalR = trades.reduce((s,t)=>s+Number(t.r_result||0),0); const avgRR = total ? trades.reduce((s,t)=>s+Number(t.rr||0),0)/total : 0;
    const grossProfit = trades.reduce((s,t)=>s+Math.max(Number(t.profit||0),0),0); const grossLoss = trades.reduce((s,t)=>s+Math.abs(Math.min(Number(t.profit||0),0)),0); const pf = grossLoss>0?grossProfit/grossLoss:grossProfit>0?Infinity:0;
    const avgWin = wins ? trades.filter(t=>Number(t.r_result)>0).reduce((s,t)=>s+Number(t.r_result||0),0)/wins : 0; const avgLoss = losses ? trades.filter(t=>Number(t.r_result)<0).reduce((s,t)=>s+Number(t.r_result||0),0)/losses : 0; const expectancy = total ? totalR/total : 0;
    let running=0; const curve=trades.map((t,i)=>{running+=Number(t.profit||0);return{trade:i+1,profit:Number(running.toFixed(2))}});
    const byAsset=Object.values(trades.reduce((a,t)=>{const k=t.asset||"Unknown";a[k]||={asset:k,trades:0,wins:0,profit:0,r:0};a[k].trades++;a[k].wins+=Number(t.r_result)>0?1:0;a[k].profit+=Number(t.profit||0);a[k].r+=Number(t.r_result||0);return a;},{})).map(x=>({...x,winrate:x.trades?x.wins/x.trades*100:0})).sort((a,b)=>b.profit-a.profit);
    const feelings=Object.values(trades.reduce((a,t)=>{const k=t.feeling||"Not recorded";a[k]||={name:k,trades:0,wins:0,profit:0,r:0};a[k].trades++;a[k].wins+=Number(t.r_result)>0?1:0;a[k].profit+=Number(t.profit||0);a[k].r+=Number(t.r_result||0);return a;},{})).map(x=>({...x,winrate:x.trades?x.wins/x.trades*100:0,avgR:x.trades?x.r/x.trades:0})).sort((a,b)=>b.trades-a.trades);
    let peak=0,equity=0,maxDrawdown=0,winStreak=0,lossStreak=0,cw=0,cl=0; trades.forEach(t=>{equity+=Number(t.profit||0);peak=Math.max(peak,equity);maxDrawdown=Math.min(maxDrawdown,equity-peak);if(Number(t.r_result)>0){cw++;cl=0}else if(Number(t.r_result)<0){cl++;cw=0}else{cw=0;cl=0}winStreak=Math.max(winStreak,cw);lossStreak=Math.max(lossStreak,cl)});
    const partialCount=trades.filter(t=>parsePartials(t.partials).length>0).length; const mostTraded=byAsset.slice().sort((a,b)=>b.trades-a.trades)[0]?.asset||"—"; const bestAsset=byAsset[0]?.asset||"—";
    return {total,wins,losses,breakevens,totalProfit,totalR,avgRR,pf,avgWin,avgLoss,expectancy,curve,byAsset,feelings,maxDrawdown,winStreak,lossStreak,partialCount,mostTraded,bestAsset,winrate:total?wins/total*100:0};
  }, [trades]);

  const assets=["ALL",...new Set(trades.map(t=>t.asset))]; const visible=(filter==="ALL"?[...trades]:trades.filter(t=>t.asset===filter)).reverse(); const latest=[...trades].reverse()[0];
  const periodData=useMemo(()=>Object.values(trades.reduce((a,t)=>{const k=periodKey(t.created_at,period);a[k]||={name:k,profit:0,r:0,trades:0};a[k].profit+=Number(t.profit||0);a[k].r+=Number(t.r_result||0);a[k].trades++;return a;},{})),[trades,period]);
  const tabTitles={overview:"Performance Dashboard",history:"Trade History",performance:"Performance Analysis",psychology:"Psychology Analytics"};

  if(loading)return <main className="center-screen app-bg"><div className="loader-card"><span className="spinner"/>Loading trading data…</div></main>;
  if(!trades.length)return <main className="center-screen app-bg"><section className="empty-card"><div className="brand-logo large"><Icon name="chart" size={24}/></div><span className="eyebrow">NO JOURNAL DATA</span><h2>No trading data found</h2><p>No trades were found for @{profile.telegram_username}.</p><button className="primary compact" onClick={loadTrades}><Icon name="refresh" size={17}/>Refresh data</button></section></main>;

  return <div className="dashboard-shell"><aside className="sidebar"><div className="brand-lockup sidebar-brand"><div className="brand-logo"><Icon name="trend" size={20}/></div><span>TradeLog</span></div><nav className="side-nav">{[["overview","grid","Overview"],["history","history","Trade History"],["performance","chart","Performance"],["psychology","brain","Psychology"]].map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon name={icon}/><span>{label}</span></button>)}</nav><div className="sidebar-account"><span className="eyebrow">TELEGRAM</span><strong>@{profile.telegram_username}</strong><small>Securely linked</small></div></aside>
  <main className="dashboard-main"><header className="topbar"><div><span className="eyebrow">TRADING ANALYTICS</span><h1>{tabTitles[tab]}</h1><p>@{profile.telegram_username} · Telegram journal connected</p></div><div className="topbar-actions"><span className="live-pill">● Live data · Read only</span><button className="ghost-button" onClick={loadTrades}><Icon name="refresh" size={16}/>Refresh</button><button className="ghost-button" onClick={()=>supabase.auth.signOut()}><Icon name="logout" size={16}/>Sign out</button></div></header>

  {tab==="overview"&&<><section className="primary-metrics"><MetricCard label="Net P&L" value={money(analytics.totalProfit)} note={`${analytics.totalR>=0?"+":""}${analytics.totalR.toFixed(2)}R overall`} icon="trend" tone={analytics.totalProfit>=0?"positive":"negative"}/><MetricCard label="Win rate" value={`${analytics.winrate.toFixed(1)}%`} note={`${analytics.wins}W · ${analytics.losses}L · ${analytics.breakevens}BE`} icon="trophy" tone={analytics.winrate>=50?"positive":"neutral"}/><MetricCard label="Profit factor" value={analytics.pf===Infinity?"∞":analytics.pf.toFixed(2)} note="Gross profit ÷ gross loss" icon="layers" tone={analytics.pf>=1?"positive":"negative"}/><MetricCard label="Avg planned R:R" value={`1:${analytics.avgRR.toFixed(2)}`} note={`${analytics.total} journalled trades`} icon="target" tone="positive"/></section>
  <section className="content-grid main-grid"><article className="panel hero-panel"><PanelTitle title="Equity curve" subtitle="Cumulative realised USD profit"/><div className="chart-wrap"><ResponsiveContainer width="100%" height={320}><AreaChart data={analytics.curve} margin={{top:8,right:8,left:-14,bottom:0}}><defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#66e3bd" stopOpacity={.26}/><stop offset="95%" stopColor="#66e3bd" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#1d2938" vertical={false} strokeDasharray="4 4"/><XAxis dataKey="trade" stroke="#617085" tickLine={false} axisLine={false} fontSize={11}/><YAxis stroke="#617085" tickLine={false} axisLine={false} fontSize={11} tickFormatter={v=>`$${v}`}/><Tooltip contentStyle={{background:"#0f1722",border:"1px solid #283548",borderRadius:12}} formatter={v=>[`$${Number(v).toFixed(2)}`,"Equity"]}/><Area type="monotone" dataKey="profit" stroke="#66e3bd" fill="url(#equityFill)" strokeWidth={2.2}/></AreaChart></ResponsiveContainer></div></article><aside className="snapshot-stack"><MetricCard label="Max drawdown" value={money(analytics.maxDrawdown)} note="Peak-to-trough realised equity" icon="arrowDown" tone="negative"/><MetricCard label="Best win streak" value={`${analytics.winStreak} trades`} note={`Worst losing streak: ${analytics.lossStreak}`} icon="trophy" tone="positive"/><MetricCard label="Most traded" value={analytics.mostTraded} note={`${analytics.partialCount} trades used partials`} icon="layers"/></aside></section>
  {latest&&<section className="panel latest-trade-panel"><PanelTitle title="Latest trade" subtitle="Screenshot saved from your Telegram journal" action={<button className="row-action" onClick={()=>setSelectedTrade(latest)}>Open trade</button>}/><div className="latest-trade-grid"><div className="latest-image"><TradeImage trade={latest} compact/></div><div className="latest-stats"><div><span>Asset</span><b>{latest.asset}</b></div><div><span>Direction</span><b>{latest.direction}</b></div><div><span>Actual R</span><b className={Number(latest.r_result)>=0?"positive":"negative"}>{Number(latest.r_result)>=0?"+":""}{Number(latest.r_result||0).toFixed(2)}R</b></div><div><span>Profit</span><b className={Number(latest.profit)>=0?"positive":"negative"}>{money(latest.profit)}</b></div></div></div></section>}</>}

  {tab==="history"&&<section className="panel"><PanelTitle title="Trade history" subtitle="Click any trade to view full details and its Telegram screenshot" action={<div className="filter-wrap"><label>Asset</label><select value={filter} onChange={e=>setFilter(e.target.value)}>{assets.map(a=><option key={a}>{a}</option>)}</select></div>}/><div className="table-wrap"><table><thead><tr><th>Trade</th><th>Date</th><th>Asset</th><th>Side</th><th>Result</th><th>Planned R:R</th><th>Actual R</th><th>Profit</th><th>Photo</th></tr></thead><tbody>{visible.map(t=>{const r=Number(t.r_result||0),p=Number(t.profit||0);return <tr key={t.id} className="click-row" onClick={()=>setSelectedTrade(t)}><td><span className="trade-id">#{t.id}</span></td><td>{new Date(t.created_at).toLocaleDateString()}</td><td><strong className="asset-name">{t.asset}</strong></td><td><span className={`direction-chip ${String(t.direction).toLowerCase()}`}>{t.direction}</span></td><td><span className={`result-pill ${r>0?"win":r<0?"loss":"be"}`}>{t.result}</span></td><td>1:{Number(t.rr||0).toFixed(2)}</td><td className={r>=0?"positive":"negative"}>{r>=0?"+":""}{r.toFixed(2)}R</td><td className={p>=0?"positive":"negative"}>{money(p)}</td><td>{t.photo_file_id?<span className="photo-chip"><Icon name="camera" size={13}/>View</span>:"—"}</td></tr>})}</tbody></table></div></section>}

  {tab==="performance"&&<><section className="primary-metrics"><MetricCard label="Best asset" value={analytics.bestAsset} note={analytics.byAsset[0]?money(analytics.byAsset[0].profit):"No data"} icon="trophy" tone="positive"/><MetricCard label="Average win" value={`${analytics.avgWin>=0?"+":""}${analytics.avgWin.toFixed(2)}R`} note={`${analytics.wins} winning trades`} icon="arrowUp" tone="positive"/><MetricCard label="Average loss" value={`${analytics.avgLoss.toFixed(2)}R`} note={`${analytics.losses} losing trades`} icon="arrowDown" tone="negative"/><MetricCard label="Expectancy" value={`${analytics.expectancy>=0?"+":""}${analytics.expectancy.toFixed(2)}R`} note="Average result per trade" icon="target" tone={analytics.expectancy>=0?"positive":"negative"}/></section>
  <section className="content-grid two-column-grid"><article className="panel"><PanelTitle title="Asset performance" subtitle="Realised P&L contribution by market"/><div className="asset-bars">{analytics.byAsset.map(x=>{const max=Math.max(...analytics.byAsset.map(a=>Math.abs(a.profit)),1);return <div className="asset-bar" key={x.asset}><div><strong>{x.asset}</strong><span>{x.trades} trades · {x.winrate.toFixed(0)}% WR</span></div><div className="bar-track"><span style={{width:`${Math.max(6,Math.abs(x.profit)/max*100)}%`}} className={x.profit>=0?"bar-positive":"bar-negative"}/></div><b className={x.profit>=0?"positive":"negative"}>{money(x.profit)}</b></div>})}</div></article><article className="panel"><PanelTitle title="Period performance" subtitle="Compare realised results over time" action={<div className="segmented-control">{["day","week","month"].map(p=><button key={p} className={period===p?"active":""} onClick={()=>setPeriod(p)}>{p==="day"?"Daily":p==="week"?"Weekly":"Monthly"}</button>)}</div>}/><div className="chart-wrap compact-chart"><ResponsiveContainer width="100%" height={270}><BarChart data={periodData}><CartesianGrid stroke="#1d2938" vertical={false} strokeDasharray="4 4"/><XAxis dataKey="name" stroke="#617085" tickLine={false} axisLine={false} fontSize={10}/><YAxis stroke="#617085" tickLine={false} axisLine={false} fontSize={10}/><Tooltip contentStyle={{background:"#0f1722",border:"1px solid #283548",borderRadius:12}} formatter={v=>[`$${Number(v).toFixed(2)}`,"Profit"]}/><Bar dataKey="profit" fill="#66e3bd" radius={[5,5,2,2]} maxBarSize={40}/></BarChart></ResponsiveContainer></div></article></section></>}

  {tab==="psychology"&&<><section className="psych-summary">{analytics.feelings.slice(0,3).map((x,i)=><article className="psych-card" key={x.name}><span className="eyebrow">{x.name}</span><strong className={x.r>=0?"positive":"negative"}>{x.winrate.toFixed(0)}% WR</strong><p>{x.r>=0?"+":""}{x.r.toFixed(2)}R · {x.trades} trades</p></article>)}</section><section className="panel psychology-panel"><PanelTitle title="Mindset performance" subtitle="How your recorded psychology correlates with results"/><div className="data-list"><div className="data-list-head psychology-full-layout"><span>Feeling</span><span>Trades</span><span>Win rate</span><span>Avg R</span><span>Total R</span><span>P&L</span></div>{analytics.feelings.map(x=><div className="data-row psychology-full-layout" key={x.name}><strong>{x.name}</strong><span>{x.trades}</span><span>{x.winrate.toFixed(0)}%</span><span className={x.avgR>=0?"positive":"negative"}>{x.avgR>=0?"+":""}{x.avgR.toFixed(2)}R</span><span className={x.r>=0?"positive":"negative"}>{x.r>=0?"+":""}{x.r.toFixed(2)}R</span><span className={x.profit>=0?"positive":"negative"}>{money(x.profit)}</span></div>)}</div>{analytics.feelings.length>0&&<div className="insight-box"><Icon name="brain" size={18}/><div><strong>Journal insight</strong><p>Your best recorded mindset is <b>{[...analytics.feelings].sort((a,b)=>b.r-a.r)[0]?.name}</b>, based on total realised R.</p></div></div>}</section></>}

  <footer className="dashboard-footer"><span>TradeLog</span><span>Read-only analytics · Secure Telegram-linked data</span></footer><TradeModal trade={selectedTrade} onClose={()=>setSelectedTrade(null)}/></main></div>;
}

function App() {
  const [session,setSession]=useState(null); const [profile,setProfile]=useState(undefined);
  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const{data:listener}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setProfile(undefined)});return()=>listener.subscription.unsubscribe()},[]);
  useEffect(()=>{if(session)refreshProfile();else setProfile(undefined)},[session]);
  async function refreshProfile(){const{data,error}=await supabase.from("profiles").select("telegram_username, telegram_user_id").single();if(error&&error.code!=="PGRST116")console.error(error);setProfile(data||null)}
  if(!session)return <Login onSession={setSession}/>; if(profile===undefined)return <main className="center-screen app-bg"><div className="loader-card"><span className="spinner"/>Loading your dashboard…</div></main>; if(!profile?.telegram_user_id)return <LinkTelegram onLinked={refreshProfile}/>; return <Dashboard profile={profile}/>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
