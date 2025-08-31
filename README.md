# CycleTracker Pro - Advanced Cycling Tracker

A fully responsive cycling tracking application optimized for both mobile devices and smartwatches, with special considerations for low GPS performance.

![CycleTracker Pro](https://img.shields.io/badge/CycleTracker-Pro-brightgreen) ![Responsive Design](https://img.shields.io/badge/Design-Responsive-blue) ![GPS Optimized](https://img.shields.io/badge/GPS-Optimized-yellow)

## Features

### 🚴‍♂️ Core Functionality
- Real-time cycling activity tracking
- Distance, speed, duration, and calorie calculations
- GPS tracking with multiple accuracy modes
- Auto-pause when stopped
- Ride history storage and review

### 🎨 User Experience
- Light/dark theme switching
- Voice guidance with volume control
- Responsive design for all screen sizes
- Touch-friendly interface elements
- Battery saver mode

### 📱 Device Support
- Optimized for mobile phones
- Smartwatch compatibility
- Low GPS mode for weak signal areas
- Cross-device synchronization

## Getting Started

### Prerequisites
- Modern web browser with Geolocation API support
- GPS-enabled device (phone or smartwatch)
- Internet connection for initial load

### Installation
1. Clone or download this repository
2. Open `index.html` in your mobile browser
3. Grant location permissions when prompted
4. Start tracking your cycling activities!

### Usage
1. **Start a Ride**: Click the "Start Ride" button to begin tracking
2. **During Ride**: View real-time stats on distance, speed, and calories
3. **Pause/Resume**: Use the pause button to temporarily stop tracking
4. **End Ride**: Click "End Ride" to save your session to history
5. **Review History**: Access past rides through the history panel
6. **Customize Settings**: Adjust GPS mode, voice guidance, and theme preferences

## Technical Details

### GPS Optimization
The application includes three GPS modes:
- **High Accuracy**: Best precision (uses more battery)
- **Balanced**: Good precision with moderate battery use
- **Low Power**: Reduced precision for weak GPS devices (default)

### Voice Guidance
Enable voice announcements for:
- Ride start/stop notifications
- Distance milestones
- Speed alerts
- Customizable volume levels

### Data Storage
Ride data is stored locally in your browser using:
- localStorage for ride history
- Session management for active rides
- Settings persistence across sessions

## Browser Compatibility

| Browser | GPS Support | Voice Support | Theme Support |
|---------|-------------|---------------|---------------|
| Chrome Mobile | ✅ | ✅ | ✅ |
| Safari iOS | ✅ | ✅ | ✅ |
| Samsung Internet | ✅ | ✅ | ✅ |
| Firefox Mobile | ✅ | ✅ | ✅ |

## Performance Tips

1. Use Low Power GPS mode on devices with weak GPS signals
2. Enable Battery Saver mode for longer tracking sessions
3. Disable voice guidance if not needed to conserve battery
4. Close other apps running in the background while tracking

## Contributing

We welcome contributions to CycleTracker Pro! Please feel free to:

1. Fork the project
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Areas for Improvement
- Integration with popular fitness APIs
- Export ride data to GPX/TCX formats
- Social sharing features
- Advanced metrics and charts

## Support

If you encounter any issues or have questions:

1. Check browser compatibility
2. Ensure location services are enabled
3. Verify GPS signal strength
4. Contact support through GitHub issues

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Icons by Font Awesome
- Styling with Tailwind CSS
- GPS functionality using browser Geolocation API
- Voice synthesis using Web Speech API

---

**Happy Cycling!** 🚴‍♀️
