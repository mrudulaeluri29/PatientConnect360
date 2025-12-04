# MediHealth Mobile App

Mobile application for MediHealth built with React Native and Expo.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (install globally: `npm install -g expo-cli` or use npx)
- For iOS: Xcode (macOS only)
- For Android: Android Studio
- Expo Go app on your device (for testing)

## Installation

1. **Navigate to the mobile directory:**
   ```bash
   cd /Users/navignareddy/Downloads/PatientConnect360/Client/mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Running the App

### Option 1: Using Expo Go (Recommended for Development)

1. **Start the development server:**
   ```bash
   npm start
   ```
   or
   ```bash
   npx expo start
   ```

2. **Run on your device:**
   - Install Expo Go app on your iOS/Android device
   - Scan the QR code shown in the terminal with:
     - **iOS**: Camera app
     - **Android**: Expo Go app

3. **Run on simulator/emulator:**
   - **iOS Simulator (macOS only):**
     ```bash
     npm run ios
     ```
   - **Android Emulator:**
     ```bash
     npm run android
     ```

### Option 2: Using Web (for quick testing)

```bash
npm run web
```

This will open the app in your browser (limited React Native features).

## Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── DashboardScreen.tsx
│   ├── navigation/       # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── api/              # API calls
│   │   └── auth.ts
│   ├── auth/             # Authentication context
│   ├── lib/              # Utilities
│   │   └── axios.ts
│   └── styles/           # Shared styles
│       ├── colors.ts
│       └── spacing.ts
├── App.tsx               # Main app component
├── index.js              # Entry point
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript configuration
```

## Configuration

### API URL

Update the API URL in `src/lib/axios.ts`:

```typescript
const API_URL = __DEV__ 
  ? 'http://localhost:4000' // Development
  : 'https://api.medihealth.com'; // Production
```

**Note:** For testing on a physical device, replace `localhost` with your computer's IP address:
```typescript
const API_URL = 'http://192.168.1.XXX:4000';
```

### Backend Server

Make sure the backend server is running on `http://localhost:4000` (or update the URL in `axios.ts`).

## Troubleshooting

### Port Already in Use
If port 19000 or 8081 is already in use:
```bash
# Kill the process using the port
lsof -ti:19000 | xargs kill -9
```

### Metro Bundler Issues
```bash
# Clear cache and restart
npx expo start -c
```

### Android Emulator Not Starting
- Make sure Android Studio is installed
- Create an Android Virtual Device (AVD) in Android Studio
- Start the emulator before running `npm run android`

### iOS Simulator Not Starting
- Make sure Xcode is installed (macOS only)
- Install Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

### Network Issues (Physical Device)
- Make sure your device and computer are on the same WiFi network
- Update API URL to use your computer's IP address instead of `localhost`
- Check firewall settings

### tsconfig.json Errors
- If you see errors about missing types, run `npm install` first
- The tsconfig.json is now configured to work without Expo base config

## Development Tips

1. **Hot Reload**: Changes will automatically reload in the app
2. **Debugging**: Shake your device or press `Cmd+D` (iOS) / `Cmd+M` (Android) to open developer menu
3. **Console Logs**: Check terminal for console.log output
4. **Errors**: Check the terminal and device screen for error messages

## Next Steps
 
- [ ] Install dependencies: `npm install`
- [ ] Test on physical device
- [ ] Implement Register screen
- [ ] Implement Dashboard screens (role-specific)
- [ ] Implement Forgot Password flow
- [ ] Add authentication context
- [ ] Add token storage (AsyncStorage)
- [ ] Implement API integration
- [ ] Add error handling
- [ ] Add loading states
- [ ] Test on physical devices

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)

