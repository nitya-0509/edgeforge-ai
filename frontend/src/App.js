import { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

const API = "http://127.0.0.1:8000";

const statusColor = {
  Normal: "#16a34a",
  Warning: "#d97706",
  Critical: "#dc2626",
};

const statusBg = {
  Normal: "#dcfce7",
  Warning: "#fef3c7",
  Critical: "#fee2e2",
};

export default function App() {
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [latest, setLatest] = useState(null);

  const fetchData = async () => {
    try {
      const [histRes, alertRes] = await Promise.all([
        axios.get(`${API}/history`),
        axios.get(`${API}/alerts`),
      ]);
      const rows = histRes.data.data.slice().reverse();
      setHistory(rows);
      if (rows.length > 0) setLatest(rows[rows.length - 1]);
      setAlerts(alertRes.data.alerts);
    } catch (err) {
      console.error("API error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const chartData = history.slice(-20).map((r, i) => ({
    name: i + 1,
    vibration: parseFloat(r.rms?.toFixed(3) || 0),
    temperature: parseFloat(r.temperature?.toFixed(1) || 0),
  }));

  return (
    <div style={{ fontFamily: "sans-serif", padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>
          EdgeForge AI
        </h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
          Predictive Maintenance Dashboard — MACHINE-01
        </p>
      </div>

      {/* Status Card */}
      {latest && (
        <div style={{
          background: statusBg[latest.status] || "#f1f5f9",
          border: `2px solid ${statusColor[latest.status] || "#94a3b8"}`,
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{
            width: "16px", height: "16px", borderRadius: "50%",
            background: statusColor[latest.status] || "#94a3b8"
          }} />
          <div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: statusColor[latest.status] }}>
              {latest.status}
            </div>
            <div style={{ fontSize: "13px", color: "#475569" }}>
              Confidence: {latest.confidence}% &nbsp;|&nbsp; RMS Vibration: {latest.rms?.toFixed(3)} &nbsp;|&nbsp; Temp: {latest.temperature?.toFixed(1)}°C
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#fff", borderRadius: "10px", padding: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Total readings</div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a" }}>{history.length}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "10px", padding: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Total alerts</div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#dc2626" }}>{alerts.length}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "10px", padding: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Current temp</div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#d97706" }}>
            {latest ? `${latest.temperature?.toFixed(1)}°C` : "—"}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>
          Vibration RMS — last 20 readings
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="vibration" stroke="#6366f1" strokeWidth={2} dot={false} name="RMS Vibration" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>
          Temperature — last 20 readings
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} dot={false} name="Temperature °C" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts Table */}
      <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", border: "1px solid #e2e8f0" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>
          Recent alerts
        </h2>
        {alerts.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>No alerts yet — machine is healthy</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "8px", color: "#64748b", fontWeight: "500" }}>Time</th>
                <th style={{ textAlign: "left", padding: "8px", color: "#64748b", fontWeight: "500" }}>Status</th>
                <th style={{ textAlign: "left", padding: "8px", color: "#64748b", fontWeight: "500" }}>Confidence</th>
                <th style={{ textAlign: "left", padding: "8px", color: "#64748b", fontWeight: "500" }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px", color: "#475569" }}>
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={{
                      background: statusBg[a.status],
                      color: statusColor[a.status],
                      padding: "2px 8px",
                      borderRadius: "20px",
                      fontWeight: "600",
                      fontSize: "12px"
                    }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px", color: "#475569" }}>{a.confidence}%</td>
                  <td style={{ padding: "8px", color: "#475569" }}>{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
