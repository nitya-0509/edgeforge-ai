import requests
import numpy as np
import time

API_URL = "http://127.0.0.1:8000/predict"
MACHINE_ID = "MACHINE-01"

def simulate():
    print("Simulator started — sending sensor data every 2 seconds...")
    print("Watch your dashboard at http://localhost:3000\n")
    
    total_steps = 200
    
    for step in range(total_steps):
        wear = step / total_steps

        if wear < 0.6:
            vx = np.random.normal(0.5, 0.1)
            vy = np.random.normal(0.5, 0.1)
            vz = np.random.normal(0.5, 0.1)
            temp = np.random.normal(45, 2)
        elif wear < 0.85:
            vx = np.random.normal(1.5, 0.3)
            vy = np.random.normal(1.5, 0.3)
            vz = np.random.normal(1.5, 0.3)
            temp = np.random.normal(65, 4)
        else:
            vx = np.random.normal(3.0, 0.5)
            vy = np.random.normal(3.0, 0.5)
            vz = np.random.normal(3.0, 0.5)
            temp = np.random.normal(85, 6)

        payload = {
            "machine_id": MACHINE_ID,
            "vibration_x": float(vx),
            "vibration_y": float(vy),
            "vibration_z": float(vz),
            "temperature": float(temp)
        }

        try:
            res = requests.post(API_URL, json=payload)
            data = res.json()
            print(f"Step {step+1:03d} | Wear: {wear:.0%} | Status: {data['status']:8s} | "
                  f"Confidence: {data['confidence']}% | Temp: {data['rms']:.3f} RMS")
        except Exception as e:
            print(f"Error: {e}")

        time.sleep(2)

    print("\nSimulation complete!")

if __name__ == "__main__":
    simulate()