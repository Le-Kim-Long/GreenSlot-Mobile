import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { AvailableSlotDTO, BookingHistory } from '../types/api';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  Gardens: undefined;
  Rentals: undefined;
  Account: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: undefined;
  GardenDetail: { slot: AvailableSlotDTO };
  IoTMonitoring: undefined;
  CareServices: undefined;
  PaymentHistory: undefined;
  CustomerDashboard: undefined;
  Notifications: undefined;
};

export type GardenStaffTabParamList = {
  GardenStaffDashboard: undefined;
  TaskManagement: undefined;
  StaffList: undefined;
  Account: undefined;
};

export type GardenStaffStackParamList = {
  GardenStaffTabs: undefined;
  TaskDetail: { taskId: number };
  IoTMonitoring: undefined;
};

export type StaffTabParamList = {
  StaffDashboard: undefined;
  Account: undefined;
};

export type StaffStackParamList = {
  StaffTabs: undefined;
  LocationManagement: undefined;
  PillarManagement: undefined;
  SlotManagement: undefined;
  ServiceManagement: undefined;
  ActiveRentals: undefined;
  RevenueAnalytics: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  UserManagement: undefined;
  GlobalContent: undefined;
  AuditLog: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Customer: undefined;
  GardenStaff: undefined;
  Staff: undefined;
  Admin: undefined;
  StaffSummary: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type CustomerTabProps<T extends keyof CustomerTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, T>,
  NativeStackScreenProps<CustomerStackParamList>
>;

export type CustomerStackProps<T extends keyof CustomerStackParamList> = NativeStackScreenProps<
  CustomerStackParamList,
  T
>;

export type { BookingHistory };
