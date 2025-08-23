import { useEffect, useMemo, useRef, useState } from "react";

const KEY = import.meta.env.VITE_FINNHUB_KEY;
// If you added a Vite proxy (recommended), set BASE to "/fh/api/v1" and REMOVE the &token from the URL below.
const BASE = "https://finnhub.io/api/v1";

function cls(...xs) { return xs.filter(Boolean).join(" "); }
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

function Pill({ s, q }) {
  const pct = q?.dp;
  const up = Number.isFinite(pct) ? pct >= 0 : true;
  return (
    <div className={cls("tt-pill", Number.isFinite(pct) ? (up ? "tt-up" : "tt-down") : "tt-na")}>
      <span className="tt-sym">{s}</span>
      <span className="tt-price">
        {Number.isFinite(q?.c) ? `$${fmt(q.c)}` : "—"}
      </span>
      {Number.isFinite(pct) ? (
        <span className="tt-chg">{up ? "▲" : "▼"} {fmt(pct)}%</span>
      ) : (
        <span className="tt-chg">…</span>
      )}
    </div>
  );
}

export default function TickerTape({
  symbols = ["AAPL","MSFT","AMZN","NVDA","GOOGL","META","TSLA","AMD","NFLX","SPY","QQQ","IWM"]
}) {
  const [quotes, setQuotes] = useState({});
  const [err, setErr] = useState("");
  const trackRef = useRef(null);
  const looped = useMemo(() => symbols.concat(symbols), [symbols]);

  async function fetchOne(s) {
    // If using proxy, use: `/fh/api/v1/quote?symbol=${encodeURIComponent(s)}`
    const r = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(s)}&token=${KEY}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json(); // { c, d, dp, h, l, o, pc }
  }

  async function fetchQuotes() {
    if (!KEY) { setErr("Missing Finnhub key"); return; }
    setErr("");
    try {
      const settled = await Promise.allSettled(symbols.map(fetchOne));
      const next = {};
      let successCount = 0;

      settled.forEach((res, i) => {
        const s = symbols[i];
        if (res.status === "fulfilled" && res.value && typeof res.value === "object") {
          next[s] = res.value;
          successCount++;
        }
      });

      setQuotes(next);
      // Only show the banner if everything failed
      if (successCount === 0) setErr("Failed to fetch");
    } catch (e) {
      // This only triggers on something truly global (e.g., network down)
      setErr(e.message || "Failed to fetch");
    }
  }

  useEffect(() => {
    fetchQuotes();
    const id = setInterval(fetchQuotes, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, [symbols.join(",")]);

  // Pause marquee on hover (optional)
  useEffect(() => {
    const el = trackRef.current; if (!el) return;
    const onEnter = () => (el.style.animationPlayState = "paused");
    const onLeave = () => (el.style.animationPlayState = "running");
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mouseenter", onEnter); el.removeEventListener("mouseleave", onLeave); };
  }, []);

  return (
    <div className="ticker-tape" aria-label="Market ticker">
      <div className="ticker-track" ref={trackRef}>
        {looped.map((s, i) => (
          <Pill key={`${s}-${i}`} s={s} q={quotes[s]} />
        ))}
      </div>
      {err && <div className="ticker-error">Ticker feed: {err}</div>}
    </div>
  );
}