# FalconEye:# Developer Diary & Roadmap

**Project**: FalconEye AI - Autonomous Heritage Conservation Ecosystem
**Goal**: Build a scalable, AI-powered rover and sensor network to protect cultural heritage sites and monitor surrounding biodiversity using the Cultural Habitat Health Index (CHHI).

---

## 📜 Phase 0: The True Vision (Heritage & Biodiversity)

FalconEye is not just a robot—it is an ecosystem:
1. **FalconNest AI Stations**: Fixed ESP32-CAM nodes monitoring specific zones.
2. **FalconEye Rover**: The autonomous ground agent that patrols, validates alerts, and maps the environment using AprilTags.
3. **The Brain (Laptop)**: Central compute node calculating the **CHHI (Cultural Habitat Health Index)** by processing video feeds for structural damage, litter, unauthorized human presence, and avian biodiversity (birds/nests).

Our roadmap is tailored to building the software architecture required to support this massive, interconnected ecosystem.

---

## 🔌 How to Reconnect & Run FalconEye

If you shut down the system and want to start it again tomorrow, follow these exact steps:

### Step 1: Start the Raspberry Pi Server (The Edge Node)
The Raspberry Pi must be running its camera server before the laptop connects.
1. Open a terminal on your laptop.
2. SSH into the Pi: `ssh jnvrr@jnvrr.local` (or use the IP: `10.124.229.51`)
3. Navigate to the project and start the server:
   ```bash
   cd ~/FalconEye/pi
   source ../venv/bin/activate
   python3 main.py
   ```
4. *Leave this terminal window open.* The Pi is now broadcasting video and telemetry.

### Step 2: Start the Laptop AI & Web Dashboard (The Brain)
Now that the Pi is streaming, launch the AI processing and Web UI on your laptop.
1. Open a **new** terminal on your laptop.
2. Run the 1-click start script:
   ```bash
   cd ~/falconeye-laptop
   ./start.sh
   ```
3. Open your browser and go to `http://localhost:5173`. 
4. **Shutdown**: Press `Ctrl+C` in this terminal to safely kill both the Python AI backend and the Vite frontend.

---

## 📖 The Development Journey (How We Built This)

The project was built chronologically based on your initial master prompt, adhering strictly to a decoupled hardware philosophy.

### Phase 1 & 2: Hardware Connectivity & Isolation
*   **Your Prompt**: *"Attempt SSH... Do not continue until SSH is working... Create Python virtual environment. Install FastAPI, OpenCV, Picamera2..."*
*   **What We Did**: We successfully connected to the Pi (Model 3B+, 1GB RAM) via SSH. We created an isolated `venv` so we didn't break the Pi's OS. We realized the Pi 3B+ has limited RAM, so we constrained the C-compiler to a single CPU core to prevent Out-Of-Memory crashes during installation.

### Phase 3 & 4: Camera Verification & MJPEG Streaming
*   **Your Prompt**: *"Automatically determine Raspberry Pi Camera... Capture One image, One video... Create FastAPI Server Requirements: MJPEG Streaming, Exception Handling."*
*   **What We Did**: We wrote a hardware script to test the `/dev/video0` kernel driver. It successfully snapped a photo and a 3-second video. We then built a FastAPI server on the Pi to stream those frames continuously over HTTP without doing any heavy AI processing.

### Phase 5 & 6: AI Offloading & AprilTag Math
*   **Your Prompt**: *"The Raspberry Pi performs no AI processing... The Laptop performs OpenCV, AprilTag Detection... Draw Bounding Box, Center, Axes, Distance... Future Mapping inside config/tags.py."*
*   **What We Did**: We built the Python backend on the laptop. It connects to the Pi's HTTP stream, runs the frames through `pupil-apriltags` (family `tag36h11`), and uses the intrinsic camera matrix to project 3D geometric axes (X, Y, Z) and calculate the physical distance to the tag.

### Phase 7 & 8: WebSockets & The Premium Web Dashboard
*   **Your Prompt**: *"Create Pi WebSocket Server... Laptop WebSocket Client... make a digital replica on a web dashboard wit some movement s like when tags are shown in cam... make the dashboard properly professinal"*
*   **What We Did**: We embedded a WebSocket into the FastAPI servers. The Pi broadcasts its CPU/RAM usage. The Laptop receives this and relays it to a stunning **Vite + Vanilla CSS** frontend featuring Glassmorphism, a glowing UI, and an 8-way directional control pad. We also fixed a critical thread-starvation bug (GIL lock) that briefly prevented the video feed from loading.

---

## 🚀 Future Upgrades & Roadmap

FalconEye's architecture is deeply modular, meaning you can plug in new features without rewriting the core. Here is what you can build next:

### 1. Hardware Motor Integration (Phase 9)
*   **The Upgrade**: Add an L298N Motor Driver or an Arduino connected to the Pi via USB/GPIO.
*   **How it works**: The 8-way D-Pad on the Web Dashboard currently sends JSON (e.g., `{"vector": "NE"}`). You will update the Pi's WebSocket to listen for these vectors and trigger the physical GPIO pins to drive the motors.

### 2. Closed-Loop Autonomous Pathfinding
*   **The Upgrade**: Write a PID Controller in `backend/main.py`.
*   **How it works**: You click "Go to Station A" on the Dashboard. The laptop reads the AprilTag distance (e.g., 2.5 meters). The laptop automatically streams forward/turn motor commands to the Pi until the AprilTag distance hits 0.1 meters, then issues a STOP command.

### 3. Sensor Fusion (LiDAR & IMU)
*   **The Upgrade**: Add an RPLidar A1 (for 2D room mapping) and a BNO085 IMU (for high-precision compass heading).
*   **How it works**: AprilTags are great, but the robot goes "blind" if a tag isn't in the camera's view. An IMU allows the robot to turn exactly 90 degrees in the dark. LiDAR allows it to avoid moving obstacles (like a person walking in front of it) while traveling between AprilTags.

### 4. Advanced AI Object Detection
*   **The Upgrade**: Add a Google Coral USB Accelerator to the Pi, or run YOLOv8 on the Laptop.
*   **How it works**: Alongside scanning for AprilTags, the camera can detect "Person", "Chair", or "Box". This allows the robot to follow you around the room or dynamically avoid unmapped obstacles.

### Phase 9: WRO Cultural Heritage & Biodiversity Expansion
*   **Your Prompt**: *"Add WRO competition features... integrate 15 ideas... show CHHI score... YOLOv8 integration... Accessible UI... Mission Queue..."*
*   **What We Did**: We massively expanded the project to fit the WRO "Robots over Culture" theme. We integrated **YOLOv8** to run simultaneously with the AprilTag detector. We created the **Cultural Habitat Health Index (CHHI)** which algorithmically penalizes the ecosystem score for litter (plastic bottles) and rewards it for wildlife (birds). We added a High-Contrast accessibility mode, an interactive Mission Queue, an HTML5 Digital Twin heatmap, and a `.csv` data-logger for environmental auditing.

### Phase 10: The "Zero-Latency" Performance Overhaul
*   **Your Prompt**: *"Reduce the latency in the camera as much as possible... the camera feed isnt proper and also its like glitching... fix that..."*
*   **What We Did**: We encountered severe C++ segmentation faults and MJPEG image "tearing" (glitching) due to concurrent AI threading and bad byte-chunk boundaries. We completely rewrote the core AI pipeline:
    1.  **Dual Split-Screen UI**: Added independent live camera streams (Navigation vs Conservation).
    2.  **Thread-Safe AI Isolation**: Moved the YOLO and AprilTag inferences into a dedicated background worker thread that writes to global RAM buffers, completely eliminating PyTorch memory crashes.
    3.  **Zero-Latency Duplicate Dropping**: Forced the AI thread to sleep instantly if the Raspberry Pi hasn't delivered a *new* frame, saving massive amounts of CPU and eliminating video lag entirely.
    4.  **Robust MJPEG Chunking**: Increased the HTTP stream chunks from 4KB to 64KB and added strict byte-boundary verification to ensure broken JPEGs are discarded instead of rendered, fixing the "tearing" glitch.

### Phase 11: Professional Engineering Deployment
*   **Your Prompt**: *"Repair everything and push it into my github repo... write a proper readme... use the FalconEye Project Brief structure..."*
*   **What We Did**: We ran a full system audit, created `.gitignore` and `requirements.txt` files, and automatically deployed the entire system to your public GitHub repository (`yeshwanthkumardomala/falcon-eye`). We completely formatted the GitHub `README.md` into a formal, highly-professional WRO Engineering Report detailing the FalconNest and FalconEye architecture, ensuring the project is 100% presentation-ready for the judges.

### Phase 12: Final Testing & System Shutdown
*   **Your Prompt**: *"close everything and open and run for testing kill all servers and rerun... now off the pi so that we can again connect tomorrow"*
*   **What We Did**: We completely severed all AI and Web server background tasks on both the Edge Node and the Base Station to ensure a clean slate. We ran a full, end-to-end system boot test and confirmed that all latency, stream glitching, and threading issues were resolved and operating smoothly. Finally, we safely commanded the Raspberry Pi 3B+ to shutdown (`sudo shutdown -h now`) to preserve its filesystem and memory state for tomorrow's work.
