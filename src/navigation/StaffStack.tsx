import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, MapPin, User } from 'lucide-react-native';
import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
import LocationManagementScreen from '../screens/staff/LocationManagementScreen';
import PillarManagementScreen from '../screens/staff/PillarManagementScreen';
import SlotManagementScreen from '../screens/staff/SlotManagementScreen';
import ServiceManagementScreen from '../screens/staff/ServiceManagementScreen';
import ActiveRentalsScreen from '../screens/staff/ActiveRentalsScreen';
import ActiveRentalDetailScreen from '../screens/staff/ActiveRentalDetailScreen';
import RevenueAnalyticsScreen from '../screens/staff/RevenueAnalyticsScreen';
import TreeManagementScreen from '../screens/staff/TreeManagementScreen';
import EquipmentManagementScreen from '../screens/staff/EquipmentManagementScreen';
import StaffScheduleManagementScreen from '../screens/staff/StaffScheduleManagementScreen';
import TreePlantingManagementScreen from '../screens/staff/TreePlantingManagementScreen';
import AlertAnalyticsScreen from '../screens/staff/AlertAnalyticsScreen';
import AlertHistoryScreen from '../screens/staff/AlertHistoryScreen';
import AlertProcessingScreen from '../screens/staff/AlertProcessingScreen';
import CustomerAnalyticsScreen from '../screens/staff/CustomerAnalyticsScreen';
import AccountScreen from '../screens/customer/AccountScreen';
import { colors } from '../theme/colors';
import type { StaffTabParamList, StaffStackParamList } from './types';

const Tab = createBottomTabNavigator<StaffTabParamList>();
const Stack = createNativeStackNavigator<StaffStackParamList>();

function StaffTabNavigator() {
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
        name="StaffDashboard"
        component={StaffDashboardScreen}
        options={{
          tabBarLabel: 'Tổng quan',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
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

export function StaffStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffTabs" component={StaffTabNavigator} />
      <Stack.Screen name="LocationManagement" component={LocationManagementScreen} />
      <Stack.Screen name="PillarManagement" component={PillarManagementScreen} />
      <Stack.Screen name="SlotManagement" component={SlotManagementScreen} />
      <Stack.Screen name="ServiceManagement" component={ServiceManagementScreen} />
      <Stack.Screen name="ActiveRentals" component={ActiveRentalsScreen} />
      <Stack.Screen name="ActiveRentalDetail" component={ActiveRentalDetailScreen} />
      <Stack.Screen name="RevenueAnalytics" component={RevenueAnalyticsScreen} />
      <Stack.Screen name="TreeManagement" component={TreeManagementScreen} />
      <Stack.Screen name="EquipmentManagement" component={EquipmentManagementScreen} />
      <Stack.Screen name="StaffScheduleManagement" component={StaffScheduleManagementScreen} />
      <Stack.Screen name="TreePlantingManagement" component={TreePlantingManagementScreen} />
      <Stack.Screen name="AlertAnalytics" component={AlertAnalyticsScreen} />
      <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} />
      <Stack.Screen name="AlertProcessing" component={AlertProcessingScreen} />
      <Stack.Screen name="CustomerAnalytics" component={CustomerAnalyticsScreen} />
    </Stack.Navigator>
  );
}

