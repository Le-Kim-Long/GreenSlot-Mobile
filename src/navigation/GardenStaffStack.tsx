import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CheckSquare, ClipboardList, Users, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import GardenStaffDashboardScreen from '../screens/garden-staff/GardenStaffDashboardScreen';
import TaskManagementScreen from '../screens/staff/TaskManagementScreen';
import StaffListScreen from '../screens/staff/StaffListScreen';
import AccountScreen from '../screens/customer/AccountScreen';
import IoTMonitoringScreen from '../screens/customer/IoTMonitoringScreen';
import type { GardenStaffTabParamList, GardenStaffStackParamList } from './types';
import GardenStaffAlertScreen from '@/screens/garden-staff/GardenStaffAlertScreen';

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
        name="TaskManagement"
        component={TaskManagementScreen}
        options={{
          tabBarLabel: 'Giao việc',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="StaffList"
        component={StaffListScreen}
        options={{
          tabBarLabel: 'Nhân viên',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
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
        name="GardenStaffAlert"
        component={GardenStaffAlertScreen}
        options={{ title: 'Khắc phục sự cố IoT' }}
      />
    </Stack.Navigator>
  );
}
