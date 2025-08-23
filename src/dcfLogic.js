// ---------- dcfLogic.js (all calculators, React-friendly) ----------

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);
const setVal  = (id, v) => { const el = $(id); if (el) el.value = String(v); };
const setHtml = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

// Parse numbers like "15.1B", "3,200", "$1.2M", "-70B"
export function parseNumber(s) {
  if (s == null) return NaN;
  const str = String(s).trim().replace(/[\$,]/g, "");
  if (!str) return NaN;
  const m = str.match(/^(-?\d*\.?\d+)\s*([kKmMbBtT])?$/);
  if (m) {
    let n = parseFloat(m[1]);
    const u = (m[2] || "").toLowerCase();
    const mult = u === "k" ? 1e3 : u === "m" ? 1e6 : u === "b" ? 1e9 : u === "t" ? 1e12 : 1;
    return n * mult;
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : NaN;
}
export function parseList(str) {
  if (!str) return [];
  return str.split(",").map(x => parseFloat(String(x).trim())).filter(Number.isFinite);
}
const fmtUSD = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";
const fmtPct = (n) =>
  Number.isFinite(n)
    ? (n * 100).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%"
    : "—";

// ---------- Core DCF engine (reusable) ----------
function computeDCF({ startFCF, years, midYear, growthSeries, r, gTerm, netDebt, shares }) {
  let fcf = startFCF;
  const rows = [];
  let pvSum = 0;

  for (let t = 1; t <= years; t++) {
    const g = growthSeries[Math.min(t - 1, growthSeries.length - 1)];
    fcf = fcf * (1 + g);
    const exp = midYear ? t - 0.5 : t;
    const pv = fcf / Math.pow(1 + r, exp);
    pvSum += pv;
    rows.push({ year: t, fcf, pv });
  }

  let pvTV = 0;
  if (Number.isFinite(gTerm) && r > gTerm) {
    const tv = (fcf * (1 + gTerm)) / (r - gTerm);
    const exp = midYear ? years - 0.5 : years;
    pvTV = tv / Math.pow(1 + r, exp);
  }

  const EV = pvSum + pvTV;
  const equity = Number.isFinite(netDebt) ? EV - netDebt : EV;
  const perShare = Number.isFinite(shares) && shares > 0 ? equity / shares : NaN;

  return { rows, pvSum, pvTV, EV, equity, perShare };
}

let lastPerShare = NaN; // remembered from last DCF run for MOS

// ---------- Example loader ----------
export function loadExample() {
  // Core DCF
  setVal("startingFCF", "99B");
  setVal("years", "5");
  setVal("midYear", "true");
  setVal("growth", "0.07,0.06,0.05,0.04,0.03");
  setVal("discountRate", "0.085");
  setVal("terminalGrowth", "0.025");
  setVal("netDebt", "-60B");
  setVal("shares", "15.10B");

  // Sensitivity
  setVal("sensRates", "0.08,0.085,0.09");
  setVal("sensGrowths", "0.02,0.025,0.03");

  // WACC helper
  setVal("rf", "0.035");
  setVal("erp", "0.05");
  setVal("beta", "1.10");
  setVal("tax", "0.21");
  setVal("equity", "3.4T");
  setVal("debt", "110B");
  setVal("rd", "0.035");
  setVal("ieOverDebt", "3.9B / 110B");

  // Quick valuation
  setVal("eps", "7.00");
  setVal("targetPE", "25");
  setVal("peg", "2.0");
  setVal("fpe", "29");
  setVal("ebitda", "130B");
  setVal("evx", "18");
  setVal("nd2", "-70B");
  setVal("sh2", "15.10B");

  // Scenarios & MOS
  setVal("bear", "0.05 / 0.09 / 0.02");
  setVal("base", "0.07 / 0.085 / 0.025");
  setVal("bull", "0.09 / 0.08 / 0.03");
  setVal("weights", "0.2,0.6,0.2");
  setVal("mos", "20");

  // Clear outputs
  ["summary","fcfTable","sensMeta","sensTable","waccOut","pePrice","pegGrowth","evEbitdaOut","scenOut","mosOut"]
    .forEach(id => setHtml(id, ""));
}

// ---------- DCF + Sensitivity ----------
export function runDCF() {
  const startFCF = parseNumber($("startingFCF")?.value);
  const years = parseInt($("years")?.value || "0", 10);
  const midYear = String($("midYear")?.value) === "true";
  const growthStr = $("growth")?.value || "";
  const r = parseFloat($("discountRate")?.value || "0");
  const gTerm = parseFloat($("terminalGrowth")?.value || "0");
  const netDebt = parseNumber($("netDebt")?.value);
  const shares = parseNumber($("shares")?.value);

  if (!Number.isFinite(startFCF) || !Number.isFinite(years) || years <= 0 || !Number.isFinite(r)) {
    alert("Please enter valid Starting FCF, Years, and Discount Rate.");
    return;
  }

  // Growth series
  const growths = parseList(growthStr);
  const growthSeries =
    growths.length >= years
      ? growths.slice(0, years)
      : Array.from({ length: years }, (_, i) => (growths[0] ?? 0.05));

  // Compute
  const res = computeDCF({ startFCF, years, midYear, growthSeries, r, gTerm, netDebt, shares });
  lastPerShare = res.perShare;

  // Summary
  setHtml(
    "summary",
    `
      <div class="kv"><div>PV of FCF</div><div>${fmtUSD(res.pvSum)}</div></div>
      <div class="kv"><div>PV of Terminal</div><div>${fmtUSD(res.pvTV)}</div></div>
      <div class="kv"><div>Enterprise Value (EV)</div><div>${fmtUSD(res.EV)}</div></div>
      <div class="kv"><div>Equity Value</div><div>${fmtUSD(res.equity)}</div></div>
      <div class="kv"><div>Intrinsic / Share</div><div>${Number.isFinite(res.perShare) ? fmtUSD(res.perShare) : "—"}</div></div>
      <div class="kv"><div>Assumptions</div><div>r = ${fmtPct(r)}; g∞ = ${fmtPct(gTerm)}; mid‑year = ${midYear ? "On" : "Off"}</div></div>
    `
  );

  // FCF table
  let fcfHtml = `<thead><tr><th>Year</th><th>FCF</th><th>PV</th></tr></thead><tbody>`;
  res.rows.forEach((row) => {
    fcfHtml += `<tr><td>Y${row.year}</td><td>${fmtUSD(row.fcf)}</td><td>${fmtUSD(row.pv)}</td></tr>`;
  });
  fcfHtml += `</tbody>`;
  setHtml("fcfTable", fcfHtml);

  // Sensitivity
  const sr = parseList($("sensRates")?.value || "");
  const sg = parseList($("sensGrowths")?.value || "");
  if (sr.length && sg.length && Number.isFinite(shares) && shares > 0) {
    setHtml("sensMeta", `Per‑share value across Discount Rate (rows) × Terminal Growth (cols)`);
    let grid = `<thead><tr><th>r \\ g∞</th>${sg.map((g) => `<th>${fmtPct(g)}</th>`).join("")}</tr></thead><tbody>`;
    sr.forEach((rr) => {
      grid += `<tr><th>${fmtPct(rr)}</th>`;
      sg.forEach((gg) => {
        if (rr <= gg) {
          grid += `<td style="color:crimson">n/a</td>`;
        } else {
          const alt = computeDCF({ startFCF, years, midYear, growthSeries, r: rr, gTerm: gg, netDebt, shares });
          grid += `<td>${fmtUSD(alt.perShare)}</td>`;
        }
      });
      grid += `</tr>`;
    });
    grid += `</tbody>`;
    setHtml("sensTable", grid);
  } else {
    setHtml("sensMeta", "");
    setHtml("sensTable", "");
  }
}

// ---------- WACC helper ----------
export function calcWacc() {
  const rf   = parseFloat($("rf")?.value || "0");
  const erp  = parseFloat($("erp")?.value || "0");
  const beta = parseFloat($("beta")?.value || "1");
  const tax  = parseFloat($("tax")?.value || "0");

  // Capital structure
  const E = parseNumber($("equity")?.value);
  const D = parseNumber($("debt")?.value);
  const V = (Number.isFinite(E) ? E : 0) + (Number.isFinite(D) ? D : 0);
  const wE = V > 0 ? (Number.isFinite(E) ? E : 0) / V : 0.5;
  const wD = V > 0 ? (Number.isFinite(D) ? D : 0) / V : 0.5;

  // ke via CAPM
  const ke = rf + (Number.isFinite(beta) ? beta : 1) * erp;

  // kd
  let rd = parseFloat($("rd")?.value || "0");
  const ieOverDebt = $("ieOverDebt")?.value?.trim();
  if ((!rd || rd <= 0) && ieOverDebt) {
    const parts = ieOverDebt.split("/").map((x) => parseNumber(x));
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && parts[1] !== 0) {
      rd = parts[0] / parts[1];
    }
  }
  if (!Number.isFinite(rd) || rd <= 0) rd = 0.04;

  const afterTaxKd = rd * (1 - (Number.isFinite(tax) ? tax : 0));
  const wacc = ke * wE + afterTaxKd * wD;

  setHtml(
    "waccOut",
    `
      <div class="kv"><div>Cost of Equity (ke)</div><div>${fmtPct(ke)}</div></div>
      <div class="kv"><div>Pre‑tax Cost of Debt (kd)</div><div>${fmtPct(rd)}</div></div>
      <div class="kv"><div>After‑tax kd</div><div>${fmtPct(afterTaxKd)}</div></div>
      <div class="kv"><div>Weights (E/D)</div><div>${(wE*100).toFixed(1)}% / ${(wD*100).toFixed(1)}%</div></div>
      <div class="kv"><div>WACC</div><div style="font-weight:700">${fmtPct(wacc)}</div></div>
    `
  );
  return wacc;
}
export function applyWacc() {
  const w = calcWacc();
  if (Number.isFinite(w)) setVal("discountRate", w);
}

// ---------- Quick Valuation ----------
export function peTargetPrice() {
  const eps = parseFloat($("eps")?.value || "0");
  const pe  = parseFloat($("targetPE")?.value || "0");
  const price = Number.isFinite(eps) && Number.isFinite(pe) ? eps * pe : NaN;
  setHtml("pePrice", Number.isFinite(price) ? fmtUSD(price) : "—");
}
export function pegImpliedGrowth() {
  const peg = parseFloat($("peg")?.value || "0");
  const fpe = parseFloat($("fpe")?.value || "0");
  const g = peg > 0 ? (fpe / peg) / 100 : NaN; // e.g., 30/2 = 15% → 0.15
  setHtml("pegGrowth", Number.isFinite(g) ? fmtPct(g) : "—");
}
export function evEbitdaFair() {
  const ebitda = parseNumber($("ebitda")?.value);
  const mult   = parseFloat($("evx")?.value || "0");
  const netD   = parseNumber($("nd2")?.value);
  const sh     = parseNumber($("sh2")?.value);
  if (!Number.isFinite(ebitda) || !Number.isFinite(mult) || !Number.isFinite(sh) || sh <= 0) {
    setHtml("evEbitdaOut", "—");
    return;
  }
  const EV = ebitda * mult;
  const equity = Number.isFinite(netD) ? EV - netD : EV;
  const price = equity / sh;
  setHtml("evEbitdaOut", fmtUSD(price));
}

// ---------- Scenarios & MOS ----------
function parseTriple(s) {
  if (!s) return null;
  // supports "0.07 / 0.085 / 0.025" or "0.07,0.085,0.025"
  const parts = s.replace(/\s/g, "").split(/[\/,]/).map(Number).filter(x => !Number.isNaN(x));
  if (parts.length < 3) return null;
  return { g: parts[0], r: parts[1], gt: parts[2] };
}
export function runScenarios() {
  const startFCF = parseNumber($("startingFCF")?.value);
  const years = parseInt($("years")?.value || "0", 10);
  const midYear = String($("midYear")?.value) === "true";
  const netDebt = parseNumber($("netDebt")?.value);
  const shares = parseNumber($("shares")?.value);
  const bear = parseTriple($("bear")?.value);
  const base = parseTriple($("base")?.value);
  const bull = parseTriple($("bull")?.value);
  const w = parseList($("weights")?.value || "0.333,0.333,0.333");
  while (w.length < 3) w.push(0);
  const norm = w.reduce((a,b)=>a+b,0) || 1;
  const W = w.map(x => x / norm);

  if (!Number.isFinite(startFCF) || !Number.isFinite(years) || years<=0 || !Number.isFinite(shares) || shares<=0 ||
      !bear || !base || !bull) {
    setHtml("scenOut", "Fill DCF basics and scenario triples (g / WACC / g∞).");
    return;
  }

  const calc = (triple) => computeDCF({
    startFCF, years, midYear,
    growthSeries: Array.from({length:years}, () => triple.g),
    r: triple.r, gTerm: triple.gt, netDebt, shares
  }).perShare;

  const psBear = calc(bear);
  const psBase = calc(base);
  const psBull = calc(bull);
  const weighted = psBear*W[0] + psBase*W[1] + psBull*W[2];

  setHtml(
    "scenOut",
    `
      <div class="kv"><div>Bear</div><div>${fmtUSD(psBear)}</div></div>
      <div class="kv"><div>Base</div><div>${fmtUSD(psBase)}</div></div>
      <div class="kv"><div>Bull</div><div>${fmtUSD(psBull)}</div></div>
      <div class="kv"><div>Weighted Fair Value</div><div style="font-weight:700">${fmtUSD(weighted)}</div></div>
    `
  );
}
export function computeMOS() {
  // Use current inputs
  const startFCF = parseNumber($("startingFCF")?.value);
  const years = parseInt($("years")?.value || "0", 10);
  const midYear = String($("midYear")?.value) === "true";
  const r = parseFloat($("discountRate")?.value || "0");
  const gTerm = parseFloat($("terminalGrowth")?.value || "0");
  const netDebt = parseNumber($("netDebt")?.value);
  const shares = parseNumber($("shares")?.value);
  const growthStr = $("growth")?.value || "";
  const growths = parseList(growthStr);
  const growthSeries = growths.length >= years ? growths.slice(0, years) : Array.from({length:years}, () => (growths[0] ?? 0.05));

  const res = computeDCF({ startFCF, years, midYear, growthSeries, r, gTerm, netDebt, shares });
  const perShare = Number.isFinite(res.perShare) ? res.perShare : lastPerShare;
  const mosPct = parseFloat($("mos")?.value || "0") / 100;
  const target = Number.isFinite(perShare) ? perShare * (1 - mosPct) : NaN;

  setHtml("mosOut", Number.isFinite(target) ? fmtUSD(target) : "—");
}

// ---------- CSV export ----------
export function exportCsv() {
  const tbl = $("fcfTable");
  if (!tbl) return;
  const rows = Array.from(tbl.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.children).map((td) => td.textContent.replace(/,/g, ""))
  );
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dcf_projection.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Kept for compatibility (no-op)
export function initDCF() { /* no-op */ }