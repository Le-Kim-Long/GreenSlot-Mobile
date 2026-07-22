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
import RevenueAnalyticsScreen from '../screens/staff/RevenueAnalyticsScreen';
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
      <Stack.Screen name="RevenueAnalytics" component={RevenueAnalyticsScreen} />
    </Stack.Navigator>
  );
}
