import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { AuthStack } from './AuthStack';
import { CustomerStack } from './CustomerStack';
import { GardenStaffStack } from './GardenStaffStack';
import StaffSummaryScreen from '../screens/staff/StaffSummaryScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : user?.role === 'customer' ? (
        <Stack.Screen name="Customer" component={CustomerStack} />
      ) : user?.role === 'garden_staff' ? (
        <Stack.Screen name="GardenStaff" component={GardenStaffStack} />
      ) : (
        <Stack.Screen name="StaffSummary" component={StaffSummaryScreen} />
      )}
    </Stack.Navigator>
  );
}
