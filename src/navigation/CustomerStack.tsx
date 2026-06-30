import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { CustomerTabs } from './CustomerTabs';
import GardenDetailScreen from '../screens/gardens/GardenDetailScreen';
import IoTMonitoringScreen from '../screens/customer/IoTMonitoringScreen';
import CareServicesScreen from '../screens/customer/CareServicesScreen';
import PaymentHistoryScreen from '../screens/customer/PaymentHistoryScreen';
import CustomerDashboardScreen from '../screens/customer/CustomerDashboardScreen';
import type { CustomerStackParamList } from './types';

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export function CustomerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.green[700],
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="GardenDetail" component={GardenDetailScreen} options={{ title: 'Chi tiết ô vườn' }} />
      <Stack.Screen name="IoTMonitoring" component={IoTMonitoringScreen} options={{ title: 'Giám sát IoT' }} />
      <Stack.Screen name="CareServices" component={CareServicesScreen} options={{ title: 'Dịch vụ chăm sóc' }} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Lịch sử thanh toán' }} />
      <Stack.Screen name="CustomerDashboard" component={CustomerDashboardScreen} options={{ title: 'Dashboard' }} />
    </Stack.Navigator>
  );
}
