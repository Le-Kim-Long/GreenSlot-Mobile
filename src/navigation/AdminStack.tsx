import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, User } from 'lucide-react-native';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import GlobalContentScreen from '../screens/admin/GlobalContentScreen';
import AdminAccountScreen from '../screens/admin/AdminAccountScreen';
import { colors } from '../theme/colors';
import type { AdminStackParamList, AdminTabParamList } from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6D28D9',
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.gray[200],
          backgroundColor: '#fff',
        },
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Tổng quan',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AdminAccount"
        component={AdminAccountScreen}
        options={{
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AdminTabs">
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen name="GlobalContent" component={GlobalContentScreen} />
      <Stack.Screen name="AdminAccount" component={AdminAccountScreen} />
    </Stack.Navigator>
  );
}
