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
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList>;
  GardenDetail: { slot: AvailableSlotDTO };
  IoTMonitoring: undefined;
  CareServices: undefined;
  PaymentHistory: undefined;
  CustomerDashboard: undefined;
};

export type GardenStaffStackParamList = {
  GardenStaffDashboard: undefined;
  TaskDetail: { taskId: number };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Customer: NavigatorScreenParams<CustomerStackParamList>;
  GardenStaff: NavigatorScreenParams<GardenStaffStackParamList>;
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
