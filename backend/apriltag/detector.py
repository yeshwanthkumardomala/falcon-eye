import cv2
import numpy as np
import json
import math
import os
from pupil_apriltags import Detector

class AprilTagEngine:
    def __init__(self):
        try:
            from ultralytics import YOLO
            self.yolo = YOLO('yolov8n.pt')
        except ImportError:
            self.yolo = None
            
        self.detector = Detector(families='tag36h11',
                                 nthreads=1,
                                 quad_decimate=1.0,
                                 quad_sigma=0.0,
                                 refine_edges=1,
                                 decode_sharpening=0.25,
                                 debug=0)
        
        # Camera intrinsics (approximated for Pi Camera 640x480)
        self.camera_params = (500.0, 500.0, 320.0, 240.0) # (fx, fy, cx, cy)
        self.tag_size = 0.16
        
        tag_path = os.path.join(os.path.dirname(__file__), '../config/tags.json')
        with open(tag_path, 'r') as f:
            tags_data = json.load(f)
        self.tags = {t['id']: t for t in tags_data}

    def draw_3d_axes(self, frame, tag, center):
        R = tag.pose_R
        t = tag.pose_t
        
        K = np.array([
            [self.camera_params[0], 0, self.camera_params[2]],
            [0, self.camera_params[1], self.camera_params[3]],
            [0, 0, 1]
        ])
        
        scale = self.tag_size / 2.0
        
        points_3d = np.float32([
            [0, 0, 0],
            [scale, 0, 0],
            [0, -scale, 0],
            [0, 0, -scale]
        ])
        
        points_2d, _ = cv2.projectPoints(points_3d, R, t, K, np.zeros(4))
        points_2d = np.int32(points_2d).reshape(-1, 2)
        
        cv2.line(frame, tuple(points_2d[0]), tuple(points_2d[1]), (0, 0, 255), 3) # X-axis Red
        cv2.line(frame, tuple(points_2d[0]), tuple(points_2d[2]), (0, 255, 0), 3) # Y-axis Green
        cv2.line(frame, tuple(points_2d[0]), tuple(points_2d[3]), (255, 0, 0), 3) # Z-axis Blue

    def detect_and_draw(self, frame):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        tags = self.detector.detect(gray, estimate_tag_pose=True, camera_params=self.camera_params, tag_size=self.tag_size)
        
        results = []
        for tag in tags:
            tag_id = tag.tag_id
            tag_info = self.tags.get(tag_id, {"name": f"Unknown {tag_id}", "x": 0, "y": 0})
            tag_name = tag_info["name"]
            
            t_vec = tag.pose_t
            distance = np.linalg.norm(t_vec)
            angle = math.degrees(math.atan2(t_vec[0][0], t_vec[2][0]))
            confidence = float(tag.decision_margin)
            
            center = (int(tag.center[0]), int(tag.center[1]))
            corners = tag.corners.astype(int)
            
            cv2.polylines(frame, [corners], isClosed=True, color=(0, 255, 0), thickness=2)
            cv2.circle(frame, center, 5, (0, 0, 255), -1)
            
            if tag.pose_R is not None and tag.pose_t is not None:
                self.draw_3d_axes(frame, tag, center)
            
            label = f"ID: {tag_id} ({tag_name}) D:{distance:.2f}m A:{angle:.0f}deg"
            text_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
            cv2.rectangle(frame, (corners[0][0], corners[0][1] - 30), (corners[0][0] + text_size[0], corners[0][1] - 5), (0, 0, 0), -1)
            cv2.putText(frame, label, (corners[0][0], corners[0][1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            
            results.append({
                "id": tag_id,
                "name": tag_name,
                "tag_x": tag_info.get("x", 0),
                "tag_y": tag_info.get("y", 0),
                "distance": distance,
                "angle": angle,
                "confidence": confidence,
                "center": center,
                "type": "apriltag"
            })
            
        if self.yolo:
            yolo_results = self.yolo(frame, verbose=False)
            for r in yolo_results:
                for box in r.boxes:
                    cls = int(box.cls[0])
                    name = self.yolo.names[cls]
                    conf = float(box.conf[0])
                    if conf > 0.5:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        
                        if name in ["bottle", "cup"]:
                            label = "Litter/Plastic!"
                            color = (0, 0, 255)
                        elif name == "bird":
                            label = "Bird Detected!"
                            color = (0, 255, 0)
                        elif name == "person":
                            label = "Tourist"
                            color = (255, 0, 0)
                        else:
                            continue
                            
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(frame, f"{label} {conf:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                        
                        results.append({
                            "id": f"yolo_{name}",
                            "name": label,
                            "tag_x": 0, "tag_y": 0, "distance": 999, "angle": 0,
                            "confidence": conf * 100,
                            "center": ((x1+x2)//2, (y1+y2)//2),
                            "type": name
                        })
            
        return frame, results
