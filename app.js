let rideActive = false, startTime, watchId, rideData = {}, timerInterval;
let totalDistance = 0, prevPos = null, maxSpeed = 0, elevationGain = 0, speeds = [];
const synth = window.speechSynthesis;

// Leaflet map
let map = L.map("map").setView([0,0], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);
let routeLine = L.polyline([], {color:"blue", weight:5}).addTo(map);
let marker = null;

// Pages
function showPage(page) {
  ["home","history","stats","settings"].forEach(p=>{
    document.getElementById("page-"+p).classList.add("hidden");
    document.getElementById("nav-"+p).classList.remove("text-blue-400");
  });
  document.getElementById("page-"+page).classList.remove("hidden");
  document.getElementById("nav-"+page).classList.add("text-blue-400");
  if(page==="history") loadHistory();
  if(page==="stats") loadStats();
}
let paused = false;
let pauseTime = 0;
let totalPaused = 0;

// Pause the ride
function pauseRide() {
  if (!rideActive || paused) return;
  paused = true;
  pauseTime = Date.now();
  clearInterval(timerInterval);
  // Do NOT clear geolocation watch here!
 document.getElementById("ride-btn").innerText = "RESUME";
  document.getElementById("status").innerText = "Paused";
  document.getElementById("end-btn").classList.remove("hidden"); 
  speak("Ride paused");
}

// Resume the ride
function resumeRide() {
  if (!rideActive || !paused) return;
  paused = false;
  totalPaused += Date.now() - pauseTime;
  timerInterval = setInterval(updateTime, 1000);
  // No need to re-register watchPosition if it was never cleared
  document.getElementById("ride-btn").innerText = "STOP";
  document.getElementById("status").innerText = "Recording";
  document.getElementById("end-btn").classList.remove("hidden"); 
  speak("Ride resumed");
}

// End the ride
function endRide() {
  if (!rideActive) return;
  rideActive = false;
  paused = false;
  clearInterval(timerInterval);
  navigator.geolocation.clearWatch(watchId);
  saveRide();
  document.getElementById("ride-btn").innerText = "START";
  document.getElementById("status").innerText = "Idle";
  document.getElementById("end-btn").classList.add("hidden");
  speak("Ride ended");
}

// Ride controls
function toggleRide() {
  if (!rideActive) {
    startRide();
  } else if (!paused) {
    pauseRide();
  } else {
    resumeRide();
  }
}
function startRide() {
  if (!navigator.geolocation) {
    alert("GPS not supported, manual mode only.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    ()=>{}, 
    ()=>{alert("Enable location for GPS tracking!");}
  );

  rideActive = true;
  totalDistance = 0; prevPos = null; maxSpeed=0; elevationGain=0; speeds=[];
  routeLine.setLatLngs([]); if(marker) map.removeLayer(marker);
  startTime = Date.now();
  timerInterval = setInterval(updateTime,1000);
  watchId = navigator.geolocation.watchPosition(handlePos, handleError, {enableHighAccuracy:true,maximumAge:1000,timeout:5000});
  document.getElementById("ride-btn").innerText="STOP";
  document.getElementById("status").innerText = "Recording";
  document.getElementById("end-btn").classList.remove("hidden"); 
  speak("Ride started");
}

function stopRide() {
  rideActive = false;
  clearInterval(timerInterval);
  navigator.geolocation.clearWatch(watchId);
  saveRide();
  document.getElementById("ride-btn").innerText="START";
  document.getElementById("end-btn").classList.add("hidden"); 
  speak("Ride stopped");
}

// Handle GPS position
function handlePos(pos) {
    console.log("handlePos called", pos);
  const {latitude,longitude,altitude,speed,accuracy} = pos.coords;
  document.getElementById("gps-signal").innerText = accuracy<20 ? "Strong" : accuracy<50 ? "Medium" : "Weak";

  let latlng = [latitude,longitude];
  routeLine.addLatLng(latlng);
  map.setView(latlng, 15);
  if(!marker) marker = L.marker(latlng).addTo(map);
  else marker.setLatLng(latlng);

  // Distance
  if(prevPos) {
    const dist = getDistance(prevPos.lat, prevPos.lon, latitude, longitude);
    if(dist > 1) totalDistance+=dist; // meters
  }
  // Elevation gain (only count uphill)
  if(altitude !== null) {
    if(prevPos && prevPos.alt !== undefined) {
      const gain = altitude - prevPos.alt;
      if (gain > 0) elevationGain += gain;
    }
    document.getElementById("elevation").innerText = elevationGain.toFixed(0);
  }

  prevPos = {lat:latitude, lon:longitude, alt:altitude};
 document.getElementById("distance").innerText = formatDistance(totalDistance);


  // Speed + auto pause/resume with debounce
  let stillSince = null;
  function handlePos(pos) {
  if(speed !== null) {
    let kph = speed*3.6;
    speeds.push(kph);
    if(kph>maxSpeed) maxSpeed=kph;
    const avg = speeds.reduce((a,b)=>a+b,0)/speeds.length;
    document.getElementById("speed").innerText=`${kph.toFixed(1)} cur | ${avg.toFixed(1)} avg | ${maxSpeed.toFixed(1)} max`;

    if (kph < 1 && rideActive && !paused) {
      if (!stillSince) stillSince = Date.now();
      if (Date.now() - stillSince > 5000) { // 5s threshold
        pauseRide();
      }
    } else if (kph >= 1 && rideActive && paused) {
      stillSince = null;
      resumeRide();
    } else {
      stillSince = null;
    }
  }
}}

function handleError() {
  document.getElementById("gps-signal").innerText="No Signal";
}
// Timer
function updateTime() {
  let elapsed = Math.floor((Date.now()-startTime-totalPaused)/1000);
  let min = String(Math.floor(elapsed/60)).padStart(2,"0");
  let sec = String(elapsed%60).padStart(2,"0");
  document.getElementById("time").innerText=`${min}:${sec}`;
}

// Save & Load
function saveRide() {
  let rides = JSON.parse(localStorage.getItem("rides")||"[]");
  rides.push({
    time:document.getElementById("time").innerText,
    dist:totalDistance,
    max:maxSpeed.toFixed(1),
    avg:(speeds.reduce((a,b)=>a+b,0)/speeds.length).toFixed(1),
    elev:elevationGain.toFixed(0),
    date:new Date().toLocaleString()
  });
  localStorage.setItem("rides",JSON.stringify(rides));
}
function loadHistory() {
  const rides = JSON.parse(localStorage.getItem("rides") || "[]");
  const ul = document.getElementById("ride-history");
  ul.innerHTML = "";

  rides.forEach((r, index) => {
    const li = document.createElement("li");
    li.className =
      "bg-gray-800 p-4 rounded-xl shadow-md flex flex-col md:flex-row md:items-center md:justify-between hover:bg-gray-700 transition mb-3";

    li.innerHTML = `
      <div class="mb-3 md:mb-0">
        <p class="text-lg font-semibold text-blue-400">${r.date}</p>
        <p class="text-sm text-gray-400">${r.type || "Road Ride"}</p>
      </div>

      <div class="flex items-center space-x-6 text-center">
        <div>
          <p class="text-xl font-bold">${r.dist}</p>
          <p class="text-xs text-gray-400">Distance</p>
        </div>
        <div>
          <p class="text-xl font-bold">${r.time}</p>
          <p class="text-xs text-gray-400">Time</p>
        </div>
        <div>
          <p class="text-xl font-bold">${r.max}</p>
          <p class="text-xs text-gray-400">Max km/h</p>
        </div>

        <!-- 🗑️ Delete button -->
        <button
          class="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm"
          onclick="deleteRide(${index})"
          title="Delete ride"
        >
          🗑️
        </button>
      </div>
    `;

    ul.appendChild(li);
  });
}

// Delete a ride by index
function deleteRide(index) {
  const rides = JSON.parse(localStorage.getItem("rides") || "[]");
  const ride = rides[index];

  const confirmDelete = confirm(
    `🗑️ Delete this ride?\n\n📅 ${ride.date}\n📏 ${ride.dist} | 🕒 ${ride.time}`
  );

  if (confirmDelete) {
    rides.splice(index, 1);
    localStorage.setItem("rides", JSON.stringify(rides));
    loadHistory();
  }
}


function loadStats() {
  let rides = JSON.parse(localStorage.getItem("rides")||"[]");
  let dist = rides.reduce((a,b)=>a+parseFloat(b.dist),0);
  document.getElementById("lifetime-stats").innerText=`Total Rides: ${rides.length}, Distance: ${dist.toFixed(2)} km`;
}
function clearHistory(){localStorage.removeItem("rides"); loadHistory();}

// Utils
function getDistance(lat1,lon1,lat2,lon2){
  let R=6371000; let dLat=(lat2-lat1)*Math.PI/180; let dLon=(lon2-lon1)*Math.PI/180;
  let a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function speak(txt){ if(synth) synth.speak(new SpeechSynthesisUtterance(txt)); }

// Init
showPage("home");

// --- PWA install ---
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('hidden');
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.classList.add('hidden');
      }
      deferredPrompt = null;
    }
  });
}

window.addEventListener('appinstalled', () => {
  installBtn.classList.add('hidden');
});

// Settings page functionality
let settings = {
  weight: 70,
  autoPause: true,
  units: "km",
  darkMode: true,
  rideType: "Road"
};

// 🟦 Load settings from localStorage into global + UI
function loadSettings() {
  let saved = JSON.parse(localStorage.getItem("settings") || "{}");
  Object.assign(settings, saved); // merge with defaults

  document.getElementById("weight").value = settings.weight;
  document.getElementById("auto-pause").checked = settings.autoPause;
  document.getElementById("units").value = settings.units;
  document.getElementById("dark-mode").checked = settings.darkMode;
  document.getElementById("ride-type").value = settings.rideType;

  applyDarkMode(settings.darkMode);
}

// 🟦 Save current UI state → global object + localStorage
function saveSettings() {
  settings.weight = Number(document.getElementById("weight").value);
  settings.autoPause = document.getElementById("auto-pause").checked;
  settings.units = document.getElementById("units").value;
  settings.darkMode = document.getElementById("dark-mode").checked;
  settings.rideType = document.getElementById("ride-type").value;

  localStorage.setItem("settings", JSON.stringify(settings));
}

// 🟦 Dark Mode toggle (use Tailwind's `dark:` variants)
function applyDarkMode(enabled) {
  document.documentElement.classList.toggle("dark", enabled);
}

// 🟦 Format distance depending on unit setting
function formatDistance(meters) {
  if (settings.units === "mi") {
    return (meters / 1609.34).toFixed(2) + " mi";
  } else {
    return (meters / 1000).toFixed(2) + " km";
  }
}

// 🟦 Debounce helper for weight input
let saveTimer;
function saveSettingsDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSettings, 300);
}

// 🟦 Attach listeners
document.getElementById("weight").addEventListener("input", saveSettingsDebounced);
document.getElementById("auto-pause").addEventListener("change", saveSettings);
document.getElementById("units").addEventListener("change", saveSettings);
document.getElementById("dark-mode").addEventListener("change", e => {
  applyDarkMode(e.target.checked);
  saveSettings();
});
document.getElementById("ride-type").addEventListener("change", saveSettings);

// 🟦 Load settings when app starts
window.addEventListener("DOMContentLoaded", loadSettings);



//stats page
function loadStats() {
  let rides = JSON.parse(localStorage.getItem("rides") || "[]");
  if (rides.length === 0) {
    document.getElementById("lifetime-stats").innerText = "No rides recorded yet.";
    return;
  }

  let dist = rides.reduce((a, b) => a + parseFloat(b.dist), 0);
  let elev = rides.reduce((a, b) => a + parseFloat(b.elev), 0);
  let max = Math.max(...rides.map(r => parseFloat(r.max)));
  let avg = (rides.reduce((a, b) => a + parseFloat(b.avg), 0) / rides.length).toFixed(1);

  document.getElementById("lifetime-stats").innerText =
    `Total Rides: ${rides.length}, Distance: ${dist.toFixed(2)} km`;

  // Update stat cards
  document.getElementById("stat-distance").innerText = dist.toFixed(2);
  document.getElementById("stat-time").innerText =
    rides.reduce((a, b) => {
      let [m, s] = b.time.split(":").map(Number);
      return a + (m * 60 + s);
    }, 0) + " sec"; // (you can format into hh:mm:ss later)

  document.getElementById("stat-avg").innerText = avg;
  document.getElementById("stat-max").innerText = max.toFixed(1);
  document.getElementById("stat-elev").innerText = elev.toFixed(0);
}
loadSettings();
// --- Service Worker Registration ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // Show update banner
          const banner = document.createElement("div");
          banner.innerHTML = `
            <div class="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg flex items-center space-x-2">
              <span>🚀 New version available</span>
              <button id="reloadBtn" class="bg-white text-blue-600 px-2 py-1 rounded">Reload</button>
            </div>
          `;
          document.body.appendChild(banner);

          document.getElementById("reloadBtn").onclick = () => {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          };
        }
      });
    });

    // Force reload after SW takes control
    let refreshing;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      window.location.reload();
      refreshing = true;
    });
  });
}

// Update year in footer
document.getElementById("year").innerText = new Date().getFullYear();

// --- service-worker.js ---
