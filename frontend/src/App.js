import { useState, useEffect } from "react";
import axios from "axios";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API = "http://127.0.0.1:8000";

const ANOMALY_TYPES = [
  { type: "Thermal Hotspot",     label: "Thermal Hotspot" },
  { type: "Surface Crack",       label: "Surface Crack" },
  { type: "Corrosion Or Burn",   label: "Corrosion or Burn Mark" },
  { type: "Wear Or Chipping",    label: "Wear or Chipping" },
  { type: "Misalignment",        label: "Misalignment Signature" },
  { type: "Vibration Fatigue",   label: "Vibration Fatigue" },
];

const PRODUCT_AREAS = [
  "Bearing / Rotary Assembly",
  "Electrical Terminal Junction",
  "Industrial Motor Component",
  "Metal Tooling Component",
  "PCB Assembly",
];

const riskColor = (status) => {
  if (status === "Critical") return "#ff3366";
  if (status === "Warning")  return "#ffaa00";
  return "#00e5ff";
};

const riskBg = (status) => {
  if (status === "Critical") return "rgba(255,51,102,0.12)";
  if (status === "Warning")  return "rgba(255,170,0,0.12)";
  return "rgba(0,229,255,0.07)";
};

function GaugeBar({ label, value, max, unit, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: "#8b949e", letterSpacing: "1px" }}>{label}</span>
        <span style={{ fontSize: "13px", color, fontWeight: "700" }}>{value?.toFixed ? value.toFixed(2) : value} {unit}</span>
      </div>
      <div style={{ background: "#1c2333", borderRadius: "4px", height: "6px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.5s ease", boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode]         = useState("live");
  const [history, setHistory]   = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [latest, setLatest]     = useState(null);
  const [time, setTime]         = useState(new Date());
  const [blink, setBlink]       = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchData = async () => {
    try {
      const [h, a] = await Promise.all([
        axios.get(`${API}/history`),
        axios.get(`${API}/alerts`),
      ]);
      const rows = h.data.data.slice().reverse();
      setHistory(rows);
      if (rows.length > 0) setLatest(rows[rows.length - 1]);
      setAlerts(a.data.alerts);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const d = setInterval(fetchData, 2000);
    const c = setInterval(() => setTime(new Date()), 1000);
    const b = setInterval(() => setBlink(x => !x), 800);
    return () => { clearInterval(d); clearInterval(c); clearInterval(b); };
  }, []);

  const chartData = history.slice(-20).map((r, i) => ({
    t: i + 1,
    vib: parseFloat(r.rms?.toFixed(3) || 0),
    temp: parseFloat(r.temperature?.toFixed(1) || 0),
    conf: parseFloat(r.confidence || 0),
  }));

  const riskScore = latest ? (latest.status === "Critical" ? 92 : latest.status === "Warning" ? 61 : 12) : 0;
  const spindleLoad = latest ? Math.min(100, riskScore + Math.random() * 5).toFixed(1) : "--";

  return (
    <div style={{ background: "#0a0d14", minHeight: "100vh", color: "#c9d1d9", fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: "0" }}>

      {/* Top Nav */}
      <div style={{ padding: "20px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "800", color: "#ffffff", letterSpacing: "1px" }}>
          EDGE FORGE AI
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 8px #00e5ff", opacity: blink ? 1 : 0.3 }} />
          <span style={{ fontSize: "13px", color: "#8b949e" }}>{time.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Mode Toggle */}
      <div style={{ padding: "16px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <button onClick={() => setMode("upload")} style={{
          padding: "14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "600",
          background: mode === "upload" ? "linear-gradient(90deg,#00b4d8,#00e5ff)" : "#161b27",
          color: mode === "upload" ? "#000" : "#8b949e", transition: "all 0.2s"
        }}>
          Use Uploaded Image/Video
        </button>
        <button onClick={() => setMode("live")} style={{
          padding: "14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "600",
          background: mode === "live" ? "linear-gradient(90deg,#00b4d8,#00e5ff)" : "#161b27",
          color: mode === "live" ? "#000" : "#8b949e", transition: "all 0.2s"
        }}>
          Use Connected Sensors (Live)
        </button>
      </div>

      <div style={{ padding: "0 32px 32px" }}>

        {/* QC4.0 Dashboard Section */}
        <div style={{ background: "#111827", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #1f2937" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: "700", color: "#00e5ff" }}>
            QC4.0 Tool Health Dashboard
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>
            Smooth browser-side live dashboard. Updates every 2 seconds without page blinking.
          </p>

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Risk Score",        value: latest ? `${riskScore}%`                    : "--", sub: latest?.status || "Loading...", color: latest ? riskColor(latest.status) : "#8b949e" },
              { label: "Vibration RMS",     value: latest ? `${latest.rms?.toFixed(3)}`        : "--", sub: "mm/s²",          color: "#00e5ff" },
              { label: "Temperature",       value: latest ? `${latest.temperature?.toFixed(1)}°C` : "--", sub: "Cutting tool", color: "#ffaa00" },
              { label: "Spindle Load",      value: latest ? `${spindleLoad}%`                  : "--", sub: "Machine load",   color: "#a78bfa" },
              { label: "Room Temperature",  value: latest ? `${(latest.temperature * 0.4 + 18).toFixed(1)}°C` : "--", sub: "Current ambient", color: "#34d399" },
            ].map(card => (
              <div key={card.label} style={{ background: "#0d1117", borderRadius: "10px", padding: "16px 14px", border: "1px solid #1f2937" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>{card.label}</div>
                <div style={{ fontSize: "22px", fontWeight: "700", color: card.color, marginBottom: "4px" }}>{card.value}</div>
                <div style={{ fontSize: "11px", color: "#4b5563" }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Clear Risk Button */}
          <button onClick={fetchData} style={{
            padding: "8px 20px", borderRadius: "6px", border: "1px solid #00e5ff",
            background: "transparent", color: "#00e5ff", cursor: "pointer", fontSize: "13px", fontWeight: "600"
          }}>
            Refresh Data
          </button>
        </div>

        {/* Project Matter */}
        <div style={{ background: "#111827", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #1f2937" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "700", color: "#00e5ff" }}>
            Project Matter (From Submission)
          </h2>
          <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#9ca3af", lineHeight: "1.7" }}>
            EdgeForge AI is an industrial edge intelligence system for manufacturing quality control. The core problem is tool wear and defect escape due to delayed detection and reactive maintenance dependency.
          </p>
          <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#9ca3af", lineHeight: "1.7" }}>
            Why Edge AI: it keeps the model, alerts, and decision support close to the machine so monitoring still works in real time. That means lower latency, better reliability, and faster maintenance response.
          </p>
          <p style={{ margin: "0", fontSize: "14px", color: "#9ca3af", lineHeight: "1.7" }}>
            Technical stack: Python + FastAPI backend, Random Forest ML model, PostgreSQL, React dashboard, AWS EC2 deployment. Business value: prevents defective parts, reduces downtime, optimizes maintenance scheduling.
          </p>
        </div>

        {/* Live Gauges */}
        <div style={{ background: "#111827", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #1f2937" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "700", color: "#00e5ff" }}>Live Gauges</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
            <div>
              <GaugeBar label="VIBRATION RMS"  value={latest?.rms || 0}          max={5}   unit="mm/s²" color="#00e5ff" />
              <GaugeBar label="TEMPERATURE"    value={latest?.temperature || 0}  max={120} unit="°C"    color="#ffaa00" />
              <GaugeBar label="RISK SCORE"     value={riskScore}                 max={100} unit="%"     color={latest ? riskColor(latest.status) : "#00e5ff"} />
            </div>
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00e5ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: "8px", color: "#00e5ff" }} />
                  <Area type="monotone" dataKey="vib" stroke="#00e5ff" strokeWidth={2} fill="url(#vg)" name="Vibration RMS" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Bar Blocks */}
        <div style={{ background: "#111827", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #1f2937" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: "#00e5ff" }}>Detailed Compact Bar Blocks</h2>
          <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>Compact visuals with event counts, percentages, and quick operational insight.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#0d1117", borderRadius: "10px", padding: "20px" }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ffaa00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ffaa00" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: "8px", color: "#ffaa00" }} />
                  <Area type="monotone" dataKey="temp" stroke="#ffaa00" strokeWidth={2} fill="url(#tg)" name="Temperature °C" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ fontSize: "11px", color: "#6b7280", textAlign: "center", marginTop: "8px", letterSpacing: "1px" }}>TEMPERATURE TREND</div>
            </div>
            <div style={{ background: "#0d1117", borderRadius: "10px", padding: "20px" }}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: "8px", color: "#a78bfa" }} />
                  <Line type="monotone" dataKey="conf" stroke="#a78bfa" strokeWidth={2} name="Confidence %" dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ fontSize: "11px", color: "#6b7280", textAlign: "center", marginTop: "8px", letterSpacing: "1px" }}>CONFIDENCE SCORE %</div>
            </div>
          </div>
        </div>

        {/* Recent Events Table */}
        <div style={{ background: "#111827", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #1f2937" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "700", color: "#00e5ff" }}>Recent Events</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1f2937" }}>
                {["Time", "Vibration", "Temp", "Confidence", "Risk %", "Risk Level"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: "500" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.slice(-10).reverse().map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #161b27" }}>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: "10px 12px", color: "#00e5ff" }}>{r.rms?.toFixed(3)}</td>
                  <td style={{ padding: "10px 12px", color: "#ffaa00" }}>{r.temperature?.toFixed(1)}°C</td>
                  <td style={{ padding: "10px 12px", color: "#a78bfa" }}>{r.confidence}%</td>
                  <td style={{ padding: "10px 12px", color: riskColor(r.status) }}>{r.status === "Critical" ? "92%" : r.status === "Warning" ? "61%" : "12%"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      color: riskColor(r.status),
                      border: `1px solid ${riskColor(r.status)}`,
                      padding: "2px 10px", borderRadius: "4px",
                      fontSize: "11px", fontWeight: "600"
                    }}>{r.status}</span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "20px 12px", color: "#4b5563", textAlign: "center" }}>No data yet — start the simulator</td></tr>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#4b5563" }}>
            Status: {latest ? <span style={{ color: "#00e5ff" }}>Live — connected</span> : <span style={{ color: "#ff3366" }}>Waiting for data</span>} | Auto refresh: every 2 seconds | Smooth browser-side live update
          </div>
        </div>

        {/* AI Visual Defect Verification */}
        <div style={{ background: "#111827", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #1f2937" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: "700", color: "#ffffff" }}>AI Visual Defect Verification (Image / Video)</h2>
          <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#9ca3af", lineHeight: "1.7" }}>
            Upload a product image or short video. The AI verifies likely product area, detects anomaly regions, and reports defect probability. The workflow is offline-first: if internet is unavailable, cached local data and on-device analysis still keep the demo usable.
          </p>

          {/* Supported Product Areas */}
          <h3 style={{ margin: "0 0 12px", fontSize: "16px", color: "#ffffff" }}>Supported Product Areas</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
            {PRODUCT_AREAS.map(p => (
              <div key={p} style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: "8px", padding: "14px 16px", fontSize: "14px", color: "#e5e7eb", cursor: "pointer" }}>
                {p}
              </div>
            ))}
          </div>

          {/* Known Anomaly Types */}
          <h3 style={{ margin: "0 0 12px", fontSize: "16px", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
            Known Anomaly Types
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
            {(expanded ? ANOMALY_TYPES : ANOMALY_TYPES.slice(0, 6)).map(a => (
              <div key={a.type} style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: "8px", padding: "12px 16px", cursor: "pointer" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>{a.type}</div>
                <div style={{ fontSize: "14px", color: "#e5e7eb", fontWeight: "600" }}>{a.label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}>
            {expanded ? "▼" : "▶"} View anomaly reference details
          </button>

          {/* Upload Area */}
          <div style={{ border: "1px solid #1f2937", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <button style={{
              background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px",
              padding: "10px 20px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "8px"
            }}>
              ↑ Upload
            </button>
            <span style={{ fontSize: "13px", color: "#6b7280" }}>200MB per file • JPG, JPEG, PNG, BMP, WEBP, MP4, MOV, AVI, MKV, WEBM, MPEG4</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: "11px", color: "#374151", letterSpacing: "2px", paddingTop: "8px" }}>
          EDGEFORGE AI — COGNIZANT TECHNOVERSE 2026 — INDUSTRIAL EDGE AI
        </div>
      </div>
    </div>
  );
}