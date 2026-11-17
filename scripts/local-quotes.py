"""Optional local-only quote trials. Not part of public builds or CI dependencies."""
import argparse, json
from datetime import datetime, timezone
from pathlib import Path

p = argparse.ArgumentParser(description="行情本機研究；不匯出至公開網站")
p.add_argument("source", choices=["twstock", "yfinance"])
p.add_argument("symbol")
args = p.parse_args()
out = Path(".local"); out.mkdir(exist_ok=True)
if args.source == "twstock":
    import twstock  # optional: python3 -m pip install twstock
    stock = twstock.Stock(args.symbol)
    rows = [{"date": r.date.strftime("%Y-%m-%d"), "open": r.open, "high": r.high,
             "low": r.low, "close": r.close, "volume": r.capacity} for r in stock.data]
    basis = "twstock 本機原始輸出，未與公開資料混接"
else:
    import yfinance as yf  # optional: python3 -m pip install yfinance
    data = yf.Ticker(args.symbol).history(period="5y", auto_adjust=False, actions=True)
    rows = [{"date": d.strftime("%Y-%m-%d"), "open": float(r.Open), "high": float(r.High),
             "low": float(r.Low), "close": float(r.Close), "volume": int(r.Volume),
             "dividends": float(r.get("Dividends", 0)), "split": float(r.get("Stock Splits", 0))}
            for d, r in data.iterrows()]
    basis = "Yahoo 來源 Close 可能已按分割調整；auto_adjust=False 不代表實際未還原價格。尚未核實 EPS 股數基準。"
result = {"provider": args.source, "symbol": args.symbol, "localResearchOnly": True,
          "checkedAt": datetime.now(timezone.utc).isoformat(), "basis": basis,
          "license": {"publicDisplayAllowed": False}, "rows": rows}
target = out / (args.source + "-" + ''.join(c for c in args.symbol if c.isalnum() or c in '.-') + ".json")
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(f"Local-only snapshot: {target} ({len(rows)} rows)")
