# 📊 Valuation Tools — Investor Toolkit

A lightweight **React + Vite** web application for quickly running **equity valuation models**.  
Paste financials, adjust assumptions, and get instant intrinsic value outputs — all offline, client-side, and **fast**.

---

## 🚀 Features

### 🔹 Core Models
- **Discounted Cash Flow (DCF)**  
  - Project Free Cash Flow over custom horizons  
  - Mid-Year Convention toggle  
  - Terminal value via Gordon Growth  
  - PV breakdown + Enterprise Value (EV), Equity Value, and Intrinsic Value per share  

- **Sensitivity Analysis**  
  - 2D grid of intrinsic per-share values across discount rates and terminal growth rates  
  - Color-coded for clarity  

- **WACC Helper**  
  - Compute Weighted Average Cost of Capital (CAPM + cost of debt)  
  - Inputs: Risk-Free Rate, ERP, Beta, Tax, Capital Structure, Rd (or Interest ÷ Debt)  
  - One-click **Apply to DCF Discount Rate**  

### 🔹 Quick Valuation Shortcuts
- **P/E Target Price** — EPS × Target P/E multiple  
- **PEG Ratio Implied Growth** — Forward P/E ÷ PEG  
- **EV/EBITDA Fair Price** — Enterprise Value via EBITDA multiple → Equity per share  

### 🔹 Advanced Tools
- **Scenario Builder**  
  - Bear / Base / Bull cases with custom growth, WACC, and terminal growth  
  - Weighted fair value with adjustable scenario weights  
- **Margin of Safety (MOS)**  
  - Apply MOS % to per-share valuation  
  - Outputs buy-zone target price  

### 🔹 Utilities
- **Load Example** — Auto-populate fields with sample Apple Inc. numbers  
- **Export CSV** — Save projected FCF table to Excel/Sheets  
- **Dark/Light Theme Toggle**  
- **Ticker Tape (optional)** — Scrolling real-time prices for your favorite tickers  

---

## 🛠️ Tech Stack

- **Frontend**: React + Vite  
- **Charts**: Recharts (optional, can be swapped for candlesticks if needed)  
- **Styling**: Custom CSS (light/dark themes, card layout)  
- **Data Sources**: [Finnhub API](https://finnhub.io/) (for live stock prices & financials)  

---

## 📥 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/rogerthat808/Valuation-Tools.git
cd Valuation-Tools
```

Install dependedencies
```bash 
npm install
```

3. Add your environment file

Create a .env in the project root:
```bash 
VITE_FINNHUB_KEY=your_finnhub_api_key_here
```

4. Run locally

```bash 
npm run dev
```

App runs at http:localhost:7173

## Project Structure 
```bash
src/
├── App.jsx          # Main UI layout (all calculators + results)
├── dcfLogic.js      # Core valuation logic (DCF, WACC, PEG, etc.)
├── TickerTape.jsx   # Optional scrolling market bar
├── StockSearch.jsx  # Optional standalone search widget
├── assets/          # Static assets
└── index.css        # Global styling
```