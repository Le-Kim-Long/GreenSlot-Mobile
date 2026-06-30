import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import GardenStaffDashboardScreen from '../screens/garden-staff/GardenStaffDashboardScreen';
import type { GardenStaffStackParamList } from './types';

const Stack = createNativeStackNavigator<GardenStaffStackParamList>();

export function GardenStaffStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.green[700],
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="GardenStaffDashboard"
        component={GardenStaffDashboardScreen}
        options={{ title: 'Nhiệm vụ vườn' }}
      />
    </Stack.Navigator>
  );
}
