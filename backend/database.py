import psycopg2
from psycopg2.extras import RealDictCursor
import os

def get_connection():
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    return psycopg2.connect(
        host="localhost",
        database="edgeforge",
        user="postgres",
        password="postgres",
        port=5432,
        cursor_factory=RealDictCursor
    )

def init_db():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            machine_id VARCHAR(50),
            vibration_x FLOAT,
            vibration_y FLOAT,
            vibration_z FLOAT,
            temperature FLOAT,
            rms FLOAT,
            status VARCHAR(20),
            confidence FLOAT
        );
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            machine_id VARCHAR(50),
            status VARCHAR(20),
            confidence FLOAT,
            message TEXT
        );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("Database initialized!")