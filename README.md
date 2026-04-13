# Google Nearby Demo

This Expo app demonstrates a simple nearby peer-to-peer flow using `expo-nearby-connections`.

The app has two tabs:

- `Main Node`: advertises the device, accepts an incoming request, and shows the shared chat log.
- `Other Node`: discovers nearby main nodes, requests a connection, and sends messages after the request is accepted.

## Important constraints

- Test on two physical devices.
- Use the same platform on both devices. Android-to-iOS is not supported by the library.
- Use a development build. This native module is not available in Expo Go.
- The web build renders, but nearby discovery and messaging are intentionally unavailable there.

## Setup

1. Install dependencies.

```bash
bun install
```

2. Generate native projects after config changes.

```bash
npx expo prebuild
```

3. Run a development build on the target platform.

```bash
npx expo run:android
```

```bash
npx expo run:ios
```

## Demo flow

1. Open `Main Node` on the first device.
2. Tap `Start main node` and grant the requested permissions.
3. Open `Other Node` on the second device.
4. Tap `Start scanning`, wait for the first device to appear, then tap `Connect`.
5. Accept the invitation on the first device.
6. Send custom text messages from either side.

## Native configuration included

- `expo-nearby-connections` plugin with Bonjour and local-network iOS configuration.
- `react-native-permissions` plugin for iOS Bluetooth permission support.
- Runtime Bluetooth, location, and nearby-device permission requests in the app.
