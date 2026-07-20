import cv2
import asyncio
import json
import uvicorn
import csv
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from vision.stream import VideoStream
from apriltag.detector import AprilTagEngine
from communication.client import TelemetryClient

# Global state
pi_stream = VideoStream("http://jnvrr.local:8000/video_feed")
ai_engine = AprilTagEngine()
pi_telemetry = TelemetryClient("ws://jnvrr.local:8000/ws")

frontend_clients = []
latest_detections = []
latest_frame = None
is_recording = False

os.makedirs("data", exist_ok=True)
csv_file = "data/log.csv"
if not os.path.exists(csv_file):
    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["Timestamp", "TagID", "Distance", "Angle", "Confidence"])

async def ai_event_loop():
    while True:
        if frontend_clients and latest_detections:
            msg = json.dumps({"type": "ai_log", "detections": latest_detections})
            for client in frontend_clients:
                try:
                    await client.send_text(msg)
                except:
                    pass
        await asyncio.sleep(0.5)

async def telemetry_forwarder_loop():
    while True:
        if frontend_clients and pi_telemetry.connected and pi_telemetry.latest_telemetry:
            msg = json.dumps(pi_telemetry.latest_telemetry)
            for client in frontend_clients:
                try:
                    await client.send_text(msg)
                except:
                    pass
        await asyncio.sleep(1.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task1 = asyncio.create_task(ai_event_loop())
    task2 = asyncio.create_task(telemetry_forwarder_loop())
    yield
    task1.cancel()
    task2.cancel()
    pi_stream.running = False

app = FastAPI(lifespan=lifespan)

# Allow Frontend to fetch the stream
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import threading
import time

global_jpeg_tags = None
global_jpeg_yolo = None

def ai_processing_thread():
    global latest_detections, latest_frame, global_jpeg_tags, global_jpeg_yolo
    last_processed_frame = None
    while pi_stream.running:
        frame = pi_stream.get_frame()
        if frame is None or frame is last_processed_frame or getattr(frame, 'shape', None) != (480, 640, 3):
            time.sleep(0.01)
            continue
            
        last_processed_frame = frame
        frame_tags, frame_yolo, detections = ai_engine.detect_and_draw(frame)
        if frame_tags is None:
            time.sleep(0.01)
            continue
            
        latest_detections = detections
        latest_frame = frame_tags.copy()
        
        if detections:
            with open(csv_file, 'a', newline='') as f:
                writer = csv.writer(f)
                for d in detections:
                    writer.writerow([time.time(), d['id'], round(d['distance'], 2), round(d['angle'], 2), round(d['confidence'], 2)])
        
        cv2.putText(frame_tags, f"FPS: {pi_stream.fps:.1f} | Latency: {pi_stream.latency:.1f}ms", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(frame_yolo, f"FPS: {pi_stream.fps:.1f} | Latency: {pi_stream.latency:.1f}ms", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        ret1, buf1 = cv2.imencode('.jpg', frame_tags, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        ret2, buf2 = cv2.imencode('.jpg', frame_yolo, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        
        if ret1: global_jpeg_tags = buf1.tobytes()
        if ret2: global_jpeg_yolo = buf2.tobytes()

# Start the dedicated AI worker thread to prevent C++ segmentation faults
threading.Thread(target=ai_processing_thread, daemon=True).start()

def generate_frames_sync(feed_type="tags"):
    while True:
        jpg_bytes = global_jpeg_tags if feed_type == "tags" else global_jpeg_yolo
        if jpg_bytes is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + jpg_bytes + b'\r\n')
        time.sleep(0.02)

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames_sync("tags"), media_type="multipart/x-mixed-replace; boundary=frame")
    
@app.get("/video_feed_yolo")
def video_feed_yolo():
    return StreamingResponse(generate_frames_sync("yolo"), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/download_report")
def download_report():
    return FileResponse(csv_file, media_type="text/csv", filename="FalconEye_CHHI_Report.csv")

@app.post("/snapshot")
def take_snapshot():
    if latest_frame is not None:
        import time, os
        os.makedirs("media", exist_ok=True)
        filename = f"media/snap_{int(time.time())}.jpg"
        cv2.imwrite(filename, latest_frame)
        return {"status": "success", "file": filename}
    return {"status": "failed"}

@app.post("/record")
async def record_clip(background_tasks: BackgroundTasks):
    global is_recording
    if is_recording: return {"status": "already recording"}
    
    def record_task():
        global is_recording, latest_frame
        import time, os
        os.makedirs("media", exist_ok=True)
        filename = f"media/clip_{int(time.time())}.mp4"
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(filename, fourcc, 10.0, (640, 480))
        is_recording = True
        start_time = time.time()
        while time.time() - start_time < 10:
            if latest_frame is not None:
                out.write(latest_frame)
            time.sleep(0.1)
        out.release()
        is_recording = False
        
    background_tasks.add_task(record_task)
    return {"status": "recording started"}

@app.get("/tags")
def get_tags():
    import os
    tag_path = os.path.join(os.path.dirname(__file__), 'config/tags.json')
    with open(tag_path, 'r') as f:
        return json.load(f)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    frontend_clients.append(websocket)
    print("Frontend client connected.")
    try:
        while True:
            data = await websocket.receive_text()
            cmd = json.loads(data)
            if cmd.get("type") == "drive":
                print(f"Manual Override Command Received: {cmd.get('vector')}")
                # In Phase 9: Forward this vector down to the Pi via pi_telemetry.ws
    except WebSocketDisconnect:
        frontend_clients.remove(websocket)

if __name__ == "__main__":
    print("Starting Laptop AI Backend...")
    uvicorn.run("main:app", host="0.0.0.0", port=8080, log_level="info")
