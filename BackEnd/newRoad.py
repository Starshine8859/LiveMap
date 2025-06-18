from pymongo import MongoClient
import pandas as pd
import numpy as np
import webbrowser
import folium
from datetime import datetime

# ----------------------------------------
# 1. Load GPS trajectory data from MongoDB
# ----------------------------------------

def fetch_user_gps_data(user_id):
    client = MongoClient("mongodb://localhost:27017/")
    db = client["locationdb"]
    collection = db["locationdatas"]

    cursor = collection.find({"userid": user_id})
    data = list(cursor)

    if not data:
        print(f"\u26a0\ufe0f No data found for user: {user_id}")
        return None

    df = pd.DataFrame(data)
    df["latitude"] = df["latitude"].astype(float)
    df["longitude"] = df["longitude"].astype(float)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df.sort_values("timestamp", inplace=True)
    return df

# ----------------------------------------
# 2. Compute trajectory features
# ----------------------------------------

def compute_features(df):
    df["lat_shift"] = df["latitude"].shift(-1)
    df["lon_shift"] = df["longitude"].shift(-1)
    df["time_shift"] = df["timestamp"].shift(-1)

    df["delta_t"] = (df["time_shift"] - df["timestamp"]).dt.total_seconds()
    df["distance"] = np.sqrt((df["latitude"] - df["lat_shift"])**2 + (df["longitude"] - df["lon_shift"])**2)
    df["velocity"] = df["distance"] / df["delta_t"]

    return df

# ----------------------------------------
# 3. Anomaly detection based on velocity
# ----------------------------------------

def detect_anomalies(df, velocity_threshold=0.001):
    df["anomaly"] = df["velocity"] > velocity_threshold
    return df

# ----------------------------------------
# 4. Plot user trajectory using Google Map (Folium)
# ----------------------------------------

def show_on_map(df, user_id):
    start_lat = df.iloc[0]["latitude"]
    start_lon = df.iloc[0]["longitude"]
    fmap = folium.Map(location=[start_lat, start_lon], zoom_start=15)

    # Draw path
    coords = df[["latitude", "longitude"]].values.tolist()
    folium.PolyLine(coords, color="blue", weight=2.5, opacity=1).add_to(fmap)

    # Add markers
    for i, row in df.iterrows():
        color = "red" if row["anomaly"] else "green"
        folium.CircleMarker(
            location=[row["latitude"], row["longitude"]],
            radius=4,
            color=color,
            fill=True,
            fill_opacity=0.7,
            popup=str(row["timestamp"])
        ).add_to(fmap)

    # Save and open in browser
    map_file = f"map_{user_id}.html"
    fmap.save(map_file)
    webbrowser.open(map_file)

# ----------------------------------------
# Main logic
# ----------------------------------------

if __name__ == "__main__":
    user_id = "hrhkzpz8AWgU"  # Replace with an actual userid
    df = fetch_user_gps_data(user_id)

    if df is not None:
        df = compute_features(df)
        df = detect_anomalies(df)
        print(df[["timestamp", "latitude", "longitude", "velocity", "anomaly"]].tail(10))
        show_on_map(df, user_id)
    else:
        print("No data loaded.")
