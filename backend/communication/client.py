import asyncio
import websockets
import json
import threading

class TelemetryClient:
    def __init__(self, uri="ws://jnvrr.local:8000/ws"):
        self.uri = uri
        self.latest_telemetry = {}
        self.connected = False
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self._start_loop, daemon=True)
        self.thread.start()

    def _start_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._connect())

    async def _connect(self):
        while True:
            try:
                async with websockets.connect(self.uri) as ws:
                    self.connected = True
                    print(f"[WS] Connected to {self.uri}")
                    
                    # Start pinging task
                    ping_task = asyncio.create_task(self._ping_loop(ws))
                    
                    try:
                        async for message in ws:
                            data = json.loads(message)
                            if data.get("type") == "telemetry":
                                self.latest_telemetry = data
                            elif data.get("type") in ["pong", "heartbeat_ack"]:
                                pass # Handled implicitly
                    except websockets.exceptions.ConnectionClosed:
                        pass
                    finally:
                        ping_task.cancel()
                        self.connected = False
            except Exception as e:
                self.connected = False
                # Silently retry to avoid spamming console
                await asyncio.sleep(2)
                
    async def _ping_loop(self, ws):
        while True:
            await asyncio.sleep(2)
            try:
                await ws.send('{"type": "ping"}')
            except Exception:
                break
