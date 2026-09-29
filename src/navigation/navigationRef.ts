import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigateToNotifications() {
  if (navigationRef.isReady()) {
    try {
      // First try nested navigation to Customer -> Notifications
      navigationRef.navigate('Customer', {
        screen: 'Notifications',
      });
    } catch {
      try {
        navigationRef.navigate('Notifications');
      } catch (err) {
        console.warn('Failed to navigate to Notifications:', err);
      }
    }
  }
}
