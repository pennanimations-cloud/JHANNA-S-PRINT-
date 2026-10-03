# Tagasulat Android / PWA

This is the Android-friendly version of Tagasulat.

## Easiest way to use it
The PWA needs to be served over HTTPS for Chrome's "Install app" feature.

1. Put this folder on any HTTPS web host.
2. Open `index.html` in Chrome on Android through that HTTPS address.
3. Chrome menu -> **Add to Home screen** / **Install app**.
4. Tagasulat will launch like an app and keep its local data on the phone.

## Offline behavior
After the PWA is installed and loaded once, its interface is cached for offline use. Buyer/order data is stored in browser localStorage on the phone.

## Important
This version does not yet automatically read TikTok LIVE pins. The TikTok connector remains separated from the order engine so an approved integration can be added later.

## Android APK
The same UI can be wrapped as an APK with Capacitor or a native Android WebView. An Android SDK/Gradle toolchain is not installed in this build environment, so an APK binary is not being falsely presented as already compiled.
