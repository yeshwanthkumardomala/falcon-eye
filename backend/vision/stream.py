import cv2
import time
import requests
import numpy as np
import threading

class VideoStream:
    def __init__(self, url):
        self.url = url
        self.fps = 0
        self.latency = 0
        self.last_frame_time = time.time()
        self.frame_count = 0
        self.start_time = time.time()
        self.latest_frame = None
        self.running = True
        
        self.thread = threading.Thread(target=self._update, daemon=True)
        self.thread.start()

    def _update(self):
        while self.running:
            bytes_data = b''
            try:
                r = requests.get(self.url, stream=True, timeout=5)
                for chunk in r.iter_content(chunk_size=65536):
                    if not self.running:
                        break
                    bytes_data += chunk
                    a = bytes_data.find(b'\xff\xd8')
                    b = bytes_data.find(b'\xff\xd9')
                    
                    if a != -1 and b != -1:
                        if a < b:
                            jpg = bytes_data[a:b+2]
                            bytes_data = bytes_data[b+2:]
                            
                            frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                            if frame is not None and frame.shape == (480, 640, 3):
                                self.latest_frame = frame
                                
                                current_time = time.time()
                                self.latency = (current_time - self.last_frame_time) * 1000
                                self.last_frame_time = current_time
                                
                                self.frame_count += 1
                                elapsed = current_time - self.start_time
                                if elapsed > 1.0:
                                    self.fps = self.frame_count / elapsed
                                    self.start_time = current_time
                                    self.frame_count = 0
                        else:
                            bytes_data = bytes_data[a:]
            except Exception as e:
                print(f"Stream reconnection: {e}")
                time.sleep(1)

    def get_frame(self):
        return self.latest_frame
