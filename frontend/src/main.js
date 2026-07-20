import './style.css';

document.addEventListener('DOMContentLoaded', async () => {
  const eventLog = document.getElementById('event-log');
  const detList = document.getElementById('det-list');
  const connStatus = document.getElementById('conn-status');
  const stateBadge = document.getElementById('robot-state');
  
  const canvas = document.getElementById('twin-canvas');
  const ctx = canvas.getContext('2d');
  
  // State
  let tags = [];
  let ws;
  let robot = { x: 0, y: 0, heading: 0, state: 'Idle' };
  let targetTag = null;
  let missionQueue = [];
  let breadcrumbs = [];
  let heatmap = [];
  let chhiScore = 100;
  
  // New UI Buttons
  document.getElementById('btn-theme').addEventListener('click', () => {
    document.body.classList.toggle('high-contrast');
    logEvent("Toggled Accessibility Mode", "info");
  });
  
  document.getElementById('btn-csv').addEventListener('click', () => {
    window.open('http://localhost:8080/download_report', '_blank');
    logEvent("Downloading CHHI Data Report...", "highlight");
  });
  
  // Simulation Buttons
  document.getElementById('btn-sim-bird').addEventListener('click', () => {
    updateCHHI(5);
    logEvent("Bird Detected! CHHI +5", "highlight");
  });
  
  document.getElementById('btn-sim-trash').addEventListener('click', () => {
    updateCHHI(-10);
    logEvent("Litter Detected! CHHI -10", "error");
  });
  
  // DVR Handlers
  document.getElementById('btn-snap').addEventListener('click', async () => {
    logEvent("Requesting Snapshot...", "highlight");
    try {
      const res = await fetch("http://localhost:8080/snapshot", {method: "POST"});
      const data = await res.json();
      logEvent(`Snapshot Saved: ${data.file}`, "highlight");
    } catch(e) { logEvent("Snapshot failed", "error"); }
  });
  
  document.getElementById('btn-rec').addEventListener('click', async () => {
    logEvent("Starting 10s DVR Recording...", "highlight");
    try {
      const res = await fetch("http://localhost:8080/record", {method: "POST"});
      const data = await res.json();
      logEvent(`DVR: ${data.status}`, "highlight");
    } catch(e) { logEvent("Recording failed", "error"); }
  });
  
  // Helpers
  function logEvent(msg, type="info") {
    const li = document.createElement('li');
    li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if (type === "highlight") li.classList.add("highlight");
    if (type === "error") li.classList.add("error");
    eventLog.prepend(li);
    if(eventLog.children.length > 50) eventLog.lastChild.remove();
  }

  function updateState(newState) {
    robot.state = newState;
    stateBadge.textContent = newState;
    stateBadge.className = 'status-badge ' + newState.toLowerCase().replace(' ', '-');
  }
  
  function updateCHHI(amount) {
    chhiScore += amount;
    if(chhiScore < 0) chhiScore = 0;
    if(chhiScore > 100) chhiScore = 100;
    document.getElementById('chhi-score').textContent = Math.round(chhiScore);
    if (chhiScore < 50) document.getElementById('chhi-score').style.color = "#ff3366";
  }
  
  // Initialize Chart.js
  const ctxChart = document.getElementById('chhi-chart').getContext('2d');
  const chhiChart = new Chart(ctxChart, {
      type: 'line',
      data: {
          labels: Array(30).fill(''),
          datasets: [{
              label: 'CHHI Trend',
              data: Array(30).fill(100),
              borderColor: '#00ff88',
              backgroundColor: 'rgba(0, 255, 136, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0
          }]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
              y: { min: 0, max: 100, display: false },
              x: { display: false }
          }
      }
  });

  setInterval(() => {
      chhiChart.data.datasets[0].data.push(chhiScore);
      chhiChart.data.datasets[0].data.shift();
      chhiChart.update();
  }, 500);

  // Fetch Tags
  try {
    const res = await fetch('http://localhost:8080/tags');
    tags = await res.json();
    
    // Populate select
    const select = document.getElementById('target-select');
    tags.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.description})`;
      select.appendChild(opt);
    });
    logEvent(`Loaded ${tags.length} Waypoints from map.`);
  } catch (e) {
    logEvent("Failed to load map tags.", "error");
  }

  // WebSocket
  function connectWS() {
    ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => {
      connStatus.classList.add('connected');
      connStatus.textContent = "Connected";
      logEvent("Connected to Laptop Brain", "highlight");
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "telemetry") {
        document.getElementById('pi-cpu').textContent = `${data.cpu_percent.toFixed(1)}%`;
        document.getElementById('pi-ram').textContent = `${data.ram_percent.toFixed(1)}%`;
        document.getElementById('cam-fps').textContent = `${Math.round(data.fps_target)} FPS`;
      } else if (data.type === "ai_log") {
        detList.innerHTML = ""; // Clear old detections
        let maxConf = 0;
        let min_dist = 999;
        
        data.detections.forEach(d => {
          const li = document.createElement('li');
          
          if(d.type === 'bottle' || d.type === 'cup') {
              li.innerHTML = `<strong style="color:#ff3366">${d.name}</strong><br/>Confidence: ${d.confidence.toFixed(1)}%`;
              updateCHHI(-0.5); // Trash penalty
          } else if (d.type === 'bird') {
              li.innerHTML = `<strong style="color:#00ff88">${d.name}</strong><br/>Confidence: ${d.confidence.toFixed(1)}%`;
              updateCHHI(0.5); // Bird bonus
          } else if (d.type === 'person') {
              li.innerHTML = `<strong style="color:#00d2ff">${d.name}</strong><br/>Confidence: ${d.confidence.toFixed(1)}%`;
          } else {
              // AprilTag logic
              li.innerHTML = `<strong>${d.name}</strong><br/>Dist: ${d.distance.toFixed(2)}m | Hdg: ${d.angle.toFixed(1)}°`;
              
              if(d.confidence > maxConf) maxConf = d.confidence;
              if(d.distance < min_dist) min_dist = d.distance;
              
              const aRad = d.angle * (Math.PI / 180);
              
              // Assuming Tags face 'North' (negative Y) for simple visualization
              // We calculate the robot's global position
              robot.x = d.tag_x - (Math.sin(aRad) * d.distance);
              robot.y = d.tag_y - (Math.cos(aRad) * d.distance); // fixed relative position 
              
              // Calculate global heading: pointing towards the tag minus the relative offset
              const dx = d.tag_x - robot.x;
              const dy = d.tag_y - robot.y;
              // In canvas, -Y is forward (North). So angle = atan2(X, -Y)
              const globalAngleToTag = Math.atan2(dx, -dy) * (180 / Math.PI);
              robot.heading = globalAngleToTag - d.angle;
              
              // Heatmap
              heatmap.push({x: robot.x, y: robot.y});
              if(heatmap.length > 500) heatmap.shift();
              
              // Breadcrumbs
              if(breadcrumbs.length === 0 || Math.hypot(breadcrumbs[breadcrumbs.length-1].x - robot.x, breadcrumbs[breadcrumbs.length-1].y - robot.y) > 0.2) {
                 breadcrumbs.push({x: robot.x, y: robot.y});
                 if(breadcrumbs.length > 50) breadcrumbs.shift();
              }
              
              document.getElementById('bot-pos').textContent = `X:${robot.x.toFixed(1)} Y:${robot.y.toFixed(1)}`;
              document.getElementById('bot-hdg').textContent = `${robot.heading.toFixed(0)}°`;
          }
          detList.appendChild(li);
        });
        
        // Confidence bar
        const confPercent = Math.min(100, Math.max(0, (maxConf / 100) * 100)); // Normalizing margin
        document.getElementById('conf-fill').style.width = `${confPercent}%`;
        
        // Collision warning
        if(min_dist < 0.4) {
            document.getElementById('collision-warn').style.display = 'block';
            updateCHHI(-0.1); // Decrease CHHI slightly on proximity violation
        } else {
            document.getElementById('collision-warn').style.display = 'none';
        }
        
        // Queue processing
        if (targetTag && min_dist < 0.4 && data.detections.some(d => d.id === targetTag.id)) {
            // Reached target
            logEvent(`Reached Waypoint: ${targetTag.name}`, "highlight");
            missionQueue.shift();
            renderQueue();
            if(missionQueue.length > 0) {
                targetTag = missionQueue[0];
                logEvent(`Next Waypoint: ${targetTag.name}`, "info");
            } else {
                targetTag = null;
                updateState('Idle');
            }
        }
        
        if(robot.state === 'Idle' && targetTag) updateState('Moving to Target');
        else if (robot.state === 'Idle' && data.detections.length > 0) updateState('Searching');
      }
    };
    ws.onclose = () => {
      connStatus.classList.remove('connected');
      connStatus.textContent = "Disconnected";
      logEvent("WebSocket disconnected. Retrying...", "error");
      setTimeout(connectWS, 2000);
    };
  }
  connectWS();

  function renderQueue() {
      const ul = document.getElementById('queue-list');
      ul.innerHTML = '';
      missionQueue.forEach((t, i) => {
          const li = document.createElement('li');
          li.textContent = `${i+1}. ${t.name}`;
          if (i===0) li.style.color = '#00ff88';
          ul.appendChild(li);
      });
  }

  // Navigation Logic
  document.getElementById('btn-queue').addEventListener('click', () => {
    const tId = parseInt(document.getElementById('target-select').value);
    if(tId === -1) return;
    const t = tags.find(tag => tag.id === tId);
    missionQueue.push(t);
    if(missionQueue.length === 1) targetTag = t;
    logEvent(`Queued: ${t.name}`, "info");
    renderQueue();
  });
  
  document.getElementById('btn-clear-q').addEventListener('click', () => {
    missionQueue = [];
    targetTag = null;
    renderQueue();
    updateState('Idle');
    logEvent(`Mission Queue Cleared`, "info");
  });

  // Controls (WASD)
  const keyMap = { 'w': 'W', 'a': 'A', 's': 'S', 'd': 'D', ' ': 'SPACE' };
  
  function sendCommand(cmd) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({type: "drive", vector: cmd}));
    }
  }

  document.addEventListener('keydown', (e) => {
    const k = keyMap[e.key.toLowerCase()];
    if(k) {
      const btn = document.querySelector(`.key-btn[data-key="${k}"]`);
      if(btn) btn.classList.add('active');
      sendCommand(k === 'SPACE' ? 'STOP' : k);
      updateState(k === 'SPACE' ? 'Idle' : 'Forward');
    }
  });
  document.addEventListener('keyup', (e) => {
    const k = keyMap[e.key.toLowerCase()];
    if(k) {
      const btn = document.querySelector(`.key-btn[data-key="${k}"]`);
      if(btn) btn.classList.remove('active');
      sendCommand('STOP');
      updateState('Idle');
    }
  });

  // Mouse Controls
  document.querySelectorAll('.key-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      sendCommand(e.target.dataset.key === 'SPACE' ? 'STOP' : e.target.dataset.key);
      updateState('Forward');
    });
    btn.addEventListener('mouseup', () => {
      sendCommand('STOP');
      updateState('Idle');
    });
  });

  // Render Loop for Digital Twin Map
  function renderMap() {
    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Scale and origin (1 meter = 60 pixels, origin at center)
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    const SCALE = 60;
    
    // Draw Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for(let i = -10; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i*SCALE, -600); ctx.lineTo(i*SCALE, 600); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-600, i*SCALE); ctx.lineTo(600, i*SCALE); ctx.stroke();
    }

    // Draw Tags
    tags.forEach(t => {
      const tx = t.x * SCALE;
      const ty = t.y * SCALE; // Note: Inverted Y axis visually depending on coord system, using standard +y down for now
      
      ctx.fillStyle = '#ff3366';
      if(targetTag && targetTag.id === t.id) ctx.fillStyle = '#00ff88'; // Highlight target
      
      ctx.fillRect(tx - 10, ty - 10, 20, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '10px Roboto Mono';
      ctx.fillText(`Tag ${t.id}`, tx - 15, ty - 15);
    });

    // Draw Heatmap
    heatmap.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x * SCALE, pt.y * SCALE, 15, 0, 2*Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
        ctx.fill();
    });

    // Draw Mission Queue Path
    if (missionQueue.length > 0) {
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(robot.x * SCALE, robot.y * SCALE);
      
      missionQueue.forEach(t => {
          ctx.lineTo(t.x * SCALE, t.y * SCALE);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Update Legend for current target
      const t = missionQueue[0];
      const dx = t.x - robot.x;
      const dy = t.y - robot.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      let angle = Math.atan2(dx, -dy) * (180/Math.PI);
      
      document.getElementById('tgt-name').textContent = t.name;
      document.getElementById('tgt-dist').textContent = `${dist.toFixed(1)}m`;
      document.getElementById('tgt-hdg').textContent = `${angle.toFixed(0)}°`;
    } else {
      document.getElementById('tgt-name').textContent = 'None';
      document.getElementById('tgt-dist').textContent = '0m';
      document.getElementById('tgt-hdg').textContent = '0°';
    }

    // Draw Breadcrumbs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    if (breadcrumbs.length > 1) {
        ctx.beginPath();
        ctx.moveTo(breadcrumbs[0].x * SCALE, breadcrumbs[0].y * SCALE);
        for(let i=1; i<breadcrumbs.length; i++) {
            ctx.lineTo(breadcrumbs[i].x * SCALE, breadcrumbs[i].y * SCALE);
        }
        ctx.stroke();
    }

    // Draw Robot (Rectangle + Arrow)
    const rx = robot.x * SCALE;
    const ry = robot.y * SCALE;
    
    ctx.translate(rx, ry);
    ctx.rotate((robot.heading * Math.PI) / 180);
    
    // FOV Cone
    ctx.fillStyle = 'rgba(0, 210, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 150, -0.6, 0.6); // roughly 70 deg FOV, 150px range
    ctx.lineTo(0, 0);
    ctx.fill();
    
    // Robot Body
    ctx.fillStyle = '#00d2ff';
    if(robot.state === 'Moving to Target') ctx.fillStyle = '#01579b';
    ctx.fillRect(-15, -20, 30, 40);
    
    // Arrow Head (Front)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(-5, -15);
    ctx.lineTo(5, -15);
    ctx.fill();
    
    ctx.restore();
    
    requestAnimationFrame(renderMap);
  }
  
  renderMap();
});
