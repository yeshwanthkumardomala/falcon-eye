# 🦅 FalconEye | Autonomous Heritage Conservation AI

<div align="center">
  <img src="https://img.shields.io/badge/WRO-2026_Future_Innovators-blue?style=for-the-badge&logo=robotics" alt="WRO" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/YOLOv8-FF1493?style=for-the-badge&logo=yolo&logoColor=white" alt="YOLOv8" />
  <img src="https://img.shields.io/badge/Vue.js-Vite-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vite" />
</div>

<br>

**FalconEye** is an AI-powered autonomous heritage conservation ecosystem designed by 12-14 year old innovators for the WRO (World Robot Olympiad) **Cultural Heritage** theme. It protects both **ancient cultural monuments** and the **natural biodiversity surrounding them**. 

Instead of only monitoring structures, FalconEye continuously evaluates the complete environmental health of a location using our custom **Cultural Habitat Health Index (CHHI)** algorithm, proving that technology and culture can thrive together.

---

## ✨ Key Features (WRO Edition)

- 🧠 **Dual-AI Pipeline (Split-Screen)**: Runs `AprilTags` (for robot spatial navigation) and `YOLOv8` (for object detection) simultaneously. The dashboard features two live cameras side-by-side!
- 🛟 **Debug/Reconnect System**: Includes a 1-click `🔄 Restart AI` button on the dashboard to instantly reload camera streams if the network drops.
- 🌱 **Live CHHI Scoring**: The dashboard algorithmically decreases the score when litter/plastic is detected, and increases it when wildlife (birds) are detected.
- 📈 **Real-Time Graphs**: Features an animated line chart powered by `Chart.js` to visualize ecosystem health drops instantly.
- 🗺️ **Digital Twin Heatmap**: An HTML5 Canvas live-renders the robot's coordinates and generates a persistent foot-traffic heatmap.
- 📍 **Mission Queuing**: Add multiple waypoints to the robot's queue; it automatically navigates and pops them off the list.
- 📊 **CSV Data Logger**: Automatically logs every AI detection to a `.csv` file for Data Science analysis.
- 🌗 **Accessible UI**: Includes a 1-click High-Contrast mode for visually impaired users.

---

## 🚀 How to Run FalconEye on Your Laptop

This project uses a decoupled architecture. The heavy AI processing runs on the laptop, while the camera stream comes from a Raspberry Pi (or a simulated stream).

### 1. Prerequisites
- Python 3.10+
- Node.js (v18+) & `npm`
- A working webcam or Raspberry Pi MJPEG stream.

### 2. Installation Setup
Clone the repository and run the automated startup script:

```bash
git clone https://github.com/yeshwanthkumardomala/falcon-eye.git
cd falcon-eye

# Make the startup script executable
chmod +x start.sh

# Start the system!
./start.sh
```

### 3. What `start.sh` Does Automatically:
1. **Creates a Python Virtual Environment** (`venv`).
2. **Installs Python Dependencies** (`pip install -r requirements.txt`).
3. **Installs Frontend Dependencies** (`cd frontend && npm install`).
4. **Boots the FastAPI AI Backend** on port `8080`.
5. **Boots the Vite Frontend** on port `5173`.

Once started, simply open your browser and navigate to:
👉 **http://localhost:5173**

### 4. 🍓 Raspberry Pi 3B+ Hardware Setup (Robot Camera)
The FalconEye AI expects a live video stream from the robot over the local network. 

1. Install Python and OpenCV on your Raspberry Pi 3B+:
   ```bash
   sudo apt update
   sudo apt install python3-opencv python3-pip
   ```
2. Copy the `pi/` directory from this repository to your Raspberry Pi.
3. Run the camera streamer on the Pi:
   ```bash
   cd pi
   python3 main.py
   ```
4. The Pi will broadcast the raw camera feed to `http://<PI_IP_ADDRESS>:8000/video_feed`. The laptop backend automatically connects to this stream and processes the AI locally!

---

## 📸 Dashboard Preview & Demo

*(Drop a GIF or screen recording of your dashboard here!)*

> **WRO Judges Tip:** Grab a plastic bottle and hold it up to the camera. Watch the AI detect it via YOLOv8, flag it as "Litter/Plastic!", and instantly drop the CHHI Ecosystem score on the live graph!

---
*Built with ❤️ for WRO Future Innovators*
