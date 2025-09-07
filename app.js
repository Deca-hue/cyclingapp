  // App State
        const state = {
            isTracking: false,
            isPaused: false,
            startTime: null,
            pausedTime: 0,
            totalPausedTime: 0,
            currentPosition: null,
            positions: [],
            totalDistance: 0,
            timerInterval: null,
            gpsAvailable: false,
            weight: 70, // Default weight in kg
            unit: 'km', // Default unit
            darkMode: false
        };

        // DOM Elements
        const elements = {
            distance: document.getElementById('distance'),
            duration: document.getElementById('duration'),
            avgSpeed: document.getElementById('avgSpeed'),
            calories: document.getElementById('calories'),
            startBtn: document.getElementById('startBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            stopBtn: document.getElementById('stopBtn'),
            gpsStatus: document.getElementById('gpsStatus'),
            themeToggle: document.getElementById('themeToggle'),
            darkModeToggle: document.getElementById('darkModeToggle'),
            weightInput: document.getElementById('weightInput'),
            unitSelect: document.getElementById('unitSelect'),
            manualDuration: document.getElementById('manualDuration'),
            manualDistance: document.getElementById('manualDistance'),
            ridesList: document.getElementById('ridesList'),
            leaderboardList: document.getElementById('leaderboardList'),
            weeklyDistance: document.getElementById('weeklyDistance'),
            progressBar: document.getElementById('progressBar'),
            installButton: document.getElementById('installButton')
        };

        // Initialize the app
        function initApp() {
            setupManifest();
            loadSettings();
            setupEventListeners();
            checkGPSAvailability();
            updateHistoryList();
            updateLeaderboard();
            registerServiceWorker();
            setupPWAInstall();
        }

        // Set up the web app manifest
        function setupManifest() {
            const manifest = {
                "name": "CycleTracker",
                "short_name": "CycleTracker",
                "description": "A cycling app that tracks your rides with GPS",
                "start_url": "/",
                "display": "standalone",
                "background_color": "#3b82f6",
                "theme_color": "#3b82f6",
                "orientation": "portrait",
                "icons": [
                    {
                        "src": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iOTYiIGN5PSI5NiIgcj0iOTYiIGZpbGw9IiMzYjgzZjYiLz4KICA8cGF0aCBkPSJNMTI4IDcySDEwNFYxMjBINzJWNzJINDBWMTIwQzQwIDEzNC4zMjggNTEuNjcyIDE0NiA2NiAxNDZIMTI2QzE0MC4zMjggMTQ2IDE1MiAxMzQuMzI4IDE1MiAxMjBWOTBDMTUyIDgwLjA1ODQgMTQzLjk0MiA3MiAxMzQgNzJIMTI4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==",
                        "sizes": "192x192",
                        "type": "image/svg+xml"
                    },
                    {
                        "src": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMjU2IiByPSIyNTYiIGZpbGw9IiMzYjgzZjYiLz4KICA8cGF0aCBkPSJNMzQxLjMzMyAyMTBIMjc3LjMzM1YzMjBIMTkyVjIxMEgxMDYuNjY3VjMyMEMxMDYuNjY3IDM1OC4zMDUgMTM3LjYyMiAzOTAgMTc2IDM5MEgzMzZDMzc0LjM3OCAzOTAgNDA1LjMzMyAzNTguMzA1IDQwNS4zMzMgMzIwVjI0MEM0MDUuMzMzIDIyNC43NjIgMzk0LjU3MSAyMTIgMzgxLjMzMyAyMTJIMzQxLjMzM1oiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=",
                        "sizes": "512x512",
                        "type": "image/svg+xml"
                    }
                ]
            };

            const manifestURL = URL.createObjectURL(new Blob([JSON.stringify(manifest)], {type: 'application/json'}));
            document.getElementById('app-manifest').href = manifestURL;
        }

        // Register service worker for PWA functionality
        function registerServiceWorker() {
            if ('serviceWorker' in navigator) {
                const swCode = `
                    self.addEventListener('install', (event) => {
                        event.waitUntil(
                            caches.open('cycler-tracker-v1').then((cache) => {
                                return cache.addAll([
                                    '/',
                                    '/index.html',
                                    '/styles.css',
                                    '/app.js'
                                ]);
                            })
                        );
                    });

                    self.addEventListener('fetch', (event) => {
                        event.respondWith(
                            caches.match(event.request).then((response) => {
                                return response || fetch(event.request);
                            })
                        );
                    });
                `;

                const swBlob = new Blob([swCode], {type: 'application/javascript'});
                const swURL = URL.createObjectURL(swBlob);

                navigator.serviceWorker.register(swURL)
                    .then(() => {
                        console.log('Service Worker registered successfully');
                        document.body.classList.add('sw-ready');
                    })
                    .catch(error => {
                        console.log('Service Worker registration failed:', error);
                    });
            }
        }

        // Set up PWA install prompt
        function setupPWAInstall() {
            let deferredPrompt;
            
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                
                elements.installButton.addEventListener('click', () => {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                        }
                        deferredPrompt = null;
                    });
                });
            });
        }

        // Set up event listeners
        function setupEventListeners() {
            // Tab navigation
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabId = btn.getAttribute('data-tab');
                    switchTab(tabId);
                });
            });

            // Control buttons
            elements.startBtn.addEventListener('click', startRide);
            elements.pauseBtn.addEventListener('click', togglePause);
            elements.stopBtn.addEventListener('click', stopRide);

            // Theme toggle
            elements.themeToggle.addEventListener('click', toggleDarkMode);
            elements.darkModeToggle.addEventListener('change', toggleDarkMode);

            // Settings changes
            elements.weightInput.addEventListener('change', saveSettings);
            elements.unitSelect.addEventListener('change', saveSettings);

            // Data management
            document.getElementById('exportBtn').addEventListener('click', exportData);
            document.getElementById('clearBtn').addEventListener('click', clearData);
        }

        // Check if GPS is available
        function checkGPSAvailability() {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    () => {
                        state.gpsAvailable = true;
                        elements.gpsStatus.innerHTML = '<i class="fas fa-satellite text-green-500"></i><span class="ml-2">GPS signal acquired</span>';
                        document.body.classList.remove('no-gps');
                    },
                    () => {
                        state.gpsAvailable = false;
                        elements.gpsStatus.innerHTML = '<i class="fas fa-satellite text-red-500"></i><span class="ml-2">GPS unavailable - using manual mode</span>';
                        document.body.classList.add('no-gps');
                    }
                );
            } else {
                state.gpsAvailable = false;
                elements.gpsStatus.innerHTML = '<i class="fas fa-satellite text-red-500"></i><span class="ml-2">GPS not supported - using manual mode</span>';
                document.body.classList.add('no-gps');
            }
        }

        // Start a new ride
        function startRide() {
            if (state.isTracking) return;
            
            state.isTracking = true;
            state.startTime = new Date();
            state.positions = [];
            state.totalDistance = 0;
            state.totalPausedTime = 0;
            state.pausedTime = 0;
            
            // Update UI
            elements.startBtn.disabled = true;
            elements.pauseBtn.disabled = false;
            elements.stopBtn.disabled = false;
            elements.startBtn.classList.remove('pulse-animation');
            elements.pauseBtn.classList.remove('opacity-50');
            elements.stopBtn.classList.remove('opacity-50');
            
            // Start timer
            startTimer();
            
            // Start tracking position if GPS available
            if (state.gpsAvailable) {
                state.watchId = navigator.geolocation.watchPosition(
                    updatePosition,
                    handlePositionError,
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                );
            }
        }
// filepath: c:\Users\USER\OneDrive\Desktop\cycling app2.0\app.js
// ...existing code...
let map, mapMarker, mapPolyline;

function initApp() {
    setupManifest();
    loadSettings();
    setupEventListeners();
    checkGPSAvailability();
    updateHistoryList();
    updateLeaderboard();
    registerServiceWorker();
    setupPWAInstall();
    initMap(); // <-- Add this line
}

function initMap() {
    map = L.map('map').setView([51.505, -0.09], 13); // Default center
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    mapPolyline = L.polyline([], { color: 'blue' }).addTo(map);
}

// Update map when position changes
function updatePosition(position) {
    if (!state.isTracking || state.isPaused) return;

    state.currentPosition = position;

    // ...existing code...

    // Update map
    const latlng = [position.coords.latitude, position.coords.longitude];
    if (!mapMarker) {
        mapMarker = L.marker(latlng).addTo(map);
    } else {
        mapMarker.setLatLng(latlng);
    }
    mapPolyline.addLatLng(latlng);
    map.setView(latlng, 16);
    
    // ...existing code...
    updateStats();
}
// ...existing code...
        // Toggle pause/resume
        function togglePause() {
            if (!state.isTracking) return;
            
            if (state.isPaused) {
                // Resume tracking
                state.isPaused = false;
                state.totalPausedTime += (Date.now() - state.pausedTime);
                elements.pauseBtn.innerHTML = '<i class="fas fa-pause-circle text-2xl"></i><span class="ml-2">Pause</span>';
                
                // Resume GPS tracking if available
                if (state.gpsAvailable) {
                    state.watchId = navigator.geolocation.watchPosition(
                        updatePosition,
                        handlePositionError,
                        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                    );
                }
            } else {
                // Pause tracking
                state.isPaused = true;
                state.pausedTime = Date.now();
                elements.pauseBtn.innerHTML = '<i class="fas fa-play-circle text-2xl"></i><span class="ml-2">Resume</span>';
                
                // Stop GPS tracking to save battery
                if (state.gpsAvailable) {
                    navigator.geolocation.clearWatch(state.watchId);
                }
            }
        }

        // Stop the current ride
        function stopRide() {
            if (!state.isTracking) return;
            
            state.isTracking = false;
            
            // Stop GPS tracking
            if (state.gpsAvailable) {
                navigator.geolocation.clearWatch(state.watchId);
            }
            
            // Stop timer
            clearInterval(state.timerInterval);
            
            // Calculate ride stats
            const endTime = new Date();
            const duration = (endTime - state.startTime - state.totalPausedTime) / 1000;
            const avgSpeed = duration > 0 ? state.totalDistance / (duration / 3600) : 0;
            
            // Calculate calories (MET value for cycling = 8)
            const met = 8;
            const caloriesBurned = Math.round(met * state.weight * (duration / 3600));
            
            // If no GPS, use manual input
            let finalDistance = state.totalDistance;
            if (!state.gpsAvailable) {
                finalDistance = parseFloat(elements.manualDistance.value) || 0;
            }
            
            // Save ride to history
            saveRide({
                date: state.startTime.toISOString(),
                duration: duration,
                distance: finalDistance,
                avgSpeed: avgSpeed,
                calories: caloriesBurned,
                positions: state.positions
            });
            
            // Reset UI
            resetUI();
            
            // Update history and leaderboard
            updateHistoryList();
            updateLeaderboard();
        }

        // Update position from GPS
        function updatePosition(position) {
            if (!state.isTracking || state.isPaused) return;
            
            state.currentPosition = position;
            
            // Add to positions array
            if (state.positions.length > 0) {
                const lastPosition = state.positions[state.positions.length - 1];
                const distance = calculateDistance(
                    lastPosition.coords.latitude,
                    lastPosition.coords.longitude,
                    position.coords.latitude,
                    position.coords.longitude
                );
                state.totalDistance += distance;
            }
            
            state.positions.push(position);
            
            // Update UI
            updateStats();
        }

        // Handle GPS errors
        function handlePositionError(error) {
            console.error('GPS Error:', error);
            elements.gpsStatus.innerHTML = `<i class="fas fa-exclamation-triangle text-red-500"></i><span class="ml-2">GPS error: ${error.message}</span>`;
        }

        // Calculate distance between two coordinates (Haversine formula)
        function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // Earth's radius in km
            const dLat = deg2rad(lat2 - lat1);
            const dLon = deg2rad(lon2 - lon1);
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c; // Distance in km
            return state.unit === 'mi' ? distance * 0.621371 : distance;
        }

        function deg2rad(deg) {
            return deg * (Math.PI/180);
        }

        // Start the timer
        function startTimer() {
            clearInterval(state.timerInterval);
            updateStats();
            
            state.timerInterval = setInterval(() => {
                if (!state.isPaused) {
                    updateStats();
                }
            }, 1000);
        }

        // Update statistics display
        function updateStats() {
            const now = new Date();
            const elapsedMs = state.isPaused ? 
                state.pausedTime - state.startTime - state.totalPausedTime : 
                now - state.startTime - state.totalPausedTime;
            
            // Format duration
            const hours = Math.floor(elapsedMs / 3600000);
            const minutes = Math.floor((elapsedMs % 3600000) / 60000);
            const seconds = Math.floor((elapsedMs % 60000) / 1000);
            elements.duration.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Calculate average speed
            const hoursElapsed = elapsedMs / 3600000;
            const avgSpeed = hoursElapsed > 0 ? state.totalDistance / hoursElapsed : 0;
            elements.avgSpeed.textContent = `${avgSpeed.toFixed(1)} ${state.unit}/h`;
            
            // Update distance
            elements.distance.textContent = `${state.totalDistance.toFixed(2)} ${state.unit}`;
            
            // Calculate calories (MET value for cycling = 8)
            const met = 8;
            const caloriesBurned = Math.round(met * state.weight * hoursElapsed);
            elements.calories.textContent = caloriesBurned;
        }

        // Reset UI after ride
        function resetUI() {
            elements.startBtn.disabled = false;
            elements.pauseBtn.disabled = true;
            elements.stopBtn.disabled = true;
            elements.pauseBtn.classList.add('opacity-50');
            elements.stopBtn.classList.add('opacity-50');
            elements.startBtn.classList.add('pulse-animation');
            
            elements.distance.textContent = `0.0 ${state.unit}`;
            elements.duration.textContent = '00:00:00';
            elements.avgSpeed.textContent = `0.0 ${state.unit}/h`;
            elements.calories.textContent = '0';
            
            elements.pauseBtn.innerHTML = '<i class="fas fa-pause-circle text-2xl"></i><span class="ml-2">Pause</span>';
        }

        // Switch between tabs
        function switchTab(tabId) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.add('hidden');
            });
            
            // Show selected tab
            document.getElementById(tabId).classList.remove('hidden');
            
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('tab-active');
            });
            
            document.querySelector(`[data-tab="${tabId}"]`).classList.add('tab-active');
        }

        // Toggle dark mode
        function toggleDarkMode() {
            if (elements.darkModeToggle) {
                state.darkMode = elements.darkModeToggle.checked;
            } else {
                state.darkMode = !state.darkMode;
            }
            
            if (state.darkMode) {
                document.documentElement.classList.add('dark');
                elements.themeToggle.innerHTML = '<i class="fas fa-sun text-yellow-300"></i>';
                if (elements.darkModeToggle) elements.darkModeToggle.checked = true;
            } else {
                document.documentElement.classList.remove('dark');
                elements.themeToggle.innerHTML = '<i class="fas fa-moon text-gray-700"></i>';
                if (elements.darkModeToggle) elements.darkModeToggle.checked = false;
            }
            
            saveSettings();
        }

        // Save ride to history
        function saveRide(rideData) {
            let rides = JSON.parse(localStorage.getItem('cycleTrackerRides') || '[]');
            rides.push(rideData);
            localStorage.setItem('cycleTrackerRides', JSON.stringify(rides));
        }

        // Update ride history list
        function updateHistoryList() {
            const rides = JSON.parse(localStorage.getItem('cycleTrackerRides') || '[]');
            
            if (rides.length === 0) {
                elements.ridesList.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-bicycle text-4xl mb-2"></i>
                        <p>No rides recorded yet</p>
                    </div>
                `;
                return;
            }
            
            elements.ridesList.innerHTML = '';
            rides.reverse().forEach((ride, index) => {
                const rideDate = new Date(ride.date);
                const hours = Math.floor(ride.duration / 3600);
                const minutes = Math.floor((ride.duration % 3600) / 60);
                const seconds = Math.floor(ride.duration % 60);
                
                const rideElement = document.createElement('div');
                rideElement.className = 'neumorph dark:neumorph-dark p-4';
                rideElement.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-bold">${rideDate.toLocaleDateString()}</h3>
                            <p class="text-sm text-gray-500">${rideDate.toLocaleTimeString()}</p>
                        </div>
                        <span class="text-blue-600 dark:text-blue-400 font-bold">${ride.distance.toFixed(2)} ${state.unit}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mt-2 text-sm">
                        <div>
                            <p class="text-gray-500">Time</p>
                            <p>${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Avg Speed</p>
                            <p>${ride.avgSpeed.toFixed(1)} ${state.unit}/h</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Calories</p>
                            <p>${ride.calories}</p>
                        </div>
                    </div>
                `;
                
                elements.ridesList.appendChild(rideElement);
            });
        }

        // Update leaderboard
        function updateLeaderboard() {
            const rides = JSON.parse(localStorage.getItem('cycleTrackerRides') || '[]');
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            // Calculate weekly distance
            const weeklyDistance = rides.reduce((total, ride) => {
                const rideDate = new Date(ride.date);
                return rideDate >= oneWeekAgo ? total + ride.distance : total;
            }, 0);
            
            elements.weeklyDistance.textContent = `${weeklyDistance.toFixed(2)} ${state.unit}`;
            
            // Update progress bar (goal: 50 km/mi)
            const goal = state.unit === 'km' ? 50 : 31; // 50 km or 31 miles
            const progress = Math.min((weeklyDistance / goal) * 100, 100);
            elements.progressBar.style.width = `${progress}%`;
            
            // For demo purposes, create some dummy leaderboard data
            const leaderboardData = [
                { name: "You", distance: weeklyDistance, isCurrentUser: true },
                { name: "Cyclist1", distance: weeklyDistance + 12.3 },
                { name: "BikeRider", distance: weeklyDistance + 8.7 },
                { name: "MountainBiker", distance: weeklyDistance + 5.2 },
                { name: "RoadMaster", distance: weeklyDistance + 18.9 }
            ].sort((a, b) => b.distance - a.distance);
            
            if (leaderboardData.length === 0) {
                elements.leaderboardList.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-trophy text-4xl mb-2"></i>
                        <p>No leaderboard data yet</p>
                    </div>
                `;
                return;
            }
            
            elements.leaderboardList.innerHTML = '';
            leaderboardData.forEach((item, index) => {
                const itemElement = document.createElement('div');
                itemElement.className = `p-3 rounded flex justify-between items-center ${item.isCurrentUser ? 'bg-blue-100 dark:bg-blue-900' : 'neumorph-inset dark:neumorph-inset-dark'}`;
                
                itemElement.innerHTML = `
                    <div class="flex items-center">
                        <span class="font-bold mr-2">${index + 1}.</span>
                        <span>${item.name}</span>
                    </div>
                    <span class="font-bold">${item.distance.toFixed(2)} ${state.unit}</span>
                `;
                
                elements.leaderboardList.appendChild(itemElement);
            });
        }

        // Save app settings
        function saveSettings() {
            const settings = {
                weight: parseInt(elements.weightInput.value) || 70,
                unit: elements.unitSelect.value,
                darkMode: state.darkMode
            };
            
            localStorage.setItem('cycleTrackerSettings', JSON.stringify(settings));
            
            // Update app state
            state.weight = settings.weight;
            state.unit = settings.unit;
            
            // Refresh displays to show updated units
            updateStats();
            updateHistoryList();
            updateLeaderboard();
        }

        // Load saved settings
        function loadSettings() {
            const settings = JSON.parse(localStorage.getItem('cycleTrackerSettings') || '{}');
            
            if (settings.weight) {
                state.weight = settings.weight;
                elements.weightInput.value = settings.weight;
            }
            
            if (settings.unit) {
                state.unit = settings.unit;
                elements.unitSelect.value = settings.unit;
            }
            
            if (settings.darkMode) {
                state.darkMode = settings.darkMode;
                document.documentElement.classList.toggle('dark', state.darkMode);
                elements.themeToggle.innerHTML = state.darkMode ? 
                    '<i class="fas fa-sun text-yellow-300"></i>' : 
                    '<i class="fas fa-moon text-gray-700"></i>';
                
                if (elements.darkModeToggle) {
                    elements.darkModeToggle.checked = state.darkMode;
                }
            }
        }

        // Export ride data
        function exportData() {
            const rides = JSON.parse(localStorage.getItem('cycleTrackerRides') || '[]');
            const dataStr = JSON.stringify(rides, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'cyclerides.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        }

        // Clear all data
        function clearData() {
            if (confirm('Are you sure you want to delete all ride data? This cannot be undone.')) {
                localStorage.removeItem('cycleTrackerRides');
                updateHistoryList();
                updateLeaderboard();
            }
        }

        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', initApp);