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

function money(value) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Login({ onSession }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);

    if (result.error) {
      setMsg(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMsg("Account created. Check your email if confirmation is enabled.");
      return;
    }

    onSession(result.data.session);
  }

  return (
    <main className="center-screen">
      <section className="auth-card">
        <div className="brand-mark">↗</div>
        <h1>Trading Dashboard</h1>
        <p className="muted">Read-only analytics from your Telegram journal.</p>

        <form onSubmit={submit}>
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <label>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <button className="primary" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {msg && <div className="message">{msg}</div>}

        <button className="text-button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}

function LinkTelegram({ onLinked }) {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function createLink(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    const { data, error } = await supabase.rpc("start_telegram_link", {
      p_username: username,
    });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setCode(data);
  }

  return (
    <main className="center-screen">
      <section className="auth-card link-card">
        <div className="brand-mark">@</div>
        <h1>Link Telegram</h1>
        <p className="muted">
          Enter the Telegram username you use with the trading journal bot.
        </p>

        {!code ? (
          <form onSubmit={createLink}>
            <label>Telegram username</label>
            <div className="username-wrap">
              <span>@</span>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace("@", ""))}
                placeholder="username"
              />
            </div>

            <button className="primary" disabled={busy}>
              {busy ? "Creating link..." : "Continue"}
            </button>
          </form>
        ) : (
          <div className="link-instructions">
            <p>Open your trading journal bot and send:</p>
            <div className="link-code">/link {code}</div>
            <p className="muted small">
              This verifies that the Telegram account is actually yours.
            </p>
            <button className="primary" onClick={onLinked}>
              I've linked it
            </button>
            <button className="text-button" onClick={() => setCode("")}>
              Use a different username
            </button>
          </div>
        )}

        {msg && <div className="message">{msg}</div>}
      </section>
    </main>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
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
    } catch {
      return [];
    }
  }
  return [];
}

function partialBreakdown(trade) {
  const partials = parsePartials(val(trade, ["partials","partial_closes","partials_json"]));
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
  if (period === "day") return d.toLocaleDateString();
  if (period === "month") return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - ((x.getDay()+6)%7));
  return `Week of ${x.toLocaleDateString()}`;
}

function TradeModal({ trade, onClose }) {
  if (!trade) return null;

  const screenshot = val(trade, ["screenshot_url","screenshot","image_url","photo_url"]);
  const notes = val(trade, ["notes","note","trade_notes"]);
  const partials = partialBreakdown(trade);
  const plannedRR = Number(trade.rr || 0);
  const actualR = Number(trade.r_result || 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">TRADE #{trade.id}</div>
            <h2>{trade.asset} · {trade.direction}</h2>
          </div>
          <button className="close" onClick={onClose}>×</button>
        </div>

        <div className="detail-grid">
          <div><span>Date</span><b>{new Date(trade.created_at).toLocaleString()}</b></div>
          <div><span>Result</span><b>{trade.result || "—"}</b></div>
          <div><span>Planned R:R</span><b>1:{plannedRR.toFixed(2)}</b></div>
          <div><span>Actual R</span><b>{actualR >= 0 ? "+" : ""}{actualR.toFixed(2)}R</b></div>
          <div><span>Profit</span><b>{money(Number(trade.profit || 0))}</b></div>
          <div><span>Lot size</span><b>{trade.lot_size ?? "—"}</b></div>
          <div><span>Feeling</span><b>{trade.feeling || "—"}</b></div>
        </div>

        {notes && (
          <div className="detail-block">
            <span>Notes</span>
            <p>{String(notes)}</p>
          </div>
        )}

        {partials.length > 0 && (
          <div className="detail-block">
            <span>Partials</span>
            <div className="partials-list">
              {partials.map(p => (
                <div className="partial-row" key={p.index}>
                  <div>
                    <b>{p.percent.toFixed(2).replace(/\.?0+$/, "")}% @ {p.price.toLocaleString()}</b>
                  </div>
                  <div className={p.profit >= 0 ? "positive" : "negative"}>
                    {money(p.profit)}
                  </div>
                  <div className="muted small">
                    {p.r >= 0 ? "+" : ""}{p.r.toFixed(2)}R contribution
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {screenshot && (
          <div className="detail-block">
            <span>Screenshot</span>
            <img className="trade-shot" src={screenshot} alt="Trade screenshot" />
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard({ profile }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [period, setPeriod] = useState("week");
  const [selectedTrade, setSelectedTrade] = useState(null);

  useEffect(() => {
    loadTrades();
  }, []);

  async function loadTrades() {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error) setTrades(data || []);
    setLoading(false);
  }

  const analytics = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter((t) => Number(t.r_result) > 0).length;
    const losses = trades.filter((t) => Number(t.r_result) < 0).length;
    const totalProfit = trades.reduce((s, t) => s + Number(t.profit || 0), 0);
    const totalR = trades.reduce((s, t) => s + Number(t.r_result || 0), 0);
    const avgRR = total ? trades.reduce((s, t) => s + Number(t.rr || 0), 0) / total : 0;
    const grossProfit = trades.reduce((s, t) => s + Math.max(Number(t.profit || 0), 0), 0);
    const grossLoss = trades.reduce((s, t) => s + Math.abs(Math.min(Number(t.profit || 0), 0)), 0);
    const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    let running = 0;
    const curve = trades.map((t, i) => {
      running += Number(t.profit || 0);
      return {
        trade: i + 1,
        profit: Number(running.toFixed(2)),
      };
    });

    const assetCounts = {};
    trades.forEach((t) => {
      assetCounts[t.asset] = (assetCounts[t.asset] || 0) + 1;
    });
    const mostTraded =
      Object.entries(assetCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    const byAsset = Object.entries(trades.reduce((a,t)=>{ const k=t.asset||"Unknown"; a[k] ||= {asset:k,trades:0,wins:0,profit:0,r:0}; a[k].trades++; a[k].wins += Number(t.r_result)>0?1:0; a[k].profit += Number(t.profit||0); a[k].r += Number(t.r_result||0); return a; },{})).map(([,x])=>({...x,winrate:x.trades?x.wins/x.trades*100:0})).sort((a,b)=>b.profit-a.profit);
    const feelings = Object.entries(trades.reduce((a,t)=>{ const k=t.feeling||"Not recorded"; a[k] ||= {name:k,trades:0,profit:0,wins:0}; a[k].trades++; a[k].profit += Number(t.profit||0); a[k].wins += Number(t.r_result)>0?1:0; return a; },{})).map(([,x])=>({...x,winrate:x.trades?x.wins/x.trades*100:0})).sort((a,b)=>b.trades-a.trades);
    let peak=0, equity=0, maxDrawdown=0, winStreak=0, lossStreak=0, cw=0, cl=0;
    trades.forEach(t=>{ equity += Number(t.profit||0); peak=Math.max(peak,equity); maxDrawdown=Math.min(maxDrawdown,equity-peak); if(Number(t.r_result)>0){cw++;cl=0}else if(Number(t.r_result)<0){cl++;cw=0}else{cw=0;cl=0} winStreak=Math.max(winStreak,cw); lossStreak=Math.max(lossStreak,cl); });
    const partialTrades = trades.filter(t=>val(t,["partials","partial_closes","partials_json","partial_profit","partial_r"]));
    return { total,wins,losses,winrate: total ? (wins / total) * 100 : 0,totalProfit,totalR,avgRR,pf,curve,mostTraded,byAsset,feelings,maxDrawdown,winStreak,lossStreak,partialCount:partialTrades.length };
  }, [trades]);

  const assets = ["ALL", ...new Set(trades.map((t) => t.asset))];
  const visible = filter === "ALL" ? [...trades].reverse() : [...trades].reverse().filter((t) => t.asset === filter);
  const periodData = useMemo(() => Object.values(trades.reduce((a,t)=>{ const k=periodKey(t.created_at,period); a[k] ||= {name:k,profit:0,r:0,trades:0}; a[k].profit += Number(t.profit||0); a[k].r += Number(t.r_result||0); a[k].trades++; return a; },{})), [trades,period]);

  if (loading) {
    return <main className="center-screen"><div className="loader">Loading trading data…</div></main>;
  }

  if (!trades.length) {
    return (
      <main className="center-screen">
        <section className="empty-card">
          <div className="empty-icon">∅</div>
          <h2>No trading data found</h2>
          <p className="muted">
            No journal trades were found for @{profile.telegram_username}.
          </p>
          <p className="muted small">
            Add a trade through the Telegram journal bot, then refresh this page.
          </p>
          <button className="primary" onClick={loadTrades}>Refresh</button>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header>
        <div>
          <div className="eyebrow">TRADING ANALYTICS</div>
          <h1>Performance Dashboard</h1>
          <p className="muted">@{profile.telegram_username}</p>
        </div>
        <button className="logout" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>

      <section className="stats-grid">
        <Stat label="Overall Profit" value={money(analytics.totalProfit)} />
        <Stat label="Overall R" value={`${analytics.totalR >= 0 ? "+" : ""}${analytics.totalR.toFixed(2)}R`} />
        <Stat label="Win Rate" value={`${analytics.winrate.toFixed(1)}%`} note={`${analytics.wins} wins / ${analytics.losses} losses`} />
        <Stat label="Profit Factor" value={analytics.pf === Infinity ? "∞" : analytics.pf.toFixed(2)} />
        <Stat label="Total Trades" value={analytics.total} />
        <Stat label="Most Traded" value={analytics.mostTraded} />
      </section>

      <section className="stats-grid secondary-stats">
        <Stat label="Max Drawdown" value={money(analytics.maxDrawdown)} />
        <Stat label="Best Win Streak" value={`${analytics.winStreak} trades`} />
        <Stat label="Worst Loss Streak" value={`${analytics.lossStreak} trades`} />
        <Stat label="Trades With Partials" value={analytics.partialCount} />
        <Stat label="Average Planned R:R" value={`1:${analytics.avgRR.toFixed(2)}`} />
      </section>

      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Equity Curve</h2>
            <p className="muted">Cumulative realised USD profit</p>
          </div>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={analytics.curve}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#72f2c6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#72f2c6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#20293c" vertical={false} />
              <XAxis dataKey="trade" stroke="#71809b" tickLine={false} />
              <YAxis stroke="#71809b" tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#121a2a", border: "1px solid #27334b", borderRadius: 12 }}
                formatter={(v) => [`$${Number(v).toFixed(2)}`, "Equity"]}
              />
              <Area type="monotone" dataKey="profit" stroke="#72f2c6" fill="url(#equityFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="analytics-grid">
        <div className="panel">
          <div className="panel-heading"><div><h2>Performance by Asset</h2><p className="muted">Profit, win rate and R</p></div></div>
          <div className="mini-table">{analytics.byAsset.map(x=><div className="mini-row" key={x.asset}><b>{x.asset}</b><span>{x.trades} trades</span><span>{x.winrate.toFixed(0)}% WR</span><span className={x.profit>=0?"positive":"negative"}>{money(x.profit)}</span><span>{x.r>=0?"+":""}{x.r.toFixed(2)}R</span></div>)}</div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><h2>Psychology</h2><p className="muted">How feelings relate to results</p></div></div>
          <div className="mini-table">{analytics.feelings.map(x=><div className="mini-row psychology" key={x.name}><b>{x.name}</b><span>{x.trades} trades</span><span>{x.winrate.toFixed(0)}% WR</span><span className={x.profit>=0?"positive":"negative"}>{money(x.profit)}</span></div>)}</div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading trade-heading"><div><h2>Period Performance</h2><p className="muted">Daily, weekly or monthly realised profit</p></div><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select></div>
        <div className="chart-wrap small-chart"><ResponsiveContainer width="100%" height={260}><BarChart data={periodData}><CartesianGrid stroke="#20293c" vertical={false}/><XAxis dataKey="name" stroke="#71809b" tickLine={false}/><YAxis stroke="#71809b" tickLine={false} tickFormatter={v=>`$${v}`}/><Tooltip contentStyle={{background:"#121a2a",border:"1px solid #27334b",borderRadius:12}} formatter={v=>[`$${Number(v).toFixed(2)}`,"Profit"]}/><Bar dataKey="profit" fill="#72f2c6" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
      </section>

      <section className="panel">
        <div className="panel-heading trade-heading">
          <div>
            <h2>Trade History</h2>
            <p className="muted">Read-only data from Telegram</p>
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {assets.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Asset</th>
                <th>Direction</th>
                <th>Lot</th>
                <th>Result</th>
                <th>Planned R:R</th>
                <th>Actual R</th>
                <th>Profit</th>
                <th>Feeling</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} className="click-row" onClick={() => setSelectedTrade(t)}>
                  <td>#{t.id}</td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="asset">{t.asset}</td>
                  <td>{t.direction}</td>
                  <td>{t.lot_size}</td>
                  <td><span className={`pill ${Number(t.r_result) > 0 ? "win" : Number(t.r_result) < 0 ? "loss" : "be"}`}>{t.result}</span></td>
                  <td>1:{Number(t.rr || 0).toFixed(2)}</td>
                  <td>{Number(t.r_result) >= 0 ? "+" : ""}{Number(t.r_result).toFixed(2)}R</td>
                  <td className={Number(t.profit) >= 0 ? "positive" : "negative"}>{money(Number(t.profit || 0))}</td>
                  <td>{t.feeling || "—"}</td>
                  <td><button className="view-button">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <TradeModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(undefined);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) refreshProfile();
    else setProfile(undefined);
  }, [session]);

  async function refreshProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("telegram_username, telegram_user_id")
      .single();

    if (error && error.code !== "PGRST116") {
      console.error(error);
    }

    setProfile(data || null);
  }

  if (!session) return <Login onSession={setSession} />;
  if (profile === undefined) return <main className="center-screen"><div className="loader">Loading…</div></main>;

  if (!profile?.telegram_user_id) {
    return <LinkTelegram onLinked={refreshProfile} />;
  }

  return <Dashboard profile={profile} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
