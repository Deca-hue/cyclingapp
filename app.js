/* RideFlow — combined: map + gps + auto-pause + voice + tabs + responsive big-stats */
(() => {
  // --- UI refs (main) ---
  const navHome = document.getElementById('navHome');
  const navHistory = document.getElementById('navHistory');
  const navStats = document.getElementById('navStats');
  const navSettings = document.getElementById('navSettings');

  const homeSection = document.getElementById('homeSection');
  const historySection = document.getElementById('historySection');
  const statsSection = document.getElementById('statsSection');
  const settingsSection = document.getElementById('settingsSection');

  const statusEl = document.getElementById('status');
  const modeLabel = document.getElementById('modeLabel');
  const gpsSignalText = document.getElementById('gpsSignalText');
  const gpsSignalBullets = document.getElementById('gpsSignalBullets');

  // small stat boxes
  const statDistance = document.getElementById('statDistance');
  const statDuration = document.getElementById('statDuration');
  const statElevation = document.getElementById('statElevation');
  const statSpeedCur = document.getElementById('statSpeedCur');
  const statSpeedAvg = document.getElementById('statSpeedAvg');
  const statSpeedMax = document.getElementById('statSpeedMax');

  // big stats
  const metricTabs = Array.from(document.querySelectorAll('.metric-tab'));
  const metricPanels = {
    distance: document.getElementById('metric-distance'),
    time: document.getElementById('metric-time'),
    speeds: document.getElementById('metric-speeds'),
    elevation: document.getElementById('metric-elevation'),
  };
  const bigDistance = document.getElementById('bigDistance');
  const bigTime = document.getElementById('bigTime');
  const bigCurSpeed = document.getElementById('bigCurSpeed');
  const bigAvgSpeed = document.getElementById('bigAvgSpeed');
  const bigMaxSpeed = document.getElementById('bigMaxSpeed');
  const bigElevation = document.getElementById('bigElevation');

  // controls
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const historyList = document.getElementById('historyList');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const userWeight = document.getElementById('userWeight');
  const themeSwitch = document.getElementById('themeSwitch');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');

  // --- Map init ---
  const map = L.map('map', { zoomControl: true, attributionControl: false });
  const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  try { map.setView([0,0], 2); } catch(e){}

  // --- State ---
  let watchId = null;
  let recording = false;
  let paused = false;
  let startTime = null;
  let elapsedMs = 0;
  let distanceMeters = 0;
  let lastPos = null;
  let points = [];
  let polyline = L.polyline([], { color: "#06b6d4", weight: 5 }).addTo(map);
  let marker = null;
  let maxSpeed = 0;
  let elevationGain = 0;
  let lastElevation = null;
  let pausedAt = null;
  let totalPausedMs = 0;
  let lowSpeedSince = null;
  let nextVoiceKm = 1;
  const STORAGE_KEY = "rideflow_v2_history";

  // --- Helpers ---
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = navigator.language || 'en-US';
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
  };

  const toHMS = (ms) => {
    const sec = Math.floor(ms/1000);
    const h = String(Math.floor(sec/3600)).padStart(2,'0');
    const m = String(Math.floor((sec%3600)/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    return `${h}:${m}:${s}`;
  };

  const haversine = (a, b) => {
    const R = 6371000;
    const toRad = (d) => d * Math.PI/180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  function signalLevel(acc) {
    if (acc == null) return 0;
    if (acc <= 8) return 3;
    if (acc <= 25) return 2;
    return 1;
  }
  function renderSignal(acc) {
    gpsSignalText.textContent = (acc == null ? "-" : `${Math.round(acc)} m`);
    const level = acc == null ? 0 : signalLevel(acc);
    gpsSignalBullets.innerHTML = "";
    for (let i=1;i<=3;i++) {
      const span = document.createElement("span");
      span.className = "signal-bullet";
      if (i <= level) {
        span.style.background = (level===3? "#34d399" : level===2? "#fbbf24" : "#f87171");
      } else {
        span.style.background = "rgba(255,255,255,0.12)";
      }
      gpsSignalBullets.appendChild(span);
    }
  }

  const updateSmallUI = (curSpeed) => {
    statDistance.textContent = (distanceMeters/1000).toFixed(2);
    statDuration.textContent = toHMS(elapsedMs);
    statElevation.textContent = Math.round(elevationGain);
    statSpeedCur.textContent = (curSpeed || 0).toFixed(1);
    const hours = elapsedMs / 3600000;
    const avg = hours > 0 ? (distanceMeters/1000) / hours : 0;
    statSpeedAvg.textContent = avg.toFixed(1);
    statSpeedMax.textContent = maxSpeed.toFixed(1);
  };

  const updateBigUI = (curSpeed) => {
    bigDistance.textContent = (distanceMeters/1000).toFixed(2);
    bigTime.textContent = toHMS(elapsedMs);
    bigElevation.textContent = Math.round(elevationGain);
    bigCurSpeed.textContent = (curSpeed || 0).toFixed(1);
    const hours = elapsedMs / 3600000;
    const avg = hours > 0 ? (distanceMeters/1000) / hours : 0;
    bigAvgSpeed.textContent = avg.toFixed(1);
    bigMaxSpeed.textContent = maxSpeed.toFixed(1);
  };

  const setActiveNav = (activeBtn) => {
    [navHome, navHistory, navStats, navSettings].forEach(b => b.classList.remove('tab-active'));
    activeBtn.classList.add('tab-active');
  };

  const showSection = (section) => {
    // hide all
    [homeSection, historySection, statsSection, settingsSection].forEach(s => s.classList.add('hidden'));
    // show chosen
    section.classList.remove('hidden');
    // fix map sizing when returning to home
    if (section === homeSection) {
      setTimeout(()=>{ try { map.invalidateSize(); if (polyline && polyline.getLatLngs().length) map.fitBounds(polyline.getBounds(), { padding:[40,40] }); } catch(e){} }, 220);
    }
  };

  // metric tab switching
  let currentMetric = 'distance';
  const showMetric = (m) => {
    currentMetric = m;
    metricTabs.forEach(t => t.classList.remove('tab-active'));
    metricTabs.filter(t=>t.dataset.metric===m).forEach(t=>t.classList.add('tab-active'));
    Object.keys(metricPanels).forEach(k => {
      metricPanels[k].classList.toggle('hidden', k !== m);
    });
    // update big UI immediately
    updateBigUI();
  };

  // Attach nav handlers
  navHome.addEventListener('click', ()=>{ setActiveNav(navHome); showSection(homeSection); });
  navHistory.addEventListener('click', ()=>{ setActiveNav(navHistory); showSection(historySection); });
  navStats.addEventListener('click', ()=>{ setActiveNav(navStats); showSection(statsSection); });
  navSettings.addEventListener('click', ()=>{ setActiveNav(navSettings); showSection(settingsSection); });

  metricTabs.forEach(t => {
    t.addEventListener('click', (ev) => showMetric(ev.currentTarget.dataset.metric));
  });

  // --- GPS handlers & recording ---
  const AUTO_PAUSE_SPEED_KMH = 1.2;
  const AUTO_PAUSE_DELAY_MS = 9000;

  function onPosition(pos) {
    const c = pos.coords;
    renderSignal(c.accuracy);

    // first fix handling when not recording: center map
    if (!lastPos && !recording) {
      try { map.setView([c.latitude, c.longitude], 16); } catch(e){}
      statusEl.textContent = "GPS acquired (ready).";
      modeLabel.textContent = "GPS";
    }

    if (!recording) return;

    const now = Date.now();
    const cur = { lat: c.latitude, lon: c.longitude, t: now, alt: (c.altitude == null ? null : c.altitude), speed: (c.speed != null ? c.speed*3.6 : null), acc: c.accuracy };

    // first recorded sample
    if (!lastPos) {
      lastPos = cur;
      points = [cur];
      polyline.setLatLngs([[cur.lat, cur.lon]]);
      if (marker) map.removeLayer(marker);
      marker = L.circleMarker([cur.lat, cur.lon], { radius:6, color:"#06b6d4", fill:true }).addTo(map);
      map.panTo([cur.lat, cur.lon]);
      statusEl.textContent = "Recording — GPS fix.";
      speak("GPS fix. Recording started.");
      return;
    }

    // distance & filtering jitter
    const d = haversine({lat:lastPos.lat, lon:lastPos.lon}, {lat:cur.lat, lon:cur.lon});
    const minMove = Math.max(2, cur.acc ? cur.acc / 2 : 3);
    if (d > minMove) {
      distanceMeters += d;
      polyline.addLatLng([cur.lat, cur.lon]);
      points.push(cur);
      lastPos = cur;
      if (marker) marker.setLatLng([cur.lat, cur.lon]); else marker = L.circleMarker([cur.lat, cur.lon], { radius:6, color:"#06b6d4", fill:true }).addTo(map);
      // keep map following on mobile; on large screens the user can pan
      if (window.innerWidth < 900) map.panTo([cur.lat, cur.lon], { animate:true });
    }

    // speed & max
    const curSpeed = cur.speed != null ? cur.speed : 0;
    if (curSpeed > maxSpeed) maxSpeed = curSpeed;

    // elevation (gain)
    if (cur.alt != null) {
      if (lastElevation != null && cur.alt > lastElevation + 1) elevationGain += (cur.alt - lastElevation);
      lastElevation = cur.alt;
    }

    // auto-pause logic
    if (curSpeed < AUTO_PAUSE_SPEED_KMH) {
      if (!lowSpeedSince) lowSpeedSince = now;
      else if (!paused && (now - lowSpeedSince) >= AUTO_PAUSE_DELAY_MS) {
        paused = true;
        pausedAt = now;
        statusEl.textContent = "Auto-paused (no movement) ⏸";
        speak("Auto paused");
      }
    } else {
      lowSpeedSince = null;
      if (paused) {
        paused = false;
        if (pausedAt) totalPausedMs += (now - pausedAt);
        pausedAt = null;
        statusEl.textContent = "Resumed ▶️";
        speak("Ride resumed");
      }
    }

    // per-km announce
    const kms = distanceMeters / 1000;
    if (kms >= nextVoiceKm) {
      const hours = (Date.now() - startTime - totalPausedMs) / 3600000;
      const avg = hours > 0 ? (distanceMeters/1000)/hours : 0;
      speak(`Completed ${Math.floor(kms)} kilometers. Average ${avg.toFixed(1)} kilometers per hour.`);
      nextVoiceKm = Math.floor(kms) + 1;
    }

    // elapsed & UI update
    elapsedMs = Date.now() - startTime - totalPausedMs;
    updateSmallUI(curSpeed);
    updateBigUI(curSpeed);
  }

  function onError(err) {
    console.warn('Geolocation error', err);
    statusEl.textContent = "GPS error or denied";
    modeLabel.textContent = "Manual (GPS denied)";
    renderSignal(null);
  }

  function startRecording() {
    if (!('geolocation' in navigator)) {
      alert("Geolocation not supported.");
      return;
    }
    // reset state
    recording = true;
    paused = false;
    points = [];
    distanceMeters = 0;
    maxSpeed = 0;
    elevationGain = 0;
    lastElevation = null;
    startTime = Date.now();
    totalPausedMs = 0;
    lastPos = null;
    polyline.setLatLngs([]);
    if (marker) { map.removeLayer(marker); marker = null; }
    statusEl.textContent = "Searching for GPS fix…";
    modeLabel.textContent = "GPS";
    nextVoiceKm = 1;
    // start watch
    watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy:true, maximumAge:1000, timeout:8000
    });
    // ensure Home is visible
    setActiveNav(navHome);
    showSection(homeSection);
    speak("Starting ride");
  }

  function pauseManual() {
    if (!recording || paused) return;
    paused = true;
    pausedAt = Date.now();
    statusEl.textContent = "Paused ⏸";
    speak("Ride paused");
  }
  function resumeManual() {
    if (!recording || !paused) return;
    paused = false;
    if (pausedAt) { totalPausedMs += (Date.now() - pausedAt); pausedAt = null; }
    statusEl.textContent = "Recording ▶️";
    speak("Ride resumed");
  }

  function stopRecording() {
    if (!recording) return;
    recording = false;
    if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    elapsedMs = Date.now() - startTime - totalPausedMs;
    const kms = (distanceMeters/1000);
    const hours = elapsedMs/3600000;
    const avg = hours > 0 ? kms / hours : 0;
    speak(`Ride ended. ${kms.toFixed(2)} kilometers. Average ${avg.toFixed(1)} kilometers per hour.`);
    statusEl.textContent = "Ride ended 🏁";

    // Save ride (summary + points)
    const ride = {
      id: Date.now(),
      date: new Date().toISOString(),
      distance_km: Number(kms.toFixed(2)),
      duration_s: Math.round(elapsedMs/1000),
      avg_kmh: Number(avg.toFixed(1)),
      max_kmh: Number(maxSpeed.toFixed(1)),
      elevation_m: Math.round(elevationGain),
      points: points.map(p => ({lat:p.lat, lon:p.lon, t:p.t, alt:p.alt}))
    };
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    history.unshift(ride);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory();
    // show summary on Stats
    setActiveNav(navStats);
    showSection(statsSection);
    showMetric('distance');
    updateBigUI();
  }

  // --- History display & actions ---
  function renderHistory() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    historyList.innerHTML = "";
    if (!history.length) {
      historyList.innerHTML = `<div class="opacity-70 text-xs">No rides recorded yet.</div>`;
      return;
    }
    history.forEach(r => {
      const el = document.createElement('div');
      el.className = "bg-white/5 p-2 rounded text-xs";
      const dur = toHMS(r.duration_s * 1000);
      el.innerHTML = `<div class="font-semibold">${new Date(r.date).toLocaleString()}</div>
        <div class="opacity-80 mt-1">${r.distance_km} km • ${dur} • Avg ${r.avg_kmh} km/h • Max ${r.max_kmh} km/h • ${r.elevation_m} m</div>
        <div class="mt-2 flex gap-2">
          <button class="viewBtn px-2 py-1 rounded bg-cyan-500 text-slate-900 text-xs">View</button>
          <button class="downloadBtn px-2 py-1 rounded bg-white/10 text-xs">Download GPX</button>
        </div>`;
      el.querySelector('.viewBtn').addEventListener('click', () => {
        if (!r.points || !r.points.length) return alert("No points for this ride.");
        const latlngs = r.points.map(p => [p.lat, p.lon]);
        polyline.setLatLngs(latlngs);
        map.fitBounds(polyline.getBounds(), { padding:[40,40] });
        setActiveNav(navHome);
        showSection(homeSection);
      });
      el.querySelector('.downloadBtn').addEventListener('click', () => {
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="RideFlow">\n<trk><name>Ride ${new Date(r.date).toLocaleString()}</name><trkseg>\n`;
        r.points.forEach(p => {
          const time = new Date(p.t).toISOString();
          gpx += `<trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.alt ?? 0}</ele><time>${time}</time></trkpt>\n`;
        });
        gpx += `</trkseg></trk>\n</gpx>`;
        const blob = new Blob([gpx], {type: 'application/gpx+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `ride-${r.id}.gpx`; a.click();
        URL.revokeObjectURL(url);
      });
      historyList.appendChild(el);
    });
  }

  exportBtn.addEventListener('click', () => {
    const data = localStorage.getItem(STORAGE_KEY) || "[]";
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rideflow_history.json'; a.click();
    URL.revokeObjectURL(url);
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm("Clear local history?")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  });

  downloadAllBtn.addEventListener('click', () => {
    // download single zip-like JSON containing all rides' GPX (simple: one ZIP file is more work; we will export JSON of rides)
    const data = localStorage.getItem(STORAGE_KEY) || "[]";
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rideflow_all_rides.json'; a.click();
    URL.revokeObjectURL(url);
  });

  clearAllBtn.addEventListener('click', () => {
    if (!confirm("Delete ALL saved rides and settings?")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('rideflow_v2_settings');
    renderHistory();
  });

  // Settings persist
  userWeight.addEventListener('change', () => {
    const s = JSON.parse(localStorage.getItem('rideflow_v2_settings')||'{}');
    s.weightKg = Number(userWeight.value || 70);
    localStorage.setItem('rideflow_v2_settings', JSON.stringify(s));
  });
  themeSwitch.addEventListener('change', () => {
    const s = JSON.parse(localStorage.getItem('rideflow_v2_settings')||'{}');
    s.lightMode = themeSwitch.checked;
    localStorage.setItem('rideflow_v2_settings', JSON.stringify(s));
    document.documentElement.classList.toggle('light', themeSwitch.checked);
  });

  // Buttons
  startBtn.addEventListener('click', startRecording);
  pauseBtn.addEventListener('click', pauseManual);
  resumeBtn.addEventListener('click', resumeManual);
  stopBtn.addEventListener('click', stopRecording);

  // Metric tab default
  showMetric('distance');

  // load history & settings on init
  (function init() {
    renderHistory();
    // load settings
    const s = JSON.parse(localStorage.getItem('rideflow_v2_settings')||'{}');
    userWeight.value = s.weightKg ?? 70;
    themeSwitch.checked = !!s.lightMode;
    if (s.lightMode) document.documentElement.classList.add('light');

    // permissions check
    if (!('geolocation' in navigator)) {
      modeLabel.textContent = "Manual (no geolocation)";
      statusEl.textContent = "Geolocation not supported.";
      renderSignal(null);
    } else {
      try {
        navigator.permissions.query({name:'geolocation'}).then(p => {
          if (p.state === 'denied') { modeLabel.textContent = "Manual (GPS denied)"; statusEl.textContent = "GPS permission denied."; renderSignal(null); }
          else { modeLabel.textContent = "GPS"; statusEl.textContent = "Ready. Press Start."; }
          p.onchange = () => { modeLabel.textContent = p.state==='denied' ? "Manual (GPS denied)" : "GPS"; };
        });
      } catch(e) { modeLabel.textContent = "GPS"; statusEl.textContent = "Ready. Press Start."; }
    }
    // make sure map sizes on load
    setTimeout(()=>{ try { map.invalidateSize(); } catch(e){} }, 300);
  })();

})();
