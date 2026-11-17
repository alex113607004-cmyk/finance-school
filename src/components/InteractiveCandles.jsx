import React, { useEffect, useRef, useState } from 'react';
import { CandlestickSeries, createChart, HistogramSeries, LineSeries } from 'lightweight-charts';

const up = '#ff8c99';
const down = '#7ad7a6';

export default function InteractiveCandles({ rows, averages, colors, onPick }) {
  const host = useRef(null);
  const chartRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let chart;
    try {
      chart = createChart(host.current, {
        autoSize: true,
        height: 380,
        layout: { background: { color: '#141a28' }, textColor: '#cad2e4', attributionLogo: true },
        grid: { vertLines: { color: '#242c3e' }, horzLines: { color: '#242c3e' } },
        timeScale: { borderColor: '#414b60' },
      });
      const candles = chart.addSeries(CandlestickSeries, {
        upColor: up, wickUpColor: up, downColor: down, wickDownColor: down, borderVisible: false,
      });
      const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' } }, 1);
      const lines = Object.fromEntries(Object.entries(colors).map(([period, color]) => [
        period, chart.addSeries(LineSeries, { color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false }),
      ]));
      chart.panes()[1]?.setHeight(86);
      chart.subscribeCrosshairMove(({ time }) => {
        if (typeof time === 'string') onPick(time);
      });
      chartRef.current = { chart, candles, volume, lines };
    } catch {
      chart?.remove();
      setFailed(true);
    }
    return () => {
      chartRef.current?.chart.remove();
      chartRef.current = null;
    };
  }, [colors, onPick]);

  useEffect(() => {
    if (!chartRef.current) return;
    const { chart, candles, volume } = chartRef.current;
    candles.setData(rows.map(({ date, open, high, low, close }) => ({ time: date, open, high, low, close })));
    volume.setData(rows.map(row => ({
      time: row.date, value: row.volume,
      color: row.close >= row.open ? '#ff8c997f' : '#7ad7a67f',
    })));
    chart.timeScale().fitContent();
  }, [rows]);

  useEffect(() => {
    if (!chartRef.current) return;
    for (const [period, line] of Object.entries(chartRef.current.lines)) {
      const enabled = averages.includes(Number(period));
      line.applyOptions({ visible: enabled });
      line.setData(enabled ? rows.map(row => {
        const value = row['ma' + period];
        return Number.isFinite(value) ? { time: row.date, value } : { time: row.date };
      }) : []);
    }
  }, [rows, averages]);

  return failed
    ? <p role="status">此裝置無法開啟互動圖，請切回原始圖表或查看數字表。</p>
    : <div ref={host} style={{ minHeight: 380 }} aria-label="可縮放的個股價格與成交量圖" />;
}
