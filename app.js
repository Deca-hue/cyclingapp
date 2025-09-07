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
  document.getElementById("distance").innerText=(totalDistance/1000).toFixed(2);


  // Speed + auto pause/resume with debounce
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
}

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
    dist:(totalDistance/1000).toFixed(2),
    max:maxSpeed.toFixed(1),
    avg:(speeds.reduce((a,b)=>a+b,0)/speeds.length).toFixed(1),
    elev:elevationGain.toFixed(0),
    date:new Date().toLocaleString()
  });
  localStorage.setItem("rides",JSON.stringify(rides));
}
function loadHistory() {
  let rides = JSON.parse(localStorage.getItem("rides")||"[]");
  let ul = document.getElementById("ride-history"); ul.innerHTML="";
  rides.forEach(r=>{
    let li=document.createElement("li");
    li.className="bg-gray-800 p-3 rounded";
    li.innerText=`${r.date} | ${r.dist} km | ${r.time} | max ${r.max} km/h`;
    ul.appendChild(li);
  });
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
