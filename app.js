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

// Ride controls
function toggleRide() {
  if (!rideActive) startRide(); else stopRide();
}
function startRide() {
  if (!navigator.geolocation) {
    alert("GPS not supported, manual mode only.");
    return;
  }
  navigator.geolocation.getCurrentPosition(()=>{}, ()=>{alert("Enable location for GPS tracking!");});
  rideActive = true;
  totalDistance = 0; prevPos = null; maxSpeed=0; elevationGain=0; speeds=[];
  routeLine.setLatLngs([]); if(marker) map.removeLayer(marker);
  startTime = Date.now();
  timerInterval = setInterval(updateTime,1000);
  watchId = navigator.geolocation.watchPosition(handlePos, handleError, {enableHighAccuracy:true,maximumAge:1000,timeout:5000});
  document.getElementById("ride-btn").innerText="STOP";
  speak("Ride started");
}
function stopRide() {
  rideActive = false;
  clearInterval(timerInterval);
  navigator.geolocation.clearWatch(watchId);
  saveRide();
  document.getElementById("ride-btn").innerText="START";
  speak("Ride stopped");
}

// Handle GPS position
function handlePos(pos) {
  const {latitude,longitude,altitude,speed,accuracy} = pos.coords;
  document.getElementById("gps-signal").innerText = accuracy<20 ? "Strong" : accuracy<50 ? "Medium" : "Weak";

  // Map update
  let latlng = [latitude,longitude];
  routeLine.addLatLng(latlng);
  map.setView(latlng, 15);
  if(!marker) marker = L.marker(latlng).addTo(map);
  else marker.setLatLng(latlng);

  if(prevPos) {
    const dist = getDistance(prevPos.lat, prevPos.lon, latitude, longitude);
    if(dist>0.5) totalDistance+=dist;
  }
  prevPos = {lat:latitude,lon:longitude};
  document.getElementById("distance").innerText=(totalDistance/1000).toFixed(2);

  if(speed!==null) {
    let kph = speed*3.6;
    speeds.push(kph);
    if(kph>maxSpeed) maxSpeed=kph;
    const avg = speeds.reduce((a,b)=>a+b,0)/speeds.length;
    document.getElementById("speed").innerText=`${kph.toFixed(1)} cur | ${avg.toFixed(1)} avg | ${maxSpeed.toFixed(1)} max`;
    if(kph<1 && rideActive) { // auto-pause
      speak("Ride paused");
      stopRide();
    }
  }
  if(altitude!==null) {
    elevationGain += altitude;
    document.getElementById("elevation").innerText = altitude.toFixed(0);
  }
}
function handleError() {
  document.getElementById("gps-signal").innerText="No Signal";
}

// Timer
function updateTime() {
  let elapsed = Math.floor((Date.now()-startTime)/1000);
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
