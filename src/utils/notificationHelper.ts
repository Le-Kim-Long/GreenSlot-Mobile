/**
 * notificationHelper.ts
 *
 * In Expo Go (SDK 53+), native FCM push tokens are not available without a
 * development build. This module generates a stable mock device token per
 * device for development so the backend does not warn about missing tokens.
 *
 * When the app is run as a development or production build with google-services.json
 * configured, replace this stub with real expo-notifications logic.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { notificationApi } from '../api/notificationApi';

/**
 * Generates a stable unique ID for this device.
 * Uses expo-device properties; falls back to a random string if unavailable.
 */
function generateMockDeviceToken(): string {
  const brand = Device.brand ?? 'unknown';
  const model = Device.modelName ?? 'unknown';
  const os = Platform.OS;
  const osVersion = Platform.Version;
  // Combine into a stable token string
  return `mock_${os}_${brand}_${model}_${osVersion}`.replace(/\s+/g, '_').toLowerCase();
}

/**
 * Register device for push notifications.
 * In Expo Go: registers a mock token to the backend so the backend does not
 * warn about missing device tokens. The mock token cannot receive real pushes,
 * but in-app notifications still work via the /api/notifications endpoint.
 *
 * Returns the token string if successful, or null on failure.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const token = generateMockDeviceToken();
    await notificationApi.registerDeviceToken(token);
    console.log('[Notifications] Device token registered:', token);
    return token;
  } catch (err) {
    console.warn('[Notifications] Failed to register device token:', err);
    return null;
  }
}

/**
 * Set up notification listeners.
 * No-op in Expo Go. Returns a cleanup function.
 */
export function setupNotificationListeners(
  _onNotificationReceived?: (notification: unknown) => void,
  _onNotificationResponse?: (response: unknown) => void
): () => void {
  return () => {};
}

