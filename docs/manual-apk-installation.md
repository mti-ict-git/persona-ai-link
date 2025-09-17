# Manual APK Installation Guide (No ADB Required)

## Quick Start - Debug the JSON Parsing Error

### Step 1: Transfer APK to Your Device

**Option A: USB Transfer**
1. Connect your Android device to computer via USB
2. Copy the APK file: `android/app/build/outputs/apk/debug/app-debug.apk`
3. Paste it to your device's Downloads folder

**Option B: Cloud/Email Transfer**
1. Upload APK to Google Drive, Dropbox, or email it to yourself
2. Download on your Android device

### Step 2: Enable Unknown Sources

**Android 8.0+ (Most devices):**
1. Go to Settings > Apps & notifications
2. Tap "Special app access" or "Advanced"
3. Tap "Install unknown apps"
4. Select your file manager or browser
5. Toggle "Allow from this source"

**Older Android versions:**
1. Go to Settings > Security
2. Enable "Unknown sources"

### Step 3: Install the APK

1. Open your file manager app
2. Navigate to Downloads (or where you saved the APK)
3. Tap on `app-debug.apk`
4. Tap "Install" when prompted
5. Wait for installation to complete
6. Tap "Open" or find "Persona AI Link" in your app drawer

### Step 4: Enable Chrome DevTools Debugging

**On your computer:**
1. Open Google Chrome browser
2. Type in address bar: `chrome://inspect/#devices`
3. Make sure "Discover USB devices" is checked
4. Connect your Android device via USB (if not already connected)

**On your Android device:**
1. Go to Settings > About phone
2. Tap "Build number" 7 times to enable Developer options
3. Go back to Settings > Developer options
4. Enable "USB debugging"
5. When prompted, allow USB debugging from your computer

### Step 5: Debug the JSON Error

1. **Open the app** on your Android device
2. **In Chrome on your computer**, you should see your device listed at `chrome://inspect`
3. **Click "Inspect"** next to "Persona AI Link" or the WebView
4. **Chrome DevTools will open** - this is where you'll see the error logs
5. **In DevTools, click the "Console" tab**
6. **Try to reproduce the JSON error** in the app
7. **Watch the console** for detailed error messages like:
   ```
   RetrievedTextTooltip: JSON parse failed: {
     error: "Unexpected token...",
     dataType: "string",
     dataLength: 1234,
     sampleData: "The problematic data..."
   }
   ```

### Step 6: Check Network Issues

1. **In Chrome DevTools, click the "Network" tab**
2. **Reproduce the error** in the app
3. **Look for failed requests** (red entries)
4. **Click on any failed request** to see:
   - Response status
   - Response headers
   - Response body (might be malformed JSON)

### What to Look For

**Console Errors:**
- `JSON parse failed` messages with sample data
- `API request failed` with endpoint details
- JavaScript errors or exceptions

**Network Issues:**
- 500/400 error responses
- Malformed JSON in response body
- Missing Content-Type headers
- Timeout errors

### Troubleshooting

**If Chrome DevTools doesn't detect your device:**
1. Try a different USB cable
2. Enable "File Transfer" mode on your device
3. Restart both Chrome and your device
4. Try `chrome://inspect` in an incognito window

**If the app crashes immediately:**
1. Check if you have the correct APK (debug version)
2. Clear app data: Settings > Apps > Persona AI Link > Storage > Clear Data
3. Restart your device

**If you can't enable Developer Options:**
1. Some devices require different steps
2. Try searching "[Your device model] enable developer options"
3. Some corporate devices may have this disabled

### Alternative: Device Log Viewers

If Chrome DevTools doesn't work:

1. **Install a log viewer app** from Play Store:
   - "aLogcat" (free)
   - "Log Viewer" (free)
   - "Logcat Reader" (free)

2. **Grant permissions** when prompted

3. **Filter logs** by package name: `com.merdekabattery.personaai`

4. **Look for error messages** containing:
   - "JSON"
   - "parse"
   - "SyntaxError"
   - "Unexpected token"

### Next Steps

Once you capture the error details:
1. **Screenshot or copy the exact error message**
2. **Note which screen/action triggers the error**
3. **Check if it happens consistently or randomly**
4. **Share the error details** for further investigation

The enhanced logging will show exactly what data is causing the JSON parsing to fail, making it much easier to fix the issue.