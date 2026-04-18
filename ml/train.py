import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import pickle
import os

np.random.seed(42)

def generate_sensor_data(n_samples=5000):
    data = []
    
    for i in range(n_samples):
        wear_level = i / n_samples

        # Normal state (0-60% wear)
        if wear_level < 0.6:
            vibration_x = np.random.normal(0.5, 0.1)
            vibration_y = np.random.normal(0.5, 0.1)
            vibration_z = np.random.normal(0.5, 0.1)
            temperature  = np.random.normal(45, 2)
            label = 0  # normal

        # Warning state (60-85% wear)
        elif wear_level < 0.85:
            vibration_x = np.random.normal(1.5, 0.3)
            vibration_y = np.random.normal(1.5, 0.3)
            vibration_z = np.random.normal(1.5, 0.3)
            temperature  = np.random.normal(65, 4)
            label = 1  # warning

        # Critical/failure state (85-100% wear)
        else:
            vibration_x = np.random.normal(3.0, 0.5)
            vibration_y = np.random.normal(3.0, 0.5)
            vibration_z = np.random.normal(3.0, 0.5)
            temperature  = np.random.normal(85, 6)
            label = 2  # critical

        # RMS of vibration (key feature)
        rms = np.sqrt((vibration_x**2 + vibration_y**2 + vibration_z**2) / 3)

        data.append({
            "vibration_x": round(vibration_x, 4),
            "vibration_y": round(vibration_y, 4),
            "vibration_z": round(vibration_z, 4),
            "temperature":  round(temperature, 4),
            "rms":          round(rms, 4),
            "label":        label
        })

    return pd.DataFrame(data)


def train_model():
    print("Generating training data...")
    df = generate_sensor_data(5000)
    df.to_csv("ml/sensor_data.csv", index=False)
    print(f"Data saved — {len(df)} rows")

    X = df[["vibration_x", "vibration_y", "vibration_z", "temperature", "rms"]]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Training Random Forest...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    print("\n--- Model Performance ---")
    y_pred = model.predict(X_test)
    print(classification_report(
        y_test, y_pred,
        target_names=["Normal", "Warning", "Critical"]
    ))

    os.makedirs("ml", exist_ok=True)
    with open("ml/model.pkl", "wb") as f:
        pickle.dump(model, f)
    print("model.pkl saved!")


if __name__ == "__main__":
    train_model()