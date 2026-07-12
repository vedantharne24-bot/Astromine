import os
import sqlite3
import cv2
import numpy as np
import base64
import random
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from datetime import datetime
from ultralytics import YOLO
from pydantic import BaseModel
import google.generativeai as genai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AI COMMANDER SETUP ---
# Get a free API key from https://aistudio.google.com/
genai.configure(api_key="AIzaSyDvcgQTbKC1SxnB2waHxh3sxVbBqV0WllE")

class MissionTelemetry(BaseModel):
    distance_km: float
    hazards_count: int
    water_pct: float
    mineral_pct: float

# --- 1. PERSISTENT DATABASE STORAGE ---
DB_PATH = "missions.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mission_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            filename TEXT,
            craters_count INTEGER,
            mean_water_purity REAL,
            estimated_volume REAL,
            mean_iron_percentage REAL
        )
    """)
    conn.commit()
    conn.close()

init_db()

# --- 2. LOAD MACHINE LEARNING CORES ---
MODEL_PATH = os.path.join("models", "hazard_model.pt")
if os.path.exists(MODEL_PATH):
    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = YOLO(MODEL_PATH).to(device)
    print(f"🔥 YOLOv8 Core loaded on {device}.")
else:
    model = None
    print("⚠️ Hazard model missing. Falling back to feature extraction mode.")

# --- 3. COMPUTER VISION & GIS UTILITIES ---
def get_base64_jpeg(img_array):
    img_rgb = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
    _, buffer = cv2.imencode('.jpg', img_rgb, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

def get_base64_png(img_array):
    if len(img_array.shape) == 3 and img_array.shape[2] == 3:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
    _, buffer = cv2.imencode('.png', img_array)
    return f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"

# --- 4. ADVANCED GIS SPECTRAL ANALYSIS FUNCTIONS ---
def generate_water_heatmap(img_rgb):
    h, w, _ = img_rgb.shape
    normalized = img_rgb.astype(np.float32) / 255.0
    blue_bias = np.clip(normalized[:,:,2] - (normalized[:,:,0] + normalized[:,:,1]) / 2.0, 0, 1)
    threshold = 0.15
    mask = blue_bias > threshold
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[mask, 0] = 0    
    overlay[mask, 1] = 200  
    overlay[mask, 2] = 255  
    overlay[mask, 3] = (blue_bias[mask] * 255).astype(np.uint8) 
    return overlay

def generate_mineral_overlay(img_rgb):
    h, w, _ = img_rgb.shape
    normalized = img_rgb.astype(np.float32) / 255.0
    red_bias = np.clip(normalized[:,:,0] - (normalized[:,:,1] + normalized[:,:,2]) / 2.0, 0, 1)
    threshold = 0.1
    mask = red_bias > threshold
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[mask, 0] = 255  
    overlay[mask, 1] = 50   
    overlay[mask, 2] = 100  
    overlay[mask, 3] = (red_bias[mask] * 255).astype(np.uint8) 
    return overlay

# --- 5. COST-WEIGHTED PATHFINDING ---
class Node:
    def __init__(self, parent=None, position=None):
        self.parent = parent
        self.position = position
        self.g = self.h = self.f = 0
    def __eq__(self, other): return self.position == other.position

def generate_cost_grid(stitched_img, detections):
    sh, sw, _ = stitched_img.shape
    cost_mask = np.full((sh, sw), 10.0, dtype=np.float32)
    
    normalized = stitched_img.astype(np.float32) / 255.0
    blue_bias = np.clip(normalized[:,:,2] - (normalized[:,:,0] + normalized[:,:,1]) / 2.0, 0, 1)
    red_bias = np.clip(normalized[:,:,0] - (normalized[:,:,1] + normalized[:,:,2]) / 2.0, 0, 1)
    
    reward_mask = (blue_bias * 9.0) + (red_bias * 9.0)
    cost_mask -= reward_mask
    cost_mask = np.clip(cost_mask, 1.0, 10.0) 
    
    total_hazards = 0
    for file_detections in detections:
        h_ratio = sh / file_detections["src_h"]
        w_ratio = sw / file_detections["src_w"]
        for box in file_detections["boxes"]:
            total_hazards += 1
            x1, y1 = int(box["x1"] * w_ratio), int(box["y1"] * h_ratio)
            x2, y2 = int(box["x2"] * w_ratio), int(box["y2"] * h_ratio)
            cv2.rectangle(cost_mask, (x1, y1), (x2, y2), 9999.0, -1) 
            cv2.rectangle(cost_mask, (max(0, x1-10), max(0, y1-10)), (min(sw, x2+10), min(sh, y2+10)), 50.0, -1)

    path_grid_scale = cv2.resize(cost_mask, (100, 100), interpolation=cv2.INTER_AREA)
    return path_grid_scale, total_hazards

def perform_astar_search(grid, start, end):
    start_node, end_node = Node(None, start), Node(None, end)
    open_list, closed_list = [start_node], []
    rows, cols = grid.shape
    iterations = 0
    
    while len(open_list) > 0 and iterations < 8000:
        iterations += 1
        current_node = open_list[0]
        current_index = 0
        for index, item in enumerate(open_list):
            if item.f < current_node.f:
                current_node, current_index = item, index
                
        open_list.pop(current_index)
        closed_list.append(current_node)
        
        if current_node == end_node:
            path = []
            while current_node is not None:
                path.append(current_node.position)
                current_node = current_node.parent
            return path[::-1] 
            
        children = []
        for new_pos in [(0, -1), (0, 1), (-1, 0), (1, 0), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            node_pos = (current_node.position[0] + new_pos[0], current_node.position[1] + new_pos[1])
            if 0 <= node_pos[0] < rows and 0 <= node_pos[1] < cols:
                children.append(Node(current_node, node_pos))
                
        for child in children:
            if child in closed_list: continue
            terrain_cost = grid[child.position[0]][child.position[1]]
            if terrain_cost >= 9999.0: continue 
                
            child.g = current_node.g + terrain_cost
            child.h = ((child.position[0] - end_node.position[0])**2 + (child.position[1] - end_node.position[1])**2) ** 0.5
            child.f = child.g + child.h
            if len([o for o in open_list if child == o and child.g > o.g]) > 0: continue
            open_list.append(child)
            
    return [start, end]

# --- 6. API ENDPOINTS ---
@app.get("/api/mission-stats")
async def get_historical_telemetry():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*), SUM(craters_count), SUM(estimated_volume) FROM mission_logs")
    row = cursor.fetchone()
    conn.close()
    total_scans = row[0] if row[0] else 0
    return {
        "totalScans": total_scans,
        "cratersMapped": row[1] if row[1] else 0,
        "waterVolumeEst": f"{row[2] / 1000000:.1f}M m³" if row[2] and row[2] >= 1000000 else f"{row[2] or 0:,.0f} m³",
        "highValueMinerals": f"{max(1, total_scans // 4)} Sectors" if total_scans > 0 else "0 Sectors"
    }

@app.post("/api/predict/batch")
async def process_batch_scans(files: List[UploadFile] = File(...)):
    processed_images = []
    batch_detections = []
    
    for file in files:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR) 
        if img is None: continue
            
        processed_images.append(img)
        h, w, _ = img.shape
        mean_color = cv2.mean(img)
        b_intensity, g_intensity, r_intensity = mean_color[0], mean_color[1], mean_color[2]
        water_purity = min(99.4, max(5.0, (b_intensity / 255.0) * 100 + 10))
        vol_est = int((b_intensity * 1500) + 2000)
        
        file_boxes = []
        if model:
            results = model(img, conf=0.25)[0]
            for box in results.boxes:
                coords = box.xyxy[0].tolist()
                file_boxes.append({
                    "x1": int(coords[0]), "y1": int(coords[1]),
                    "x2": int(coords[2]), "y2": int(coords[3]),
                    "confidence": int(box.conf[0] * 100)
                })
        
        batch_detections.append({
            "filename": file.filename, 
            "craters": len(file_boxes), 
            "water": water_purity, 
            "volume": vol_est, 
            "boxes": file_boxes,
            "src_h": h,
            "src_w": w
        })

    if len(processed_images) >= 2:
        stitcher = cv2.Stitcher_create(cv2.Stitcher_PANORAMA)
        status, stitched_img = stitcher.stitch(processed_images)
        if status != cv2.Stitcher_OK:
            stitched_img = cv2.hconcat([cv2.resize(m, (300, 300)) for m in processed_images])
    else:
        stitched_img = processed_images[0] if len(processed_images) > 0 else np.zeros((400, 400, 3), dtype=np.uint8)

    map_image = cv2.resize(stitched_img, (600, 400))
    img_rgb = cv2.cvtColor(map_image, cv2.COLOR_BGR2RGB)

    water_heatmap_img = generate_water_heatmap(img_rgb)
    mineral_profile_img = generate_mineral_overlay(img_rgb)
    path_grid, total_hazards = generate_cost_grid(map_image, batch_detections)

    start_pt, end_pt = (5, 5), (95, 95)
    path_grid[start_pt[0]][start_pt[1]] = 1.0 
    path_grid[end_pt[0]][end_pt[1]] = 1.0
    calculated_route = perform_astar_search(path_grid, start_pt, end_pt)
    formatted_waypoints = [{"x": p[1], "y": p[0]} for p in calculated_route]

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    mean_water = sum(d["water"] for d in batch_detections) / len(batch_detections) if batch_detections else 0
    total_volume = sum(d["volume"] for d in batch_detections) / len(batch_detections) if batch_detections else 0
    cursor.execute("""
        INSERT INTO mission_logs (timestamp, filename, craters_count, mean_water_purity, estimated_volume, mean_iron_percentage)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), f"Batch_{len(files)}", total_hazards, mean_water, total_volume, 0))
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "craters_found": total_hazards,
        "files_processed": len(processed_images),
        "map_assets": {
            "map_image": get_base64_jpeg(map_image), 
            "water_heatmap": get_base64_png(water_heatmap_img), 
            "mineral_profile": get_base64_png(mineral_profile_img) 
        },
        "detections": batch_detections,
        "navigation": {
            "start": {"x": start_pt[1], "y": start_pt[0]},
            "destination": {"x": end_pt[1], "y": end_pt[0]},
            "waypoints": formatted_waypoints
        }
    }

@app.get("/api/missions/latest")
async def get_latest_mission():
    """Fetches the most recent scan telemetry from the database for the Planner."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Grab the absolute latest mission log
    cursor.execute("SELECT id, timestamp, filename, craters_count, mean_water_purity FROM mission_logs ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return {"status": "error", "message": "No missions found. Run a Batch Scan first."}
    
    # Calculate an estimated traverse distance based on hazard detours
    distance_km = round(42.6 + (row[3] * 1.2), 2) 
    
    return {
        "status": "success",
        "telemetry": {
            "id": row[0],
            "date": row[1],
            "distance_km": distance_km,
            "hazards_count": row[3],
            "water_pct": round(row[4], 1),
            "mineral_pct": 15.0 # Baseline estimation
        }
    }

@app.post("/api/plan/ai-manifest")
async def generate_ai_manifest(telemetry: MissionTelemetry):
    """Feeds GIS data to an LLM to generate a tactical mission manifest."""
    prompt = f"""
    You are 'Astro-Command', the AI logistical planner for a lunar rover mission.
    Analyze the following rover telemetry and output a strict JSON manifest of required equipment.
    
    MISSION TELEMETRY:
    - Route Distance: {telemetry.distance_km} km
    - Hazards on Route: {telemetry.hazards_count}
    - Estimated Water Ice: {telemetry.water_pct}%
    - Estimated Mineral Density: {telemetry.mineral_pct}%
    
    RULES:
    1. If distance is long, prioritize battery and durable treads.
    2. If hazards are high, recommend active suspension and hazard-avoidance lasers.
    3. If water is high, recommend thermal drills and H2O extraction tanks.
    4. Provide the output in this EXACT JSON structure, nothing else:
    {{
      "chassis_recommendation": "String",
      "power_system": "String",
      "primary_payload": ["Item 1", "Item 2"],
      "risk_assessment": "String (1 short sentence)"
    }}
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        import json
        clean_text = response.text.replace('```json', '').replace('```', '')
        manifest = json.loads(clean_text)
        return {"status": "success", "manifest": manifest}
    except Exception as e:
        print(f"AI Generation Error: {e}")
        return {"status": "error", "message": "AI Commander offline."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)