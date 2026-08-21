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

function Dashboard({ profile }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

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

    return {
      total,
      wins,
      losses,
      winrate: total ? (wins / total) * 100 : 0,
      totalProfit,
      totalR,
      pf,
      curve,
      mostTraded,
    };
  }, [trades]);

  const assets = ["ALL", ...new Set(trades.map((t) => t.asset))];
  const visible = filter === "ALL" ? [...trades].reverse() : [...trades].reverse().filter((t) => t.asset === filter);

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
                <th>R</th>
                <th>Profit</th>
                <th>Feeling</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="asset">{t.asset}</td>
                  <td>{t.direction}</td>
                  <td>{t.lot_size}</td>
                  <td><span className={`pill ${Number(t.r_result) > 0 ? "win" : Number(t.r_result) < 0 ? "loss" : "be"}`}>{t.result}</span></td>
                  <td>{Number(t.r_result) >= 0 ? "+" : ""}{Number(t.r_result).toFixed(2)}R</td>
                  <td className={Number(t.profit) >= 0 ? "positive" : "negative"}>{money(Number(t.profit || 0))}</td>
                  <td>{t.feeling || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
