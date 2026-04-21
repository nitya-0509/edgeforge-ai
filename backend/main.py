from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
import os
import pandas as pd
import threading
import time
from database import get_connection, init_db
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "model.pkl")

def train_and_save():
    from sklearn.ensemble import RandomForestClassifier
    print("No model found — training on server...")
    np.random.seed(42)
    data = []
    for i in range(5000):
        w = i / 5000
        if w < 0.6:
            vx = np.random.normal(0.5, 0.1)
            vy = np.random.normal(0.5, 0.1)
            vz = np.random.normal(0.5, 0.1)
            temp = np.random.normal(45, 2)
            label = 0
        elif w < 0.85:
            vx = np.random.normal(1.5, 0.3)
            vy = np.random.normal(1.5, 0.3)
            vz = np.random.normal(1.5, 0.3)
            temp = np.random.normal(65, 4)
            label = 1
        else:
            vx = np.random.normal(3.0, 0.5)
            vy = np.random.normal(3.0, 0.5)
            vz = np.random.normal(3.0, 0.5)
            temp = np.random.normal(85, 6)
            label = 2
        rms = float(np.sqrt((vx**2 + vy**2 + vz**2) / 3))
        data.append([float(vx), float(vy), float(vz), float(temp), rms, label])

    df = pd.DataFrame(data, columns=["vx", "vy", "vz", "temp", "rms", "label"])
    X = df[["vx", "vy", "vz", "temp", "rms"]]
    y = df["label"]

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(clf, f)
    print("Model trained and saved successfully!")
    return clf


if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    print("Model loaded from file!")
else:
    model = train_and_save()

STATUS_MAP = {0: "Normal", 1: "Warning", 2: "Critical"}


def run_auto_simulator():
    print("Auto-simulator started on server...")
    step = 0
    while True:
        try:
            wear = (step % 200) / 200

            if wear < 0.6:
                vx   = float(np.random.normal(0.5, 0.1))
                vy   = float(np.random.normal(0.5, 0.1))
                vz   = float(np.random.normal(0.5, 0.1))
                temp = float(np.random.normal(45, 2))
            elif wear < 0.85:
                vx   = float(np.random.normal(1.5, 0.3))
                vy   = float(np.random.normal(1.5, 0.3))
                vz   = float(np.random.normal(1.5, 0.3))
                temp = float(np.random.normal(65, 4))
            else:
                vx   = float(np.random.normal(3.0, 0.5))
                vy   = float(np.random.normal(3.0, 0.5))
                vz   = float(np.random.normal(3.0, 0.5))
                temp = float(np.random.normal(85, 6))

            rms        = float(np.sqrt((vx**2 + vy**2 + vz**2) / 3))
            features   = [[vx, vy, vz, temp, rms]]
            prediction = int(model.predict(features)[0])
            confidence = round(float(max(model.predict_proba(features)[0])) * 100, 2)
            status     = STATUS_MAP[prediction]

            conn = get_connection()
            cur  = conn.cursor()
            cur.execute("""
                INSERT INTO sensor_readings
                (machine_id, vibration_x, vibration_y, vibration_z, temperature, rms, status, confidence)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, ("MACHINE-01", vx, vy, vz, temp, rms, status, confidence))

            if prediction != 0:
                message = f"Tool wear detected — {status} state at {confidence}% confidence"
                cur.execute("""
                    INSERT INTO alerts (machine_id, status, confidence, message)
                    VALUES (%s, %s, %s, %s)
                """, ("MACHINE-01", status, confidence, message))

            conn.commit()
            cur.close()
            conn.close()
            step += 1

        except Exception as e:
            print(f"Simulator error: {e}")

        time.sleep(3)


class SensorInput(BaseModel):
    machine_id: str
    vibration_x: float
    vibration_y: float
    vibration_z: float
    temperature: float


@app.on_event("startup")
def startup():
    init_db()
    t = threading.Thread(target=run_auto_simulator, daemon=True)
    t.start()
    print("Auto-simulator thread started!")


@app.get("/")
def root():
    return {"message": "EdgeForge AI backend is running"}


@app.post("/predict")
def predict(data: SensorInput):
    rms = float(np.sqrt((data.vibration_x**2 + data.vibration_y**2 + data.vibration_z**2) / 3))
    features = [[
        float(data.vibration_x),
        float(data.vibration_y),
        float(data.vibration_z),
        float(data.temperature),
        rms
    ]]

    prediction = int(model.predict(features)[0])
    confidence = round(float(max(model.predict_proba(features)[0])) * 100, 2)
    status     = STATUS_MAP[prediction]

    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("""
        INSERT INTO sensor_readings
        (machine_id, vibration_x, vibration_y, vibration_z, temperature, rms, status, confidence)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data.machine_id,
        float(data.vibration_x),
        float(data.vibration_y),
        float(data.vibration_z),
        float(data.temperature),
        rms,
        status,
        confidence
    ))

    if prediction != 0:
        message = f"Tool wear detected — {status} state at {confidence}% confidence"
        cur.execute("""
            INSERT INTO alerts (machine_id, status, confidence, message)
            VALUES (%s, %s, %s, %s)
        """, (data.machine_id, status, confidence, message))

    conn.commit()
    cur.close()
    conn.close()

    return {
        "machine_id": data.machine_id,
        "status":     status,
        "confidence": confidence,
        "rms":        round(rms, 4),
        "timestamp":  datetime.now().isoformat()
    }


@app.get("/history")
def get_history():
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("""
        SELECT * FROM sensor_readings
        ORDER BY timestamp DESC LIMIT 50
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"data": list(rows)}


@app.get("/alerts")
def get_alerts():
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("""
        SELECT * FROM alerts
        ORDER BY timestamp DESC LIMIT 20
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"alerts": list(rows)}


@app.get("/recommendation")
def get_recommendation():
    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute("""
            SELECT * FROM sensor_readings
            ORDER BY timestamp DESC LIMIT 10
        """)
        recent = cur.fetchall()
        cur.execute("""
            SELECT COUNT(*) as cnt FROM alerts
            WHERE timestamp > NOW() - INTERVAL '10 minutes'
        """)
        alert_count = cur.fetchone()["cnt"]
        cur.close()
        conn.close()

        if not recent:
            return {"recommendation": {
                "urgency":                     "Scheduled",
                "action":                      "No sensor data yet. Start the simulator to begin monitoring.",
                "reason":                      "System is online and waiting for first reading.",
                "estimated_defects_prevented": 0,
                "downtime_saved_minutes":      0,
                "next_check_in":               "5 minutes",
                "health_score":                100,
                "status":                      "Normal",
                "timestamp":                   datetime.now().isoformat()
            }}

        latest   = recent[0]
        avg_rms  = sum(r["rms"] for r in recent) / len(recent)
        avg_temp = sum(r["temperature"] for r in recent) / len(recent)
        status   = latest["status"]
        rms      = latest["rms"]
        temp     = latest["temperature"]
        conf     = latest["confidence"]
        trend    = "rising" if recent[0]["rms"] > recent[-1]["rms"] else "stable"

        if status == "Critical":
            health_score = max(5,  int(100 - (rms / 5.0) * 100))
            urgency      = "Immediate"
            action       = f"Stop MACHINE-01 immediately and replace the cutting tool. RMS vibration at {rms:.3f} mm/s² and temperature at {temp:.1f}°C indicate imminent tool failure."
            reason       = f"Vibration has exceeded critical threshold of 2.5 mm/s² with {alert_count} alerts in the last 10 minutes. Continuing operation risks producing defective parts and permanent spindle damage."
            defects      = min(200, int(alert_count * 12 + rms * 30))
            downtime     = min(120, int(alert_count * 8  + 20))
            next_check   = "Immediately after tool replacement"

        elif status == "Warning":
            health_score = max(25, int(100 - (rms / 5.0) * 80))
            urgency      = "Within 2 hours"
            action       = f"Schedule tool inspection for MACHINE-01 within the next 2 hours. Vibration trend is {trend} at {rms:.3f} mm/s² — plan replacement during next shift break."
            reason       = f"Temperature averaging {avg_temp:.1f}°C with vibration RMS of {avg_rms:.3f} mm/s² suggests accelerated tool wear. Early intervention prevents unplanned downtime."
            defects      = min(120, int(alert_count * 6  + rms * 15))
            downtime     = min(90,  int(alert_count * 5  + 10))
            next_check   = "30 minutes"

        else:
            health_score = min(100, max(70, int(100 - (rms / 5.0) * 40)))
            urgency      = "Scheduled"
            action       = f"MACHINE-01 operating normally. Continue monitoring. Schedule next preventive maintenance in 48 hours as per standard protocol."
            reason       = f"Vibration RMS stable at {rms:.3f} mm/s² and temperature at {temp:.1f}°C — both within safe operating thresholds. No anomalies detected."
            defects      = 0
            downtime     = 0
            next_check   = "4 hours"

        return {"recommendation": {
            "urgency":                     urgency,
            "action":                      action,
            "reason":                      reason,
            "estimated_defects_prevented": defects,
            "downtime_saved_minutes":      downtime,
            "next_check_in":               next_check,
            "health_score":                health_score,
            "status":                      status,
            "confidence":                  conf,
            "avg_rms":                     round(avg_rms, 3),
            "avg_temp":                    round(avg_temp, 1),
            "alert_count":                 alert_count,
            "timestamp":                   datetime.now().isoformat()
        }}

    except Exception as e:
        print(f"Recommendation error: {e}")
        return {"recommendation": {
            "urgency":                     "Unknown",
            "action":                      "System error — please refresh",
            "reason":                      str(e),
            "estimated_defects_prevented": 0,
            "downtime_saved_minutes":      0,
            "next_check_in":               "5 minutes",
            "health_score":                50,
            "status":                      "Unknown",
            "timestamp":                   datetime.now().isoformat()
        }}