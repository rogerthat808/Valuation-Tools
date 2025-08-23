import { useEffect, useMemo, useState } from "react";

const KEY  = import.meta.env.VITE_FINNHUB_KEY;           // put your key in .env
const BASE = "https://finnhub.io/api/v1";               // or "/fh/api/v1" if using a Vite proxy

const fmt = (n, d=2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

export default function StockSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");

  // small debounce
  const debouncedQ = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    let ignore = false;
    if (debouncedQ.length < 2) { setResults([]); return; }
    if (!KEY) { setErr("Missing Finnhub key"); return; }
    setErr(""); setLoading(true);

    fetch(`${BASE}/search?q=${encodeURIComponent(debouncedQ)}&token=${KEY}`)
      .then(r => r.json())
      .then(j => { if (!ignore) setResults(j?.result ?? []); })
      .catch(() => { if (!ignore) setErr("Search failed"); })
      .finally(() => { if (!ignore) setLoading(false); });

    return () => { ignore = true; };
  }, [debouncedQ]);

  // helper to fill an input by id, if present
  const fill = (id, v) => {
    const el = document.getElementById(id);
    if (el != null && v != null && !Number.isNaN(v)) el.value = String(v);
  };

  async function selectSymbol(sym) {
    try {
      setErr(""); setLoading(true); setResults([]); setQ(sym);

      const [profile, quote, metrics] = await Promise.all([
        fetch(`${BASE}/stock/profile2?symbol=${sym}&token=${KEY}`).then(r => r.json()),
        fetch(`${BASE}/quote?symbol=${sym}&token=${KEY}`).then(r => r.json()),
        fetch(`${BASE}/stock/metric?symbol=${sym}&metric=all&token=${KEY}`).then(r => r.json()),
      ]);
      const m = metrics?.metric || {};
      // light auto-fill into your DCF inputs (safe if absent)
      const shares = m.shares_basic || m.shares_outstanding || profile.shareOutstanding;
      const totalDebt = m.total_debt || m.totalDebt;
      const cash = m.cash_and_short_term_investments;
      const netDebt = (Number.isFinite(totalDebt) && Number.isFinite(cash)) ? totalDebt - cash : undefined;

      fill("shares", shares);
      if (Number.isFinite(netDebt)) fill("netDebt", netDebt);

      setInfo({
        symbol: sym,
        name: profile.name,
        exchange: profile.exchange,
        industry: profile.finnhubIndustry,
        price: quote.c,
        changePct: quote.dp,
      });
    } catch (e) {
      setErr("Failed to fetch details");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" style={{ marginBottom: 12 }}>
      <h2>Search Stocks & ETFs</h2>
      <div className="body" style={{ display: "grid", gap: 8 }}>
        <input
          type="text"
          placeholder="Type company or ticker (e.g. Apple or AAPL)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {loading && <div className="muted">Searching…</div>}
        {err && <div style={{ color: "crimson" }}>{err}</div>}

        {results.length > 0 && (
          <ul style={{
            listStyle: "none", margin: 0, padding: 0,
            border: "1px solid var(--border)", borderRadius: 8,
            maxHeight: 240, overflowY: "auto", background: "var(--card)"
          }}>
            {results.map(r => (
              <li key={r.symbol}
                  onClick={() => selectSymbol(r.symbol)}
                  style={{ padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                <strong>{r.symbol}</strong> — {r.description} {r.type ? `(${r.type})` : ""}
              </li>
            ))}
          </ul>
        )}

        {info && (
          <div className="highlight-box" style={{ padding: 10 }}>
            <div><strong>{info.name}</strong> ({info.symbol})</div>
            <div>Exchange: {info.exchange || "—"}</div>
            <div>Industry: {info.industry || "—"}</div>
            <div>Price: {Number.isFinite(info.price) ? `$${fmt(info.price)}` : "—"} {Number.isFinite(info.changePct) ? `(${fmt(info.changePct)}%)` : ""}</div>
          </div>
        )}
      </div>
    </section>
  );
}