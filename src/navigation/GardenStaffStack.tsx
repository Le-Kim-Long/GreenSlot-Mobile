import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CheckSquare, Calendar, Droplets, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import GardenStaffDashboardScreen from '../screens/garden-staff/GardenStaffDashboardScreen';
import GardenStaffAccountScreen from '../screens/garden-staff/GardenStaffAccountScreen';
import IoTMonitoringScreen from '../screens/customer/IoTMonitoringScreen';
import IoTDetailScreen from '@/screens/customer/IoTDetailScreen';
import type { GardenStaffTabParamList, GardenStaffStackParamList } from './types';
import GardenStaffAlertScreen from '@/screens/garden-staff/GardenStaffAlertScreen';
import GardenStaffAlertProcessScreen from '../screens/garden-staff/GardenStaffAlertProcessScreen';
import IoTOperationsScreen from '../screens/staff/IoTOperationsScreen';
import StaffMyScheduleScreen from '../screens/garden-staff/StaffMyScheduleScreen';
import GardenStaffPumpControlScreen from '../screens/garden-staff/GardenStaffPumpControlScreen';
import GardenStaffHarvestHistoryScreen from '../screens/garden-staff/GardenStaffHarvestHistoryScreen';
import GardenStaffCameraScreen from '../screens/garden-staff/GardenStaffCameraScreen';

const Tab = createBottomTabNavigator<GardenStaffTabParamList>();
const Stack = createNativeStackNavigator<GardenStaffStackParamList>();

function GardenStaffTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green[600],
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.gray[200],
          backgroundColor: '#fff',
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen
        name="GardenStaffDashboard"
        component={GardenStaffDashboardScreen}
        options={{
          tabBarLabel: 'Nhiệm vụ',
          tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="StaffMySchedule"
        component={StaffMyScheduleScreen}
        options={{
          tabBarLabel: 'Lịch trực',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="GardenStaffPumpControl"
        component={GardenStaffPumpControlScreen}
        options={{
          tabBarLabel: 'Máy bơm',
          tabBarIcon: ({ color, size }) => <Droplets color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={GardenStaffAccountScreen}
        options={{
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

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
        name="GardenStaffTabs"
        component={GardenStaffTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IoTMonitoring"
        component={IoTMonitoringScreen}
        options={{ title: 'Giám sát chỉ số IoT' }}
      />
      <Stack.Screen
        name="IoTDetail"
        component={IoTDetailScreen}
        options={{ title: 'Chi tiết cảm biến' }}
      />
      <Stack.Screen
        name="GardenStaffAlert"
        component={GardenStaffAlertScreen}
        options={{ title: 'Khắc phục sự cố IoT', headerShown: true }}
      />
      <Stack.Screen
        name="GardenStaffAlertProcess"
        component={GardenStaffAlertProcessScreen}
        options={{ title: 'Xử lý cảnh báo', headerShown: false }}
      />
      <Stack.Screen name="IoTOperations" component={IoTOperationsScreen} options={{ title: 'Vận hành IoT' }} />
      <Stack.Screen
        name="StaffMySchedule"
        component={StaffMyScheduleScreen}
        options={{ title: 'Lịch trực của tôi', headerShown: true }}
      />
      <Stack.Screen
        name="GardenStaffPumpControl"
        component={GardenStaffPumpControlScreen}
        options={{ title: 'Điều khiển máy bơm' }}
      />
      <Stack.Screen
        name="GardenStaffHarvestHistory"
        component={GardenStaffHarvestHistoryScreen}
        options={{ title: 'Lịch sử thu hoạch' }}
      />
      <Stack.Screen
        name="GardenStaffCamera"
        component={GardenStaffCameraScreen}
        options={{ title: 'Camera giám sát' }}
      />
    </Stack.Navigator>
  );
}
