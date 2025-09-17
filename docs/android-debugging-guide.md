# Android App Debugging Guide

## JSON Parsing Error Investigation

### Current Status
- **WebView Debugging**: Enabled in `capacitor.config.ts`
- **Enhanced Logging**: Added to all JSON parsing components
- **Fresh APK**: Built with debugging features

### How to Debug the JSON Parsing Error

#### 1. Install the Debug APK

**If ADB is not available or not working:**

**Method A: Manual Installation (Recommended)**
1. Copy the APK file to your device:
   - File location: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Transfer via USB, email, cloud storage, or file sharing app
2. On your Android device:
   - Enable "Install from unknown sources" in Settings > Security
   - Navigate to the APK file using a file manager
   - Tap the APK file and follow installation prompts

**Method B: ADB Installation (if available)**
```bash
# First, check if ADB is installed and device is connected
adb devices

# If device is listed, install the APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**ADB Troubleshooting:**
- **ADB not found**: Install Android SDK Platform Tools
- **Device not detected**: Enable USB Debugging in Developer Options
- **Unauthorized device**: Accept the USB debugging prompt on your device
- **Permission denied**: Run command prompt as administrator (Windows)

#### 2. Enable WebView Debugging on Device
1. Open the app on your Android device
2. On your computer, open Chrome browser
3. Navigate to `chrome://inspect/#devices`
4. Your device should appear with the app's WebView
5. Click "Inspect" to open Chrome DevTools

#### 3. Monitor Console Logs
The enhanced logging will show:

**API Request Logs:**
```javascript
// Look for these in console:
"API request failed: {
  url: 'http://your-api/endpoint',
  method: 'POST',
  error: 'Error message',
  response: 'Response data'
}"
```

**JSON Parsing Logs:**
```javascript
// Successful parsing:
"RetrievedTextTooltip: JSON parse successful: { parsedType: 'object', isArray: true }"

// Failed parsing:
"RetrievedTextTooltip: JSON parse failed: {
  error: 'Unexpected token...',
  dataType: 'string',
  dataLength: 1234,
  sampleData: 'First 200 characters of malformed data...'
}"
```

#### 4. Check Network Tab
1. In Chrome DevTools, go to Network tab
2. Reproduce the error
3. Check API responses for:
   - Malformed JSON
   - Unexpected content types
   - Network errors
   - Incomplete responses

#### 5. Common Issues to Look For

**Malformed JSON Response:**
- Extra characters before/after JSON
- Unescaped quotes in strings
- Trailing commas
- Mixed content types

**Network Issues:**
- Timeout errors
- Connection failures
- CORS issues
- SSL certificate problems

**WebView Specific:**
- Different JavaScript engine behavior
- Memory constraints
- Cache issues

#### 6. Alternative Debugging Methods

**Without ADB - Device-Only Debugging:**

**Method A: Chrome DevTools (Primary)**
1. Install the debug APK manually on your device
2. Open Chrome browser on your computer
3. Navigate to `chrome://inspect/#devices`
4. Your device should appear automatically
5. Click "Inspect" next to your app

**Method B: Device Log Viewers (if Chrome DevTools doesn't work)**
1. Install a log viewer app from Play Store (e.g., "aLogcat", "Log Viewer")
2. Grant necessary permissions
3. Filter logs by your app package: `com.merdekabattery.personaai`
4. Look for JavaScript errors and JSON parsing failures

**Method C: Device Developer Options**
1. Enable "USB Debugging" (for Chrome DevTools)
2. Enable "Show layout bounds" (visual debugging)
3. Enable "Don't keep activities" (test memory issues)
4. Enable "Show CPU usage" (performance monitoring)

**With ADB - Advanced Debugging:**
```bash
# View all logs
adb logcat

# Filter for your app
adb logcat | grep "com.merdekabattery.personaai"

# Filter for errors only
adb logcat *:E

# Filter for JavaScript errors
adb logcat | grep -i "javascript\|json\|parse"
```

### Next Steps

1. **Install the debug APK** on your device
2. **Open Chrome DevTools** via `chrome://inspect`
3. **Reproduce the JSON error** while monitoring console
4. **Document the exact error** with:
   - Error message
   - API endpoint
   - Response data sample
   - Network status

### Expected Debugging Output

When the error occurs, you should see detailed logs like:

```
RetrievedTextTooltip: Attempting to parse JSON: {
  dataType: "string",
  dataLength: 1456,
  firstChars: "[{\"content\": \"Some text...",
  lastChars: "...more text\"}]"
}

RetrievedTextTooltip: JSON parse failed: {
  error: "Unexpected token 'u' at position 234",
  dataType: "string",
  dataLength: 1456,
  sampleData: "The problematic data causing the parse error..."
}
```

This will pinpoint exactly what data is causing the JSON parsing to fail.