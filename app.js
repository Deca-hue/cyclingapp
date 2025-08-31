 // App state
        let isTracking = false;
        let isPaused = false;
        let startTime = null;
        let pausedTime = 0;
        let timerInterval = null;
        let totalDistance = 0;
        let currentSpeed = 0;
        let maxSpeed = 0;
        let lastPosition = null;
        let positionHistory = [];
        let watchId = null;
        let voiceEnabled = false;
        let voiceVolume = 0.7;
        let speechSynth = window.speechSynthesis;
        let currentTheme = 'light';
        
        // DOM Elements
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const endBtn = document.getElementById('end-btn');
        const distanceEl = document.getElementById('distance');
        const durationEl = document.getElementById('duration');
        const speedEl = document.getElementById('speed');
        const caloriesEl = document.getElementById('calories');
        const avgSpeedEl = document.getElementById('avg-speed');
        const maxSpeedEl = document.getElementById('max-speed');
        const paceEl = document.getElementById('pace');
        const elevationEl = document.getElementById('elevation');
        const gpsStatusEl = document.getElementById('gps-status');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsPanel = document.getElementById('settings-panel');
        const deviceTypeSelect = document.getElementById('device-type');
        const gpsModeSelect = document.getElementById('gps-mode');
        const historyBtn = document.getElementById('history-btn');
        const historyPanel = document.getElementById('history-panel');
        const closeHistoryBtn = document.getElementById('close-history');
        const historyList = document.getElementById('history-list');
        const themeToggle = document.getElementById('theme-toggle');
        const voiceBtn = document.getElementById('voice-btn');
        const voiceGuidanceCheckbox = document.getElementById('voice-guidance');
        const voiceVolumeSlider = document.getElementById('voice-volume');
        const testVoiceBtn = document.getElementById('test-voice');
        const mapContainer = document.getElementById('map-container');
        const mapPlaceholder = document.getElementById('map-placeholder');
        
        // Check if device is a smartwatch (simplified)
        function checkIfSmartwatch() {
            return window.screen.width < 400 || window.screen.height < 400 || 
                   navigator.userAgent.includes('Watch') || 
                   deviceTypeSelect.value === 'watch';
        }
        
        // Apply device-specific optimizations
        function applyDeviceOptimizations() {
            if (checkIfSmartwatch()) {
                document.body.classList.add('watch-optimized');
                document.body.classList.remove('mobile-optimized');
                // Simplify UI for watch
                document.querySelectorAll('p, span, button').forEach(el => {
                    el.classList.add('text-sm');
                });
            } else {
                document.body.classList.add('mobile-optimized');
                document.body.classList.remove('watch-optimized');
            }
        }
        
        // Initialize the app
        function initApp() {
            applyDeviceOptimizations();
            loadRideHistory();
            
            // Check if Geolocation is available
            if (!navigator.geolocation) {
                gpsStatusEl.textContent = 'GPS: Not Supported';
                startBtn.disabled = true;
                return;
            }
            
            // Try to get current position to test GPS
            navigator.geolocation.getCurrentPosition(
                () => gpsStatusEl.textContent = 'GPS: Ready',
                () => gpsStatusEl.textContent = 'GPS: Error'
            );
            
            // Check if speech synthesis is supported
            if (!speechSynth) {
                voiceGuidanceCheckbox.disabled = true;
                voiceBtn.disabled = true;
                voiceGuidanceCheckbox.parentElement.innerHTML += '<span class="text-red-500 text-sm"> (Not supported)</span>';
            }
            
            // Set up theme from localStorage or system preference
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                enableDarkMode();
            } else {
                enableLightMode();
            }
        }
        
        // Enable dark mode
        function enableDarkMode() {
            document.documentElement.classList.add('dark');
            themeToggle.checked = true;
            currentTheme = 'dark';
            localStorage.theme = 'dark';
        }
        
        // Enable light mode
        function enableLightMode() {
            document.documentElement.classList.remove('dark');
            themeToggle.checked = false;
            currentTheme = 'light';
            localStorage.theme = 'light';
        }
        
        // Calculate distance between two coordinates (Haversine formula)
        function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }
        
        // Format time
        function formatTime(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Format date for history
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        
        // Calculate calories (simplified)
        function calculateCalories(distance, time) {
            // Rough estimate: 30 calories per km
            return Math.round(distance * 30);
        }
        
        // Update stats display
        function updateStats() {
            const currentTime = new Date();
            const elapsedTime = isPaused ? pausedTime : currentTime - startTime - pausedTime;
            
            distanceEl.textContent = totalDistance.toFixed(2);
            durationEl.textContent = formatTime(elapsedTime);
            speedEl.textContent = currentSpeed.toFixed(1);
            caloriesEl.textContent = calculateCalories(totalDistance, elapsedTime);
            
            // Calculate average speed
            const hours = elapsedTime / 3600000; // convert ms to hours
            const avgSpeed = hours > 0 ? totalDistance / hours : 0;
            avgSpeedEl.textContent = avgSpeed.toFixed(1);
            
            // Update max speed
            maxSpeedEl.textContent = maxSpeed.toFixed(1);
            
            // Calculate pace (min/km)
            const pace = totalDistance > 0 ? (elapsedTime / 1000) / 60 / totalDistance : 0;
            const paceMin = Math.floor(pace);
            const paceSec = Math.floor((pace - paceMin) * 60);
            paceEl.textContent = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
        }
        
        // Start tracking
        function startTracking() {
            if (isTracking && !isPaused) return;
            
            // If resuming from pause
            if (isPaused) {
                isPaused = false;
                startTime = new Date(new Date() - pausedTime);
                pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i> Pause';
                pauseBtn.classList.remove('bg-green-500');
                pauseBtn.classList.add('bg-yellow-500');
                
                if (voiceEnabled) {
                    speak("Ride resumed");
                }
            } else {
                // Starting fresh ride
                isTracking = true;
                startTime = new Date();
                totalDistance = 0;
                maxSpeed = 0;
                positionHistory = [];
                pausedTime = 0;
                
                // UI updates
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                endBtn.disabled = false;
                startBtn.classList.remove('bg-secondary-light', 'dark:bg-secondary-dark');
                startBtn.classList.add('bg-gray-400');
                pauseBtn.classList.remove('opacity-50');
                endBtn.classList.remove('opacity-50');
                
                if (voiceEnabled) {
                    speak("Ride started");
                }
            }
            
            // Start timer
            timerInterval = setInterval(updateStats, 1000);
            
            // Start GPS tracking with selected mode
            const options = {
                enableHighAccuracy: gpsModeSelect.value === 'high',
                maximumAge: gpsModeSelect.value === 'low' ? 10000 : 5000,
                timeout: gpsModeSelect.value === 'low' ? 10000 : 5000
            };
            
            watchId = navigator.geolocation.watchPosition(
                positionSuccess,
                positionError,
                options
            );
            
            // Add recording animation to map container
            mapContainer.classList.add('recording');
        }
        
        // Pause tracking
        function pauseTracking() {
            if (!isTracking || isPaused) return;
            
            isPaused = true;
            pausedTime = new Date() - startTime;
            
            // UI updates
            pauseBtn.innerHTML = '<i class="fas fa-play mr-2"></i> Resume';
            pauseBtn.classList.remove('bg-yellow-500');
            pauseBtn.classList.add('bg-green-500');
            
            // Stop timer and GPS
            clearInterval(timerInterval);
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            
            // Remove recording animation
            mapContainer.classList.remove('recording');
            
            if (voiceEnabled) {
                speak("Ride paused");
            }
        }
        
        // End tracking and save ride
        function endTracking() {
            if (!isTracking) return;
            
            isTracking = false;
            isPaused = false;
            
            // UI updates
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            endBtn.disabled = true;
            startBtn.classList.add('bg-secondary-light', 'dark:bg-secondary-dark');
            startBtn.classList.remove('bg-gray-400');
            pauseBtn.classList.add('opacity-50');
            endBtn.classList.add('opacity-50');
            pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i> Pause';
            pauseBtn.classList.remove('bg-green-500');
            pauseBtn.classList.add('bg-yellow-500');
            
            // Stop timer and GPS
            clearInterval(timerInterval);
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            
            // Remove recording animation
            mapContainer.classList.remove('recording');
            
            // Save ride to history
            saveRide();
            
            if (voiceEnabled) {
                speak("Ride completed. Distance " + totalDistance.toFixed(1) + " kilometers");
            }
            
            // Reset stats
            totalDistance = 0;
            currentSpeed = 0;
            maxSpeed = 0;
            updateStats();
            
            // Clear map
            clearMap();
        }
        
        // Handle successful position retrieval
        function positionSuccess(position) {
            const { latitude, longitude, accuracy, speed, altitude } = position.coords;
            
            // Update GPS status with accuracy info
            let accuracyStatus = 'High';
            let statusClass = 'gps-accuracy-high';
            
            if (accuracy > 50) {
                accuracyStatus = 'Low';
                statusClass = 'gps-accuracy-low';
            } else if (accuracy > 20) {
                accuracyStatus = 'Medium';
                statusClass = 'gps-accuracy-medium';
            }
            
            gpsStatusEl.innerHTML = `GPS: ${accuracyStatus} (${Math.round(accuracy)}m)`;
            gpsStatusEl.className = 'text-xs px-2 py-1 rounded-full ' + statusClass;
            
            // Update current speed (convert m/s to km/h)
            currentSpeed = speed !== null ? speed * 3.6 : 0;
            
            // Update max speed
            if (currentSpeed > maxSpeed) {
                maxSpeed = currentSpeed;
            }
            
            // Calculate distance if we have a previous position
            if (lastPosition) {
                const distance = calculateDistance(
                    lastPosition.latitude,
                    lastPosition.longitude,
                    latitude,
                    longitude
                );
                
                // Only add distance if it's reasonable (filter out GPS jumps)
                if (distance < 0.5) { // Filter distances > 500m as likely GPS errors
                    totalDistance += distance;
                    
                    // Auto-pause if enabled and speed is very low
                    const autoPauseEnabled = document.getElementById('auto-pause').checked;
                    if (autoPauseEnabled && 
                        currentSpeed < 1 &&
                         isTracking && !isPaused) {
                        pauseTracking();
                    }
                }
            }
            
            // Store current position
            lastPosition = { latitude, longitude };
            positionHistory.push({
                lat: latitude,
                lng: longitude,
                timestamp: Date.now()
            });
            
            // Update elevation if available
            if (altitude !== null) {
                elevationEl.textContent = Math.round(altitude);
            }
            
            // Update map visualization
            updateMapPosition(latitude, longitude);
            
            // Voice updates every kilometer
            if (voiceEnabled && Math.floor(totalDistance) > Math.floor(totalDistance - calculateDistance(
                lastPosition.latitude,
                lastPosition.longitude,
                latitude,
                longitude
            ))) {
                speak(`You have cycled ${Math.floor(totalDistance)} kilometers`);
            }
        }
        
        // Handle position errors
        function positionError(error) {
            console.error('Geolocation error:', error);
            let message = 'Unknown error';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Permission denied';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Position unavailable';
                    break;
                case error.TIMEOUT:
                    message = 'Request timeout';
                    // For weak GPS devices, we might want to continue with last known position
                    break;
            }
            
            gpsStatusEl.textContent = `GPS: Error - ${message}`;
            gpsStatusEl.className = 'text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full';
        }
        
        // Update map position visualization
       function updateMapPosition(lat, lng) {
    // Hide placeholder after first position
    if (mapPlaceholder.style.display !== 'none') {
        mapPlaceholder.style.display = 'none';
    }

    // Convert lat/lng to pixel coordinates (simulated)
    const x = 50 + (lng * 1000 % 90);
    const y = 50 + (lat * 1000 % 90);

    // Draw a line from the last point to the new point
    if (positionHistory.length > 1) {
        const prev = positionHistory[positionHistory.length - 2];
        const prevX = 50 + (prev.lng * 1000 % 90);
        const prevY = 50 + (prev.lat * 1000 % 90);

        const line = document.createElement('div');
        line.className = 'route-line';
        line.style.position = 'absolute';
        line.style.left = `${prevX}%`;
        line.style.top = `${prevY}%`;
        line.style.width = '2px';
        line.style.height = '2px';
        line.style.background = '#2563eb';
        line.style.borderRadius = '2px';
        line.style.transform = `translate(-50%, -50%) scaleX(${Math.hypot(x - prevX, y - prevY) / 2}) rotate(${Math.atan2(y - prevY, x - prevX)}rad)`;
        line.style.transformOrigin = '0 0';
        mapContainer.appendChild(line);
    }

    // Create a new point for the path
    const point = document.createElement('div');
    point.className = 'path-point';
    point.style.left = `${x}%`;
    point.style.top = `${y}%`;
    mapContainer.appendChild(point);
}
        
        // Save ride to history
        function saveRide() {
            const ride = {
                id: Date.now(),
                date: new Date().toISOString(),
                distance: totalDistance,
                duration: new Date() - startTime - pausedTime,
                avgSpeed: totalDistance / ((new Date() - startTime - pausedTime) / 3600000),
                maxSpeed: maxSpeed,
                calories: calculateCalories(totalDistance, new Date() - startTime - pausedTime),
                route: positionHistory.slice() // Save the route
            };
            
            // Get existing history or initialize empty array
            const history = JSON.parse(localStorage.getItem('rideHistory') || '[]');
            
            // Add new ride to beginning of array
            history.unshift(ride);
            
            // Keep only last 20 rides
            if (history.length > 20) {
                history.pop();
            }
            
            // Save back to localStorage
            localStorage.setItem('rideHistory', JSON.stringify(history));
            
            // Update history display
            loadRideHistory();
        }
        
        // Load ride history from storage
        function loadRideHistory() {
            const history = JSON.parse(localStorage.getItem('rideHistory') || '[]');
            
            if (history.length === 0) {
                historyList.innerHTML = '<div class="text-center py-4 text-gray-500 dark:text-gray-400"><p>No ride history yet</p></div>';
                return;
            }
            
            historyList.innerHTML = '';
            
           history.forEach((ride, idx) => {
    const rideDate = new Date(ride.date);
    const rideElement = document.createElement('div');
    rideElement.className = 'bg-gray-100 dark:bg-gray-800 p-3 rounded-lg relative';
    rideElement.innerHTML = `
        <button class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs delete-ride-btn" data-idx="${idx}" title="Delete Ride">
            <i class="fas fa-trash"></i>
        </button>
        <div class="flex justify-between items-start">
            <div>
                <h3 class="font-semibold">${formatDate(ride.date)}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">${formatTime(ride.duration)}</p>
            </div>
            <span class="bg-primary-light dark:bg-primary-dark text-white text-xs px-2 py-1 rounded-full">${ride.distance.toFixed(1)} km</span>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
            <div>
                <span class="text-gray-500 dark:text-gray-400">Avg Speed:</span>
                <p>${ride.avgSpeed.toFixed(1)} km/h</p>
            </div>
            <div>
                <span class="text-gray-500 dark:text-gray-400">Max Speed:</span>
                <p>${ride.maxSpeed.toFixed(1)} km/h</p>
            </div>
        </div>
        <div class="mt-2 text-sm">
            <span class="text-gray-500 dark:text-gray-400">Calories burned:</span>
            <p>${ride.calories}</p>
        </div>
    `;
        historyList.appendChild(rideElement);
  });
  //show route on history
function showRouteOnMap(route) {
    clearMap();
    if (!route || route.length === 0) return;
    mapPlaceholder.style.display = 'none';
    for (let i = 0; i < route.length; i++) {
        const lat = route[i].lat;
        const lng = route[i].lng;
        // Convert lat/lng to pixel coordinates (simulated)
        const x = 50 + (lng * 1000 % 90);
        const y = 50 + (lat * 1000 % 90);

        // Draw line to next point
        if (i > 0) {
            const prev = route[i - 1];
            const prevX = 50 + (prev.lng * 1000 % 90);
            const prevY = 50 + (prev.lat * 1000 % 90);

            const line = document.createElement('div');
            line.className = 'route-line';
            line.style.position = 'absolute';
            line.style.left = `${prevX}%`;
            line.style.top = `${prevY}%`;
            line.style.width = '2px';
            line.style.height = '2px';
            line.style.background = '#2563eb';
            line.style.borderRadius = '2px';
            line.style.transform = `translate(-50%, -50%) scaleX(${Math.hypot(x - prevX, y - prevY) / 2}) rotate(${Math.atan2(y - prevY, x - prevX)}rad)`;
            line.style.transformOrigin = '0 0';
            mapContainer.appendChild(line);
        }

        // Draw point
        const point = document.createElement('div');
        point.className = 'path-point';
        point.style.left = `${x}%`;
        point.style.top = `${y}%`;
        mapContainer.appendChild(point);
    }
}
    // Add event listeners for delete buttons
      document.querySelectorAll('.delete-ride-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
        const idx = parseInt(this.getAttribute('data-idx'));
        deleteRide(idx);
     });
         });
        }
        // Delete ride from history
        function deleteRide(idx) {
    let history = JSON.parse(localStorage.getItem('rideHistory') || '[]');
    history.splice(idx, 1);
    localStorage.setItem('rideHistory', JSON.stringify(history));
    loadRideHistory();
  }

  //clear all rides from history
       const clearHistoryBtn = document.getElementById('clear-history');
        if (clearHistoryBtn) {
          clearHistoryBtn.addEventListener('click', function() {
               if (confirm('Are you sure you want to delete all ride history?')) {
            localStorage.removeItem('rideHistory');
            loadRideHistory();
           }
      });
   }
     
        // Speak text using speech synthesis
        function speak(text) {
            if (!voiceEnabled || !speechSynth) return;
            
            // Cancel any ongoing speech
            speechSynth.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = voiceVolume;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            speechSynth.speak(utterance);
        }
        
        // Toggle voice guidance
        function toggleVoice() {
            voiceEnabled = !voiceEnabled;
            
            if (voiceEnabled) {
                voiceBtn.classList.add('active');
                voiceGuidanceCheckbox.checked = true;
                speak("Voice guidance enabled");
            } else {
                voiceBtn.classList.remove('active');
                voiceGuidanceCheckbox.checked = false;
                speechSynth.cancel();
            }
        }
        
        // Event listeners
        startBtn.addEventListener('click', startTracking);
        pauseBtn.addEventListener('click', function() {
            if (isPaused) {
                startTracking();
            } else {
                pauseTracking();
            }
        });
        endBtn.addEventListener('click', endTracking);
        
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });
        
        historyBtn.addEventListener('click', () => {
            historyPanel.classList.remove('history-hidden');
        });
        
        closeHistoryBtn.addEventListener('click', () => {
            historyPanel.classList.add('history-hidden');
        });
        
        deviceTypeSelect.addEventListener('change', applyDeviceOptimizations);
        
        themeToggle.addEventListener('change', function() {
            if (this.checked) {
                enableDarkMode();
            } else {
                enableLightMode();
            }
        });
        
        voiceBtn.addEventListener('click', toggleVoice);
        
        voiceGuidanceCheckbox.addEventListener('change', function() {
            voiceEnabled = this.checked;
            if (voiceEnabled) {
                voiceBtn.classList.add('active');
            } else {
                voiceBtn.classList.remove('active');
                speechSynth.cancel();
            }
        });
        
        voiceVolumeSlider.addEventListener('input', function() {
            voiceVolume = parseFloat(this.value);
        });
        
        testVoiceBtn.addEventListener('click', function() {
            speak("This is a test of the voice guidance system");
        });
        
        // Initialize the app
        initApp();
