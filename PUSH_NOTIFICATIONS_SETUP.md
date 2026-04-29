# Push Notifications Setup

The backend notification pipeline is now ready for persisted notifications and FCM delivery.

## What is already implemented

- Booking create/status/payment notifications for customers and salon owners
- Chat message notifications for customers and salon owners
- Promotion notifications for salon customers
- Device push token registration endpoint: `POST /api/user/push-tokens`
- Stored in-app notifications via `Notification` documents
- FCM delivery via Firebase Admin when backend env vars are present

## Backend env vars

Add these to `saloon_backend/.env.local`:

```bash
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Mobile app requirements for real drawer notifications

These files are required in the React Native app before native push can work:

### Android

Place your Firebase Android config at:

- `saloon/android/app/google-services.json`

### iOS

Place your Firebase iOS config at:

- `saloon/ios/saloon/GoogleService-Info.plist`

Also enable these capabilities in Xcode for the `saloon` target:

- Push Notifications
- Background Modes → Remote notifications

## Notes

- Without the Firebase backend env vars, notifications are still saved in the app's notifications list, but push delivery is skipped.
- Without the Android/iOS Firebase config files, the app cannot register real mobile push tokens for drawer notifications.
- Once those config files are added, the next step is wiring native token registration in the React Native app.
