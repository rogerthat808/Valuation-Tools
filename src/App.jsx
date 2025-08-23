import { useEffect } from "react";
import {
  loadExample,
  runDCF,
  calcWacc,
  applyWacc,
  exportCsv,
  peTargetPrice,
  pegImpliedGrowth,
  evEbitdaFair,
  runScenarios,
  computeMOS,
  initDCF,
} from "./dcfLogic";
import TickerTape from "./TickerTape"; // optional (remove if you don't want the top bar)
import "./App.css";

export default function App() {
  // theme restore
  useEffect(() => {
    const t = localStorage.getItem("theme");
    if (t) document.body.setAttribute("data-theme", t);
  }, []);
  // legacy/no-op init
  useEffect(() => { initDCF?.(); }, []);

  return (
    <>
      <header>
        <div className="brand">
          <span className="dot" /> Investor Toolkit — DCF &amp; Valuation
        </div>
        <div className="navright">
          <button
            className="toggle"
            onClick={() => {
              const dark = document.body.getAttribute("data-theme") === "dark";
              const next = dark ? "light" : "dark";
              document.body.setAttribute("data-theme", next);
              localStorage.setItem("theme", next);
            }}
          >
            Toggle Theme
          </button>
          <span className="muted">Paste Yahoo numbers → value a company fast.</span>
        </div>
      </header>

      {/* Remove this if you don't want a scrolling market bar */}
      <TickerTape symbols={["AAPL","MSFT","NVDA","GOOGL","META","TSLA","AMD","NFLX","SPY","QQQ","IWM","XLF","XLE","GLD","TLT"]} />

      <main className="wrap">
        {/* LEFT COLUMN */}
        <div className="stack">
          {/* DCF Inputs */}
          <section className="card">
            <h2>DCF Inputs</h2>
            <div className="body grid">
              <div>
                <label>Starting Free Cash Flow (last FY)</label>
                <input id="startingFCF" placeholder="e.g., 10B" />
              </div>

              <div className="row">
                <div>
                  <label>Forecast Years</label>
                  <input id="years" defaultValue="5" />
                </div>
                <div>
                  <label>Mid-Year Convention</label>
                  <select id="midYear" defaultValue="true">
                    <option value="true">On</option>
                    <option value="false">Off</option>
                  </select>
                </div>
              </div>

              <div>
                <label>Growth (constant or comma list)</label>
                <input id="growth" placeholder="0.08 or 0.10,0.09,0.08,0.07,0.06" />
              </div>

              <div className="row">
                <div><label>Discount Rate (WACC)</label><input id="discountRate" placeholder="0.09" /></div>
                <div><label>Terminal Growth g∞</label><input id="terminalGrowth" placeholder="0.025" /></div>
              </div>

              <div className="row">
                <div><label>Net Debt (Debt − Cash)</label><input id="netDebt" placeholder="-60B" /></div>
                <div><label>Shares Outstanding (diluted)</label><input id="shares" placeholder="15.1B" /></div>
              </div>

              {/* Sensitivity controls */}
              <div className="card highlight-box">
                <div className="body grid">
                  <h3 style={{ margin: 0, fontSize: 14 }}>Sensitivity (optional)</h3>
                  <div className="row">
                    <div><label>Discount rates (comma‑sep)</label><input id="sensRates" placeholder="0.08,0.085,0.09" /></div>
                    <div><label>Terminal growths g∞ (comma‑sep)</label><input id="sensGrowths" placeholder="0.02,0.025,0.03" /></div>
                  </div>
                  <div className="btns" style={{ marginTop: 8 }}>
                    <button className="ghost" onClick={runDCF}>Run Sensitivity Only</button>
                  </div>
                </div>
              </div>

              <div className="btns">
                <button className="primary" onClick={runDCF}>Run DCF</button>
                <button className="ghost" onClick={loadExample}>Load Example</button>
                <button className="ghost" onClick={exportCsv}>Export CSV</button>
              </div>
            </div>
          </section>

          {/* WACC Helper */}
          <section className="card">
            <h2>WACC Helper</h2>
            <div className="body grid">
              <div className="row">
                <div><label>Risk‑free (10Y)</label><input id="rf" placeholder="0.035" /></div>
                <div><label>Equity Risk Premium</label><input id="erp" placeholder="0.05" /></div>
              </div>
              <div className="row">
                <div><label>Beta</label><input id="beta" placeholder="1.00" /></div>
                <div><label>Tax rate</label><input id="tax" placeholder="0.21" /></div>
              </div>
              <div className="row">
                <div><label>Market cap (E)</label><input id="equity" placeholder="3.4T" /></div>
                <div><label>Debt (D)</label><input id="debt" placeholder="110B" /></div>
              </div>
              <div className="row">
                <div><label>Pre‑tax cost of debt (Rd)</label><input id="rd" placeholder="0.035" /></div>
                <div><label>or: Interest / Debt</label><input id="ieOverDebt" placeholder="3.9B / 110B" /></div>
              </div>
              <div className="btns">
                <button className="primary" onClick={calcWacc}>Calculate WACC</button>
                <button className="ghost" onClick={applyWacc}>Apply to Discount Rate</button>
              </div>
              <div className="grid" id="waccOut"></div>
            </div>
          </section>

          {/* Quick valuation tools */}
          <section className="card">
            <h2>Quick Valuation Tools</h2>
            <div className="body grid">
              <div className="row">
                <div><label>Next‑year EPS</label><input id="eps" placeholder="7.00" /></div>
                <div><label>Target P/E</label><input id="targetPE" placeholder="25" /></div>
              </div>
              <div className="btns">
                <button className="ghost" onClick={peTargetPrice}>P/E Target Price</button>
                <span id="pePrice" className="kv"></span>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

              <div className="row">
                <div><label>PEG (5y expected)</label><input id="peg" placeholder="2.0" /></div>
                <div><label>Forward P/E</label><input id="fpe" placeholder="29" /></div>
              </div>
              <div className="btns">
                <button className="ghost" onClick={pegImpliedGrowth}>Implied growth from PEG</button>
                <span id="pegGrowth" className="kv"></span>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

              <div className="row">
                <div><label>EBITDA</label><input id="ebitda" placeholder="130B" /></div>
                <div><label>EV/EBITDA multiple</label><input id="evx" placeholder="18" /></div>
              </div>
              <div className="row">
                <div><label>Net debt (for EV→Equity)</label><input id="nd2" placeholder="-70B" /></div>
                <div><label>Shares</label><input id="sh2" placeholder="15.1B" /></div>
              </div>
              <div className="btns">
                <button className="ghost" onClick={evEbitdaFair}>EV/EBITDA Fair Price</button>
                <span id="evEbitdaOut" className="kv"></span>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="stack">
          <section className="card">
            <h2>Results</h2>
            <div className="body">
              <div className="grid" id="summary"></div>
              <div style={{ height: 10 }} />
              <h3 style={{ margin: "0 0 6px 0", fontSize: 14 }}>Projected FCF (Year 1 → N)</h3>
              <table id="fcfTable"></table>
              <div style={{ height: 16 }} />
              <h3 style={{ margin: "0 0 6px 0", fontSize: 14 }}>Sensitivity (Per‑Share if shares provided)</h3>
              <div id="sensMeta" className="muted" style={{ marginBottom: 8 }}></div>
              <table id="sensTable"></table>
            </div>
          </section>

          <section className="card">
            <h2>Scenario Builder &amp; Margin of Safety</h2>
            <div className="body grid">
              <div className="row">
                <div><label>Bear: g / WACC / g∞</label><input id="bear" placeholder="0.05 / 0.09 / 0.02" /></div>
                <div><label>Base: g / WACC / g∞</label><input id="base" placeholder="0.07 / 0.085 / 0.025" /></div>
              </div>
              <div className="row">
                <div><label>Bull: g / WACC / g∞</label><input id="bull" placeholder="0.09 / 0.08 / 0.03" /></div>
                <div><label>Weights (bear,base,bull)</label><input id="weights" placeholder="0.2,0.6,0.2" /></div>
              </div>
              <div className="btns">
                <button className="ghost" onClick={runScenarios}>Run Scenarios</button>
                <span id="scenOut" className="kv"></span>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

              <div>
                <label>Margin of Safety (%)</label>
                <input id="mos" defaultValue="20" />
                <div className="hint">Target buy price = Intrinsic per‑share × (1 − MOS%).</div>
              </div>
              <div className="btns">
                <button className="ghost" onClick={computeMOS}>Compute MOS Price</button>
                <span id="mosOut" className="kv"></span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer>Built for quick, offline analysis.</footer>
    </>
  );
}