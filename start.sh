#!/bin/bash
echo "====================================="
echo "   Starting FalconEye System...      "
echo "====================================="

# 1. Start the Python AI Backend
echo "[1/2] Starting AI Vision Backend..."
cd backend
source ../venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# 2. Start the Vite Web Frontend
echo "[2/2] Starting Web Dashboard Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "-------------------------------------"
echo " FalconEye is running!"
echo " 🌐 Dashboard: http://localhost:5173"
echo " Press Ctrl+C to shutdown safely."
echo "-------------------------------------"

trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
