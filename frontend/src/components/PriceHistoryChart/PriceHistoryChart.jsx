import React, { useState, useMemo } from "react";
import { FiTrendingDown, FiTrendingUp, FiMinus, FiCalendar, FiTag } from "react-icons/fi";
import "./PriceHistoryChart.css";

const PriceHistoryChart = ({ history = [], originalPrice = 0, currentPrice = 0 }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Normalize and sort history points chronologically
  const chartPoints = useMemo(() => {
    let raw = Array.isArray(history) && history.length > 0 ? [...history] : [];

    // Fallback if no history exists
    if (raw.length === 0) {
      const now = Date.now();
      raw = [
        {
          effectivePrice: originalPrice || currentPrice,
          effectiveDate: new Date(now - 30 * 86400000),
          reason: "Original launch price",
        },
        {
          effectivePrice: currentPrice,
          effectiveDate: new Date(now),
          reason: "Current selling price",
        },
      ];
    }

    const sorted = raw
      .map((item, idx) => ({
        id: idx,
        price: Number(item.effectivePrice || item.price || 0),
        date: new Date(item.effectiveDate || Date.now()),
        reason: item.reason || (idx === raw.length - 1 ? "Current selling price" : "Price update"),
      }))
      .filter((p) => p.price > 0 && !isNaN(p.date.getTime()))
      .sort((a, b) => a.date - b.date);

    // Ensure the current active selling price is the latest data point
    if (currentPrice > 0) {
      const lastPoint = sorted[sorted.length - 1];
      if (!lastPoint || lastPoint.price !== currentPrice) {
        sorted.push({
          id: sorted.length,
          price: Number(currentPrice),
          date: new Date(),
          reason: "Current selling price",
        });
      }
    }

    // If only 1 point, duplicate with prior date for drawing a baseline
    if (sorted.length === 1) {
      const single = sorted[0];
      return [
        {
          id: -1,
          price: originalPrice > 0 ? originalPrice : single.price,
          date: new Date(single.date.getTime() - 15 * 86400000),
          reason: "Launch price",
        },
        single,
      ];
    }

    return sorted;
  }, [history, originalPrice, currentPrice]);

  const { minPrice, maxPrice, lowestPoint, highestPoint, priceTrendPercent } = useMemo(() => {
    if (chartPoints.length === 0) {
      return { minPrice: 0, maxPrice: 100, lowestPoint: null, highestPoint: null, priceTrendPercent: 0 };
    }

    let min = Infinity;
    let max = -Infinity;
    let lowest = chartPoints[0];
    let highest = chartPoints[0];

    chartPoints.forEach((p) => {
      if (p.price < min) {
        min = p.price;
        lowest = p;
      }
      if (p.price > max) {
        max = p.price;
        highest = p;
      }
    });

    const firstPrice = chartPoints[0].price;
    const lastPrice = chartPoints[chartPoints.length - 1].price;
    const trend = firstPrice > 0 ? Math.round(((lastPrice - firstPrice) / firstPrice) * 100) : 0;

    // Pad top and bottom slightly for aesthetics
    const pad = Math.max(20, (max - min) * 0.18);
    return {
      minPrice: Math.max(0, Math.floor((min - pad) / 10) * 10),
      maxPrice: Math.ceil((max + pad) / 10) * 10,
      lowestPoint: lowest,
      highestPoint: highest,
      priceTrendPercent: trend,
    };
  }, [chartPoints]);

  // Chart dimensions
  const svgWidth = 560;
  const svgHeight = 220;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 35;

  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const coords = useMemo(() => {
    const range = maxPrice - minPrice || 1;
    const len = chartPoints.length > 1 ? chartPoints.length - 1 : 1;

    return chartPoints.map((p, idx) => {
      const x = padLeft + (idx / len) * plotW;
      const y = padTop + plotH - ((p.price - minPrice) / range) * plotH;

      return {
        ...p,
        x,
        y,
        isLowest: lowestPoint && p.price === lowestPoint.price,
        isHighest: highestPoint && p.price === highestPoint.price,
        isCurrent: idx === chartPoints.length - 1,
      };
    });
  }, [chartPoints, minPrice, maxPrice, lowestPoint, highestPoint, padLeft, plotW, padTop, plotH]);

  // SVG Line & Area Path strings
  const { linePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: "", areaPath: "" };

    // Create smooth curved path using Catmull-Rom or cubic Bezier
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = padTop + plotH;
    const area = `${path} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

    return { linePath: path, areaPath: area };
  }, [coords, padTop, plotH]);

  // Generate 4 Y-Axis grid steps
  const yTicks = useMemo(() => {
    const count = 4;
    const ticks = [];
    const step = (maxPrice - minPrice) / (count - 1);
    for (let i = 0; i < count; i++) {
      const val = Math.round(minPrice + i * step);
      const y = padTop + plotH - ((val - minPrice) / (maxPrice - minPrice || 1)) * plotH;
      ticks.push({ val, y });
    }
    return ticks;
  }, [minPrice, maxPrice, padTop, plotH]);

  const formatPrice = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

  return (
    <div className="price-history-chart-wrapper">
      {/* Header Metric Badges */}
      <div className="chart-quick-metrics">
        <div className="metric-badge lowest">
          <span className="dot" />
          <span>Lowest: <strong>{formatPrice(lowestPoint?.price)}</strong></span>
        </div>
        <div className="metric-badge current">
          <span className="dot" />
          <span>Current: <strong>{formatPrice(currentPrice || chartPoints[chartPoints.length - 1]?.price)}</strong></span>
        </div>
        <div className={`metric-badge trend ${priceTrendPercent < 0 ? "drop" : priceTrendPercent > 0 ? "up" : "flat"}`}>
          {priceTrendPercent < 0 ? (
            <>
              <FiTrendingDown />
              <span>{Math.abs(priceTrendPercent)}% lower than launch</span>
            </>
          ) : priceTrendPercent > 0 ? (
            <>
              <FiTrendingUp />
              <span>+{priceTrendPercent}% vs launch</span>
            </>
          ) : (
            <>
              <FiMinus />
              <span>Price stable</span>
            </>
          )}
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="svg-container">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="price-trend-svg"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="priceAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3548c4" stopOpacity="0.28" />
              <stop offset="70%" stopColor="#3548c4" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#3548c4" stopOpacity="0" />
            </linearGradient>

            <filter id="pointShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Horizontal Gridlines & Y-labels */}
          {yTicks.map((tick, i) => (
            <g key={i} className="y-grid-line-group">
              <line
                x1={padLeft}
                y1={tick.y}
                x2={svgWidth - padRight}
                y2={tick.y}
                className="grid-line"
              />
              <text x={padLeft - 8} y={tick.y + 4} className="axis-label y-axis-label">
                ₹{tick.val}
              </text>
            </g>
          ))}

          {/* Area under curve */}
          <path d={areaPath} fill="url(#priceAreaGradient)" className="chart-area" />

          {/* Main trend curve line */}
          <path d={linePath} fill="none" className="chart-line" />

          {/* Vertical Guide Line on Hover */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={padTop}
              x2={hoveredPoint.x}
              y2={padTop + plotH}
              className="hover-guide-line"
            />
          )}

          {/* Data Points */}
          {coords.map((pt, i) => {
            const isHovered = hoveredPoint?.id === pt.id;

            return (
              <g
                key={i}
                className="data-point-group"
                onMouseEnter={() => setHoveredPoint(pt)}
                onClick={() => setHoveredPoint(pt)}
              >
                {/* Outer halo for Current / Lowest */}
                {pt.isCurrent && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="9"
                    className="current-point-halo"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6.5 : pt.isCurrent ? 5.5 : 4.5}
                  className={`data-point-circle ${pt.isCurrent ? "current" : ""} ${
                    pt.isLowest ? "lowest" : ""
                  }`}
                  filter="url(#pointShadow)"
                />

                {/* Hit area for easy hovering */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="18"
                  className="point-hit-target"
                />

                {/* X-axis date labels */}
                <text
                  x={pt.x}
                  y={padTop + plotH + 20}
                  className="axis-label x-axis-label"
                  textAnchor="middle"
                >
                  {pt.date.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {hoveredPoint && (
          <div
            className="chart-floating-tooltip"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
            }}
          >
            <div className="tooltip-header">
              <FiCalendar size={11} />
              <span>
                {hoveredPoint.date.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="tooltip-price-row">
              <strong className="tooltip-price">{formatPrice(hoveredPoint.price)}</strong>
              {originalPrice > hoveredPoint.price && (
                <span className="tooltip-savings">
                  Save ₹{originalPrice - hoveredPoint.price}
                </span>
              )}
            </div>
            <div className="tooltip-reason">
              <FiTag size={10} />
              <span>{hoveredPoint.reason}</span>
            </div>
          </div>
        )}
      </div>

      <div className="chart-footer-note">
        <span>💡 Hover or tap points to inspect historical price drops and timing</span>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
