import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import GlobalContentScreen from '../screens/admin/GlobalContentScreen';
import AuditLogScreen from '../screens/admin/AuditLogScreen';
import type { AdminStackParamList } from './types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AdminDashboard">
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen name="GlobalContent" component={GlobalContentScreen} />
      <Stack.Screen name="AuditLog" component={AuditLogScreen} />
    </Stack.Navigator>
  );
}

