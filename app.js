let map, ridePolyline;
let watchId, startTime, elapsedTime = 0;
let distance = 0, lastCoords = null;
let isRiding = false, isPaused = false;
let speeds = [], maxSpeed = 0;
let deferredPrompt = null;

// Initialize map
document.addEventListener("DOMContentLoaded", () => {
  map = L.map("map").setView([0, 0], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OSM contributors'
  }).addTo(map);

  ridePolyline = L.polyline([], { color: "lime" }).addTo(map);
});

// Prompt for GPS
function requestGPS() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
    enableHighAccuracy: true,
    maximumAge: 1000
  });
}

// Update position
function updatePosition(pos) {
  const { latitude, longitude, altitude, accuracy, speed } = pos.coords;

  document.getElementById("gps").textContent =
    accuracy < 20 ? "Strong" : accuracy < 50 ? "Medium" : "Weak";

  if (!isRiding || isPaused) return;

  const latlng = [latitude, longitude];
  ridePolyline.addLatLng(latlng);
  map.setView(latlng, 16);

  if (lastCoords) {
    const d = map.distance(lastCoords, latlng) / 1000;
    distance += d;
    document.getElementById("distance").textContent = distance.toFixed(2) + " km";
  }
  lastCoords = latlng;

  // Time
  elapsedTime = (Date.now() - startTime) / 1000;
  document.getElementById("time").textContent = formatTime(elapsedTime);

  // Speed
  const currentSpeed = (speed || 0) * 3.6; // m/s → km/h
  if (currentSpeed > 0.5) {
    speeds.push(currentSpeed);
    if (currentSpeed > maxSpeed) maxSpeed = currentSpeed;
  }
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b) / speeds.length : 0;
  document.getElementById("speed").textContent = currentSpeed.toFixed(1) + " km/h";
  document.getElementById("avgSpeed").textContent = avgSpeed.toFixed(1) + " km/h";
  document.getElementById("maxSpeed").textContent = maxSpeed.toFixed(1) + " km/h";

  // Elevation
  document.getElementById("elevation").textContent = altitude ? altitude.toFixed(1) + " m" : "N/A";

  // Auto-pause
  if (currentSpeed < 1) {
    pauseRide();
  } else if (isPaused) {
    resumeRide();
  }
}

// Start Ride
document.getElementById("startBtn").addEventListener("click", () => {
  resetRide();
  startTime = Date.now();
  isRiding = true;
  requestGPS();
  speak("Ride started");
});

// Pause Ride
document.getElementById("pauseBtn").addEventListener("click", () => {
  pauseRide();
  speak("Ride paused");
});

// Resume Ride
document.getElementById("resumeBtn").addEventListener("click", () => {
  resumeRide();
  speak("Ride resumed");
});

// End Ride
document.getElementById("endBtn").addEventListener("click", () => {
  stopRide();
  speak("Ride ended");
});

// Install PWA
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
document.getElementById("installBtn").addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});

// Helpers
function resetRide() {
  distance = 0;
  speeds = [];
  maxSpeed = 0;
  elapsedTime = 0;
  ridePolyline.setLatLngs([]);
}

function pauseRide() {
  isPaused = true;
}

function resumeRide() {
  if (isRiding) isPaused = false;
}

function stopRide() {
  isRiding = false;
  navigator.geolocation.clearWatch(watchId);
}

function handleError(err) {
  alert("GPS error: " + err.message);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function speak(text) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }
}
