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
import { LayoutDashboard, ChartNoAxesCombined, History, Target, TrendingUp, UserRound, LogOut, ArrowUp, ArrowDown, Trophy, Layers3, X, RefreshCw, Camera, Brain, ShieldCheck, Moon, Sun } from "lucide-react";
import "./styles.css";
import "./terminal.css";
import "./enhancements.css";

function Icon({ name, size = 18 }) {
  const icons = {
    grid: LayoutDashboard,
    chart: ChartNoAxesCombined,
    history: History,
    target: Target,
    trend: TrendingUp,
    user: UserRound,
    logout: LogOut,
    arrowUp: ArrowUp,
    arrowDown: ArrowDown,
    trophy: Trophy,
    layers: Layers3,
    close: X,
    refresh: RefreshCw,
    camera: Camera,
    brain: Brain,
    shield: ShieldCheck,
    moon: Moon,
    sun: Sun,
  };
  const Component = icons[name] || LayoutDashboard;
  return <Component size={size} strokeWidth={1.8} aria-hidden="true" />;
}

function ThemeToggle({ theme, onToggle, compact = false }) {
  return (
    <button
      className={compact ? "theme-toggle compact" : "theme-toggle"}
      type="button"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
      {!compact && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
    </button>
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

function Login({ onSession, theme, onToggleTheme }) {
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
        <div className="auth-theme-control"><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div>
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

function LinkTelegram({ onLinked, theme, onToggleTheme }) {
  const [username, setUsername] = useState(""); const [code, setCode] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function createLink(e) {
    e.preventDefault(); setBusy(true); setMsg("");
    const { data, error } = await supabase.rpc("start_telegram_link", { p_username: username }); setBusy(false);
    if (error) return setMsg(error.message); setCode(data);
  }
  return <main className="center-screen app-bg"><div className="page-theme-control"><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div><section className="auth-card link-card"><div className="brand-logo large"><Icon name="user" size={24} /></div><div className="auth-card-heading"><span className="eyebrow">SECURE CONNECTION</span><h2>Link your Telegram journal</h2><p>Enter the same Telegram username you use with the trading journal bot.</p></div>{!code ? <form onSubmit={createLink}><label>Telegram username</label><div className="username-wrap"><span>@</span><input required value={username} onChange={(e) => setUsername(e.target.value.replace("@", ""))} placeholder="username" /></div><button className="primary" disabled={busy}>{busy ? "Creating link..." : "Continue"}</button></form> : <div className="link-instructions"><p>Send this command to your trading journal bot</p><div className="link-code">/link {code}</div><p className="muted small">This verifies the Telegram account belongs to you.</p><button className="primary" onClick={onLinked}>I've linked it</button><button className="secondary-button" onClick={() => setCode("")}>Use a different username</button></div>}{msg && <div className="message">{msg}</div>}</section></main>;
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

function SortHead({ label, field, sort, onSort }) {
  const active = sort.key === field;
  return <button className={active ? "sort-head active" : "sort-head"} onClick={() => onSort(field)}>{label}<span>{active ? (sort.dir === "asc" ? "↑" : "↓") : ""}</span></button>;
}

function EquityTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const value = metric === "profit" ? money(point.profit) : `${point.r >= 0 ? "+" : ""}${Number(point.r).toFixed(2)}R`;
  return <div className="equity-tooltip"><strong>Trade #{point.tradeId} · {point.asset}</strong><span>{new Date(point.date).toLocaleDateString()}</span><b>{value}</b><small>Click to open trade</small></div>;
}

function TradeModal({ trade, onClose }) {
  if (!trade) return null;
  const notes = val(trade, ["notes", "note", "trade_notes"]); const partials = partialBreakdown(trade); const plannedRR = Number(trade.rr || 0); const actualR = Number(trade.r_result || 0); const profit = Number(trade.profit || 0);
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"><div className="modal-head"><div><span className="eyebrow">TRADE #{trade.id}</span><div className="modal-title-row"><h2>{trade.asset}</h2><span className={`direction-chip ${String(trade.direction).toLowerCase()}`}>{trade.direction}</span></div><p>{new Date(trade.created_at).toLocaleString()}</p></div><button className="icon-button" onClick={onClose}><Icon name="close" /></button></div>
    <div className="modal-layout"><div className="modal-image"><TradeImage trade={trade} /></div><div className="modal-data"><div className="trade-hero-strip"><div><span>Result</span><strong>{trade.result || "—"}</strong></div><div><span>Profit</span><strong className={profit >= 0 ? "positive" : "negative"}>{money(profit)}</strong></div><div><span>Actual R</span><strong className={actualR >= 0 ? "positive" : "negative"}>{actualR >= 0 ? "+" : ""}{actualR.toFixed(2)}R</strong></div></div><div className="detail-grid"><div><span>Planned R:R</span><b>1:{plannedRR.toFixed(2)}</b></div><div><span>Entry</span><b>{Number(trade.entry || 0).toLocaleString()}</b></div><div><span>Stop Loss</span><b>{Number(trade.sl || 0).toLocaleString()}</b></div><div><span>Take Profit</span><b>{Number(trade.tp || 0).toLocaleString()}</b></div><div><span>Lot size</span><b>{trade.lot_size ?? "—"}</b></div><div><span>Feeling</span><b>{trade.feeling || "—"}</b></div><div><span>Account</span><b>{trade.account_name || "Main"}</b></div></div></div></div>
    {partials.length > 0 && <div className="detail-block"><div className="detail-block-title"><span>Partial exits</span><small>{partials.length} exit{partials.length === 1 ? "" : "s"}</small></div><div className="partials-list">{partials.map((p) => <div className="partial-row" key={p.index}><div className="partial-index">{p.index}</div><div className="partial-main"><b>{p.percent.toFixed(2).replace(/\.?0+$/, "")}% @ {p.price.toLocaleString()}</b><span>Closed from original position</span></div><div className="partial-result"><strong className={p.profit >= 0 ? "positive" : "negative"}>{money(p.profit)}</strong><span>{p.r >= 0 ? "+" : ""}{p.r.toFixed(2)}R contribution</span></div></div>)}</div></div>}
    {notes && <div className="detail-block"><div className="detail-block-title"><span>Trade notes</span></div><p className="notes-text">{String(notes)}</p></div>}
  </div></div>;
}

function Dashboard({ profile, theme, onToggleTheme }) {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [accountFilter, setAccountFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);
  const [chartMetric, setChartMetric] = useState("profit");
  const [period, setPeriod] = useState("week");
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [tab, setTab] = useState("overview");
  const pageSize = 25;
  useEffect(() => { loadTrades(); }, []);
  async function loadTrades() {
    setLoading(true);
    const [tradeResult, accountResult] = await Promise.all([
      supabase.from("trades").select("*").order("created_at", { ascending: true }),
      supabase.from("trading_accounts").select("id,name").order("created_at", { ascending: true }),
    ]);
    if (!tradeResult.error) setTrades(tradeResult.data || []);
    if (!accountResult.error) setAccounts(accountResult.data || []);
    setLoading(false);
  }

  const accountNames = useMemo(() => ["ALL", ...new Set([...accounts.map((a) => a.name), ...trades.map((t) => t.account_name || "Main")])], [accounts, trades]);
  const accountScopedTrades = useMemo(() => accountFilter === "ALL" ? trades : trades.filter((t) => (t.account_name || "Main") === accountFilter), [trades, accountFilter]);
  const accountTrades = useMemo(() => {
    if (dateRange === "ALL") return accountScopedTrades;
    const days = Number(dateRange);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - Math.max(days - 1, 0));
    return accountScopedTrades.filter((t) => new Date(t.created_at) >= cutoff);
  }, [accountScopedTrades, dateRange]);
  const chartColors = theme === "dark" ? { grid: "#263244", axis: "#8b9aaf", tooltipBg: "#111827", tooltipBorder: "#334155", tooltipText: "#e5e7eb" } : { grid: "#e2e8f0", axis: "#64748b", tooltipBg: "#ffffff", tooltipBorder: "#cbd5e1", tooltipText: "#0f172a" };

  const analytics = useMemo(() => {
    const total = accountTrades.length; const wins = accountTrades.filter((t) => Number(t.r_result) > 0).length; const losses = accountTrades.filter((t) => Number(t.r_result) < 0).length; const breakevens = accountTrades.filter((t) => Number(t.r_result) === 0).length;
    const totalProfit = accountTrades.reduce((s,t)=>s+Number(t.profit||0),0); const totalR = accountTrades.reduce((s,t)=>s+Number(t.r_result||0),0); const avgRR = total ? accountTrades.reduce((s,t)=>s+Number(t.rr||0),0)/total : 0;
    const grossProfit = accountTrades.reduce((s,t)=>s+Math.max(Number(t.profit||0),0),0); const grossLoss = accountTrades.reduce((s,t)=>s+Math.abs(Math.min(Number(t.profit||0),0)),0); const pf = grossLoss>0?grossProfit/grossLoss:grossProfit>0?Infinity:0;
    const avgWin = wins ? accountTrades.filter(t=>Number(t.r_result)>0).reduce((s,t)=>s+Number(t.r_result||0),0)/wins : 0; const avgLoss = losses ? accountTrades.filter(t=>Number(t.r_result)<0).reduce((s,t)=>s+Number(t.r_result||0),0)/losses : 0; const expectancy = total ? totalR/total : 0;
    let runningProfit=0,runningR=0,peakProfit=0,peakR=0;
    const curve=accountTrades.map((t,i)=>{
      runningProfit+=Number(t.profit||0);
      runningR+=Number(t.r_result||0);
      peakProfit=Math.max(peakProfit,runningProfit);
      peakR=Math.max(peakR,runningR);
      return {
        trade:i+1,
        tradeId:t.id,
        asset:t.asset,
        date:t.created_at,
        profit:Number(runningProfit.toFixed(2)),
        r:Number(runningR.toFixed(2)),
        drawdownProfit:Number((runningProfit-peakProfit).toFixed(2)),
        drawdownR:Number((runningR-peakR).toFixed(2)),
      };
    });
    const byAsset=Object.values(accountTrades.reduce((a,t)=>{const k=t.asset||"Unknown";a[k]||={asset:k,trades:0,wins:0,profit:0,r:0};a[k].trades++;a[k].wins+=Number(t.r_result)>0?1:0;a[k].profit+=Number(t.profit||0);a[k].r+=Number(t.r_result||0);return a;},{})).map(x=>({...x,winrate:x.trades?x.wins/x.trades*100:0})).sort((a,b)=>b.profit-a.profit);
    const feelings=Object.values(accountTrades.reduce((a,t)=>{const k=t.feeling||"Not recorded";a[k]||={name:k,trades:0,wins:0,profit:0,r:0};a[k].trades++;a[k].wins+=Number(t.r_result)>0?1:0;a[k].profit+=Number(t.profit||0);a[k].r+=Number(t.r_result||0);return a;},{})).map(x=>({...x,winrate:x.trades?x.wins/x.trades*100:0,avgR:x.trades?x.r/x.trades:0})).sort((a,b)=>b.trades-a.trades);
    let peak=0,equity=0,maxDrawdown=0,winStreak=0,lossStreak=0,cw=0,cl=0; accountTrades.forEach(t=>{equity+=Number(t.profit||0);peak=Math.max(peak,equity);maxDrawdown=Math.min(maxDrawdown,equity-peak);if(Number(t.r_result)>0){cw++;cl=0}else if(Number(t.r_result)<0){cl++;cw=0}else{cw=0;cl=0}winStreak=Math.max(winStreak,cw);lossStreak=Math.max(lossStreak,cl)});
    const partialCount=accountTrades.filter(t=>parsePartials(t.partials).length>0).length; const mostTraded=byAsset.slice().sort((a,b)=>b.trades-a.trades)[0]?.asset||"—"; const bestAsset=byAsset[0]?.asset||"—";
    return {total,wins,losses,breakevens,totalProfit,totalR,avgRR,pf,avgWin,avgLoss,expectancy,curve,byAsset,feelings,maxDrawdown,winStreak,lossStreak,partialCount,mostTraded,bestAsset,winrate:total?wins/total*100:0};
  }, [accountTrades]);

  const assets=["ALL",...new Set(accountTrades.map(t=>t.asset))];
  const latest=[...accountTrades].reverse()[0];
  const periodData=useMemo(()=>Object.values(accountTrades.reduce((a,t)=>{const k=periodKey(t.created_at,period);a[k]||={name:k,profit:0,r:0,trades:0};a[k].profit+=Number(t.profit||0);a[k].r+=Number(t.r_result||0);a[k].trades++;return a;},{})),[accountTrades,period]);

  const ledgerRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = accountTrades.filter((t) => {
      if (filter !== "ALL" && t.asset !== filter) return false;
      if (directionFilter !== "ALL" && t.direction !== directionFilter) return false;
      if (resultFilter !== "ALL" && t.result !== resultFilter) return false;
      if (!q) return true;
      return [t.id, t.asset, t.direction, t.result, t.account_name || "Main", t.notes || "", t.feeling || ""]
        .some((v) => String(v).toLowerCase().includes(q));
    });
    const direction = sort.dir === "asc" ? 1 : -1;
    return rows.sort((a,b) => {
      const av = sort.key === "created_at" ? new Date(a.created_at).getTime() : sort.key === "account_name" ? (a.account_name || "Main") : a[sort.key];
      const bv = sort.key === "created_at" ? new Date(b.created_at).getTime() : sort.key === "account_name" ? (b.account_name || "Main") : b[sort.key];
      if (typeof av === "number" || typeof bv === "number") return (Number(av||0)-Number(bv||0))*direction;
      return String(av||"").localeCompare(String(bv||""))*direction;
    });
  }, [accountTrades, filter, directionFilter, resultFilter, search, sort]);

  const pageCount = Math.max(1, Math.ceil(ledgerRows.length / pageSize));
  const pagedTrades = ledgerRows.slice((page-1)*pageSize, page*pageSize);

  useEffect(()=>setPage(1),[filter,directionFilter,resultFilter,search,dateRange,accountFilter]);
  useEffect(()=>{ if(page>pageCount) setPage(pageCount); },[page,pageCount]);

  function toggleSort(key){
    setSort((current)=>current.key===key?{key,dir:current.dir==="asc"?"desc":"asc"}:{key,dir:"desc"});
  }

  function openCurveTrade(state){
    const point=state?.activePayload?.[0]?.payload;
    if(!point?.tradeId)return;
    const trade=accountTrades.find((t)=>t.id===point.tradeId);
    if(trade)setSelectedTrade(trade);
  }
  const tabTitles={overview:"Performance Dashboard",history:"Trade History",performance:"Performance Analysis",psychology:"Psychology Analytics"};

  if(loading)return <main className="center-screen app-bg"><div className="loader-card"><span className="spinner"/>Loading trading data…</div></main>;
  if(!trades.length)return <main className="center-screen app-bg"><section className="empty-card"><div className="brand-logo large"><Icon name="chart" size={24}/></div><span className="eyebrow">NO JOURNAL DATA</span><h2>No trading data found</h2><p>No trades were found for @{profile.telegram_username}.</p><button className="primary compact" onClick={loadTrades}><Icon name="refresh" size={17}/>Refresh data</button></section></main>;

  return (
    <div className="terminal-shell">
      <header className="app-header">
        <div className="app-brand">
          <div className="brand-mark"><TrendingUp size={17} strokeWidth={1.8}/></div>
          <div>
            <strong>TradeLog</strong>
            <span>Journal analytics</span>
          </div>
        </div>

        <nav className="workspace-nav" aria-label="Dashboard sections">
          {[["overview","Overview"],["history","Trades"],["performance","Performance"],["psychology","Psychology"]].map(([id,label])=>(
            <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>
          ))}
        </nav>

        <div className="header-tools">
          <label className="account-field">
            <span>Account</span>
            <select value={accountFilter} onChange={e=>{setAccountFilter(e.target.value);setFilter("ALL");}}>
              {accountNames.map(a=><option key={a} value={a}>{a==="ALL"?"All accounts":a}</option>)}
            </select>
          </label>
          <div className="date-range" aria-label="Date range">
            {[["1","Today"],["7","7D"],["30","30D"],["90","90D"],["ALL","All"]].map(([value,label])=>
              <button key={value} className={dateRange===value?"active":""} onClick={()=>setDateRange(value)}>{label}</button>
            )}
          </div>
          <button className="icon-control" onClick={loadTrades} title="Refresh"><RefreshCw size={15}/></button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact/>
          <button className="icon-control" onClick={()=>supabase.auth.signOut()} title="Sign out"><LogOut size={15}/></button>
        </div>
      </header>

      <main className="workspace">
        <section className="page-heading">
          <div>
            <span className="section-kicker">{tabTitles[tab]}</span>
            <h1>{accountFilter==="ALL"?"All accounts":accountFilter}</h1>
          </div>
          <div className="scope-meta">
            <span>@{profile.telegram_username}</span>
            <span>{analytics.total} trades</span>
            <span>Read only</span>
          </div>
        </section>

        {tab==="overview"&&<>
          <section className="kpi-rail">
            <div><span>Net P&L</span><strong className={analytics.totalProfit>=0?"positive":"negative"}>{money(analytics.totalProfit)}</strong><small>{analytics.totalR>=0?"+":""}{analytics.totalR.toFixed(2)}R</small></div>
            <div><span>Win rate</span><strong>{analytics.winrate.toFixed(1)}%</strong><small>{analytics.wins}W / {analytics.losses}L / {analytics.breakevens}BE</small></div>
            <div><span>Profit factor</span><strong>{analytics.pf===Infinity?"∞":analytics.pf.toFixed(2)}</strong><small>Gross profit / loss</small></div>
            <div><span>Avg planned R:R</span><strong>1:{analytics.avgRR.toFixed(2)}</strong><small>{analytics.total} journalled</small></div>
            <div><span>Max drawdown</span><strong>{money(analytics.maxDrawdown)}</strong><small>Realised equity</small></div>
          </section>

          <section className="overview-grid">
            <div className="workspace-section equity-section">
              <div className="section-head">
                <div><h2>Equity</h2><p>Cumulative realised performance · click a point to open the trade</p></div>
                <div className="metric-switch">
                  <button className={chartMetric==="profit"?"active":""} onClick={()=>setChartMetric("profit")}>$</button>
                  <button className={chartMetric==="r"?"active":""} onClick={()=>setChartMetric("r")}>R</button>
                </div>
              </div>
              <div className="chart-wrap terminal-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.curve} margin={{top:8,right:4,left:-12,bottom:0}} onClick={openCurveTrade}>
                    <CartesianGrid stroke={chartColors.grid} vertical={false}/>
                    <XAxis dataKey="trade" stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={10}/>
                    <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={10} tickFormatter={v=>chartMetric==="profit"?`${v}`:`${v}R`}/>
                    <Tooltip content={<EquityTooltip metric={chartMetric}/>}/>
                    <Area type="monotone" dataKey={chartMetric} stroke={theme==="dark"?"#60a5fa":"#2563eb"} fill="none" strokeWidth={1.8} activeDot={{r:4,cursor:"pointer"}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="drawdown-chart">
                <div className="drawdown-label"><span>Drawdown</span><small>{chartMetric==="profit"?"USD":"R"}</small></div>
                <ResponsiveContainer width="100%" height={105}>
                  <AreaChart data={analytics.curve} margin={{top:4,right:4,left:-12,bottom:0}}>
                    <CartesianGrid stroke={chartColors.grid} vertical={false}/>
                    <XAxis dataKey="trade" hide/>
                    <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={9} tickFormatter={v=>chartMetric==="profit"?`${v}`:`${v}R`}/>
                    <Tooltip content={<EquityTooltip metric={chartMetric}/>}/>
                    <Area type="monotone" dataKey={chartMetric==="profit"?"drawdownProfit":"drawdownR"} stroke={chartColors.axis} fill="none" strokeWidth={1.2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <aside className="overview-side">
              <div className="workspace-section">
                <div className="section-head"><div><h2>Current readout</h2><p>Selected account</p></div></div>
                <dl className="readout-list">
                  <div><dt>Most traded</dt><dd>{analytics.mostTraded}</dd></div>
                  <div><dt>Best asset</dt><dd>{analytics.bestAsset}</dd></div>
                  <div><dt>Win streak</dt><dd>{analytics.winStreak}</dd></div>
                  <div><dt>Loss streak</dt><dd>{analytics.lossStreak}</dd></div>
                  <div><dt>Trades with partials</dt><dd>{analytics.partialCount}</dd></div>
                </dl>
              </div>
            </aside>
          </section>

          {latest&&<section className="workspace-section latest-section">
            <div className="section-head">
              <div><h2>Latest trade</h2><p>{latest.asset} · {latest.account_name || "Main"} · {new Date(latest.created_at).toLocaleString()}</p></div>
              <button className="text-action" onClick={()=>setSelectedTrade(latest)}>Open trade</button>
            </div>
            <div className="latest-terminal">
              <div className="latest-shot"><TradeImage trade={latest} compact/></div>
              <dl className="trade-readout">
                <div><dt>Direction</dt><dd>{latest.direction}</dd></div>
                <div><dt>Result</dt><dd>{latest.result}</dd></div>
                <div><dt>Actual R</dt><dd className={Number(latest.r_result)>=0?"positive":"negative"}>{Number(latest.r_result)>=0?"+":""}{Number(latest.r_result||0).toFixed(2)}R</dd></div>
                <div><dt>Profit</dt><dd className={Number(latest.profit)>=0?"positive":"negative"}>{money(latest.profit)}</dd></div>
                <div><dt>Planned R:R</dt><dd>1:{Number(latest.rr||0).toFixed(2)}</dd></div>
                <div><dt>Lot size</dt><dd>{latest.lot_size ?? "—"}</dd></div>
              </dl>
            </div>
          </section>}
        </>}

        {tab==="history"&&<section className="workspace-section">
          <div className="section-head ledger-heading">
            <div><h2>Trade ledger</h2><p>{ledgerRows.length} matching trades in the current date/account scope</p></div>
          </div>
          <div className="ledger-toolbar">
            <input className="ledger-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ID, asset, notes, feeling…" />
            <label className="inline-filter"><span>Asset</span><select value={filter} onChange={e=>setFilter(e.target.value)}>{assets.map(a=><option key={a}>{a}</option>)}</select></label>
            <label className="inline-filter"><span>Side</span><select value={directionFilter} onChange={e=>setDirectionFilter(e.target.value)}><option>ALL</option><option>Long</option><option>Short</option></select></label>
            <label className="inline-filter"><span>Result</span><select value={resultFilter} onChange={e=>setResultFilter(e.target.value)}><option>ALL</option><option>TP</option><option>SL</option><option>BE</option><option>Manual</option></select></label>
          </div>
          <div className="table-wrap ledger-wrap">
            <table className="ledger-table">
              <thead><tr>
                <th><SortHead label="ID" field="id" sort={sort} onSort={toggleSort}/></th>
                <th><SortHead label="Date" field="created_at" sort={sort} onSort={toggleSort}/></th>
                <th><SortHead label="Account" field="account_name" sort={sort} onSort={toggleSort}/></th>
                <th><SortHead label="Asset" field="asset" sort={sort} onSort={toggleSort}/></th>
                <th><SortHead label="Side" field="direction" sort={sort} onSort={toggleSort}/></th>
                <th><SortHead label="Result" field="result" sort={sort} onSort={toggleSort}/></th>
                <th><SortHead label="Plan" field="rr" sort={sort} onSort={toggleSort}/></th>
                <th><SortHead label="Actual R" field="r_result" sort={sort} onSort={toggleSort}/></th>
                <th><SortHead label="P&L" field="profit" sort={sort} onSort={toggleSort}/></th>
                <th>Image</th>
              </tr></thead>
              <tbody>{pagedTrades.map(t=>{const r=Number(t.r_result||0),p=Number(t.profit||0);return <tr key={t.id} onClick={()=>setSelectedTrade(t)}>
                <td className="mono">#{t.id}</td><td>{new Date(t.created_at).toLocaleDateString()}</td><td>{t.account_name || "Main"}</td><td><strong>{t.asset}</strong></td><td>{t.direction}</td><td>{t.result}</td><td>1:{Number(t.rr||0).toFixed(2)}</td><td className={r>=0?"positive":"negative"}>{r>=0?"+":""}{r.toFixed(2)}R</td><td className={p>=0?"positive":"negative"}>{money(p)}</td><td>{t.photo_file_id?"View":"—"}</td>
              </tr>})}</tbody>
            </table>
          </div>
          <div className="ledger-pagination">
            <span>{ledgerRows.length ? ((page-1)*pageSize)+1 : 0}–{Math.min(page*pageSize,ledgerRows.length)} of {ledgerRows.length}</span>
            <div>
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button>
              <span>Page {page} / {pageCount}</span>
              <button disabled={page>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Next</button>
            </div>
          </div>
        </section>}

        {tab==="performance"&&<>
          <section className="kpi-rail compact-rail">
            <div><span>Best asset</span><strong>{analytics.bestAsset}</strong><small>{analytics.byAsset[0]?money(analytics.byAsset[0].profit):"No data"}</small></div>
            <div><span>Average win</span><strong>{analytics.avgWin>=0?"+":""}{analytics.avgWin.toFixed(2)}R</strong><small>{analytics.wins} winners</small></div>
            <div><span>Average loss</span><strong>{analytics.avgLoss.toFixed(2)}R</strong><small>{analytics.losses} losers</small></div>
            <div><span>Expectancy</span><strong>{analytics.expectancy>=0?"+":""}{analytics.expectancy.toFixed(2)}R</strong><small>Per trade</small></div>
          </section>
          <section className="performance-grid">
            <div className="workspace-section">
              <div className="section-head"><div><h2>By market</h2><p>Realised account performance</p></div></div>
              <div className="market-table">
                <div className="market-row market-head"><span>Market</span><span>Trades</span><span>Win rate</span><span>Total R</span><span>P&L</span></div>
                {analytics.byAsset.map(x=><div className="market-row" key={x.asset}><strong>{x.asset}</strong><span>{x.trades}</span><span>{x.winrate.toFixed(0)}%</span><span className={x.r>=0?"positive":"negative"}>{x.r>=0?"+":""}{x.r.toFixed(2)}R</span><span className={x.profit>=0?"positive":"negative"}>{money(x.profit)}</span></div>)}
              </div>
            </div>
            <div className="workspace-section">
              <div className="section-head">
                <div><h2>Period P&L</h2><p>Realised profit over time</p></div>
                <div className="period-tabs">{["day","week","month"].map(p=><button key={p} className={period===p?"active":""} onClick={()=>setPeriod(p)}>{p==="day"?"Day":p==="week"?"Week":"Month"}</button>)}</div>
              </div>
              <div className="chart-wrap terminal-chart">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={periodData}>
                    <CartesianGrid stroke={chartColors.grid} vertical={false}/>
                    <XAxis dataKey="name" stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={10}/>
                    <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={10}/>
                    <Tooltip contentStyle={{background:chartColors.tooltipBg,border:`1px solid ${chartColors.tooltipBorder}`,borderRadius:0,color:chartColors.tooltipText}} formatter={v=>[`$${Number(v).toFixed(2)}`,"Profit"]}/>
                    <Bar dataKey="profit" fill="#2563eb" radius={[0,0,0,0]} maxBarSize={28}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>}

        {tab==="psychology"&&<section className="workspace-section">
          <div className="section-head"><div><h2>Mindset ledger</h2><p>Results grouped by recorded state</p></div></div>
          <div className="market-table psychology-ledger">
            <div className="market-row psych-row market-head"><span>Feeling</span><span>Trades</span><span>Win rate</span><span>Avg R</span><span>Total R</span><span>P&L</span></div>
            {analytics.feelings.map(x=><div className="market-row psych-row" key={x.name}><strong>{x.name}</strong><span>{x.trades}</span><span>{x.winrate.toFixed(0)}%</span><span className={x.avgR>=0?"positive":"negative"}>{x.avgR>=0?"+":""}{x.avgR.toFixed(2)}R</span><span className={x.r>=0?"positive":"negative"}>{x.r>=0?"+":""}{x.r.toFixed(2)}R</span><span className={x.profit>=0?"positive":"negative"}>{money(x.profit)}</span></div>)}
          </div>
        </section>}

        <TradeModal trade={selectedTrade} onClose={()=>setSelectedTrade(null)}/>
      </main>
    </div>
  );
}

function App() {
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(undefined);
  const [theme,setTheme]=useState(() => {
    const saved = localStorage.getItem("tradelog-theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    localStorage.setItem("tradelog-theme",theme);
  },[theme]);

  const toggleTheme=()=>setTheme(t=>t==="dark"?"light":"dark");

  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const{data:listener}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setProfile(undefined)});return()=>listener.subscription.unsubscribe()},[]);
  useEffect(()=>{if(session)refreshProfile();else setProfile(undefined)},[session]);
  async function refreshProfile(){const{data,error}=await supabase.from("profiles").select("telegram_username, telegram_user_id").single();if(error&&error.code!=="PGRST116")console.error(error);setProfile(data||null)}

  if(!session)return <Login onSession={setSession} theme={theme} onToggleTheme={toggleTheme}/>;
  if(profile===undefined)return <main className="center-screen app-bg"><div className="page-theme-control"><ThemeToggle theme={theme} onToggle={toggleTheme}/></div><div className="loader-card"><span className="spinner"/>Loading your dashboard…</div></main>;
  if(!profile?.telegram_user_id)return <LinkTelegram onLinked={refreshProfile} theme={theme} onToggleTheme={toggleTheme}/>;
  return <Dashboard profile={profile} theme={theme} onToggleTheme={toggleTheme}/>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
