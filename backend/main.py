from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
import os
import pandas as pd
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


class SensorInput(BaseModel):
    machine_id: str
    vibration_x: float
    vibration_y: float
    vibration_z: float
    temperature: float


@app.on_event("startup")
def startup():
    init_db()


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
    status = STATUS_MAP[prediction]

    conn = get_connection()
    cur = conn.cursor()
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
        "status": status,
        "confidence": confidence,
        "rms": round(rms, 4),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/history")
def get_history():
    conn = get_connection()
    cur = conn.cursor()
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
    cur = conn.cursor()
    cur.execute("""
        SELECT * FROM alerts 
        ORDER BY timestamp DESC LIMIT 20
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"alerts": list(rows)}