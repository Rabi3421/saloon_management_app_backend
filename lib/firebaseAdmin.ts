import admin from "firebase-admin";

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

function hasFirebaseCredentials() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      getPrivateKey()
  );
}

export function getFirebaseAdminApp() {
  if (!hasFirebaseCredentials()) {
    return null;
  }

  if (admin.apps.length > 0) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey(),
    }),
  });
}

export async function sendPushToTokens(input: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  const app = getFirebaseAdminApp();

  if (!app || input.tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  return admin.messaging(app).sendEachForMulticast({
    tokens: input.tokens,
    notification: {
      title: input.title,
      body: input.body,
    },
    data: input.data,
    android: {
      priority: "high",
      notification: {
        channelId: "saloon-updates",
        priority: "high",
        defaultSound: true,
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  });
}