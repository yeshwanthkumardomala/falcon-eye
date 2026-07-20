# 🦅 FalconEye: Autonomous Heritage Conservation AI
**World Robot Olympiad (WRO) 2026 - Future Innovators**
*Theme: Cultural Heritage*

<div align="center">
  <img src="https://img.shields.io/badge/WRO-2026_Future_Innovators-blue?style=for-the-badge&logo=robotics" alt="WRO" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/YOLOv8-FF1493?style=for-the-badge&logo=yolo&logoColor=white" alt="YOLOv8" />
  <img src="https://img.shields.io/badge/Vue.js-Vite-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vite" />
</div>

<br>

## 📑 1. Abstract & Introduction
**FalconEye** is an AI-powered autonomous heritage conservation ecosystem engineered by 12-14 year old innovators. Designed specifically for the WRO Cultural Heritage theme, it aims to protect both **ancient cultural monuments** and the **natural biodiversity** surrounding them. 

Instead of treating cultural monuments as isolated structures, FalconEye evaluates the complete environmental health of a location using our custom **Cultural Habitat Health Index (CHHI)** algorithm, proving that advanced robotics, cultural preservation, and ecological sustainability can thrive together.

---

## 🏗️ 2. System Architecture
The FalconEye project utilizes a decoupled edge-computing architecture to achieve maximum performance and zero-latency video streaming.

*   **Edge Device (Raspberry Pi 3B+)**: Mounted on the robot. It captures raw camera frames and broadcasts them over the local WiFi network using a lightweight Python MJPEG streamer.
*   **Base Station (Laptop)**: Runs a high-performance `FastAPI` server. It captures the network stream, runs complex multi-threaded AI processing, and serves a modern `Vue.js` / `Vite` dashboard to the user.

---

## 🧠 3. Artificial Intelligence Pipeline
To achieve autonomous navigation and environmental analysis simultaneously, FalconEye employs a **Dual-AI Pipeline** with isolated threading.

1.  **Navigation (AprilTags)**: Using the `pupil_apriltags` library, the system detects physical markers placed around the heritage site. This allows the robot to calculate distance (`distance = sqrt(x² + y² + z²)`) and angle, generating a live 2D heat-map of its environment.
2.  **Conservation (YOLOv8)**: Using the state-of-the-art YOLOv8 neural network (running on PyTorch), the system performs real-time object detection. It is trained to specifically identify:
    *   `Litter / Plastic Waste` (Bottles, Cups) 🥤
    *   `Wildlife` (Birds) 🕊️
    *   `Human Activity` (Tourists / Persons) 🧍‍♂️

*(Note: To prevent Segmentation Faults and C++ memory collisions during concurrent requests, the AI engine runs on a strictly isolated background thread with a Zero-Latency Duplicate Frame Dropper).*

---

## 📊 4. The Cultural Habitat Health Index (CHHI)
The core innovation of FalconEye is the **CHHI Algorithm**. It dynamically scores the health of a heritage site in real-time.

*   **Detection Penalties**: If YOLOv8 detects a plastic bottle, the backend immediately triggers an event to drop the CHHI score.
*   **Detection Rewards**: If YOLOv8 detects local wildlife returning to the area, the CHHI score increases.
*   **Data Logging**: Every single detection, along with its timestamp, confidence rating, and spatial coordinates, is logged to a `log.csv` file for long-term Data Science and environmental auditing.

---

## 💻 5. Dashboard & User Interface
The command center is a Vue.js web application designed with modern glassmorphism aesthetics and extreme accessibility in mind.

*   **Dual Split-Screen Cameras**: View the Navigation (AprilTags) feed and Conservation (YOLOv8) feed side-by-side. The YOLO feed can be toggled on/off to save bandwidth.
*   **Live CHHI Graph**: A highly responsive `Chart.js` line graph dynamically plots the health of the ecosystem as the robot roams.
*   **High-Contrast Mode**: Built-in accessibility toggles allow visually impaired operators to interact with the dashboard clearly.
*   **Debug Reconnection**: A 1-click `Restart AI` button allows operators to instantly re-poll the camera feeds if the robot drives into a WiFi dead-zone.

---

## 🚀 6. Installation & Execution Guide

### 🍓 Step 1: Robot Setup (Raspberry Pi 3B+)
1. Install Python and OpenCV on your Raspberry Pi:
   ```bash
   sudo apt update
   sudo apt install python3-opencv python3-pip
   ```
2. Copy the `pi/` directory from this repository to the Pi.
3. Start the broadcaster:
   ```bash
   cd pi
   python3 main.py
   ```

### 💻 Step 2: Base Station Setup (Laptop)
Ensure you have Python 3.10+ and Node.js v18+ installed.

```bash
# Clone the repository
git clone https://github.com/yeshwanthkumardomala/falcon-eye.git
cd falcon-eye

# Make the startup script executable
chmod +x start.sh

# Run the automated boot sequence!
./start.sh
```
*The `start.sh` script automatically builds the virtual environment, installs `requirements.txt`, installs Node modules, and launches both the backend and frontend simultaneously.*

Open your browser and navigate to: 👉 **http://localhost:5173**

---
*Developed with ❤️ for the Future Innovators of WRO 2026*
