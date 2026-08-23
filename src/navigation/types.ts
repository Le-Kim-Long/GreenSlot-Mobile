import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { AvailableSlotDTO, BookingHistory, ActiveRentalDTO } from '../types/api';

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
  RentalDetail: { rental: BookingHistory };
  IoTMonitoring: undefined;
  CareServices: undefined;
  PaymentHistory: undefined;
  CustomerDashboard: undefined;
  Notifications: undefined;
  CustomerTreePlanting: undefined;
  CustomerHarvestHistory: undefined;
  PaymentResult: {
    status: 'success' | 'failed' | 'pending';
    rentalId?: number;
    slotNumber?: string;
    amount?: string;
    txnRef?: string;
    orderInfo?: string;
  };
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
  GardenStaffAlert: undefined;
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
  ActiveRentalDetail: { rental: ActiveRentalDTO };
  RevenueAnalytics: undefined;
  TreeManagement: undefined;
  EquipmentManagement: undefined;
  StaffScheduleManagement: undefined;
  TreePlantingManagement: undefined;
  AlertAnalytics: undefined;
  AlertHistory: undefined;
  AlertProcessing: { alertId?: number };
  CustomerAnalytics: undefined;
};


export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminAccount: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  AdminDashboard: undefined;
  UserManagement: undefined;
  GlobalContent: undefined;
  AuditLog: undefined;
  CameraDashboard: undefined;
  AdminAccount: undefined;
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

export type GardenStaffTabProps<T extends keyof GardenStaffTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<GardenStaffTabParamList, T>,
  NativeStackScreenProps<GardenStaffStackParamList>
>;

export type GardenStaffStackProps<T extends keyof GardenStaffStackParamList> = NativeStackScreenProps<
  GardenStaffStackParamList,
  T
>;

export type StaffTabProps<T extends keyof StaffTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<StaffTabParamList, T>,
  NativeStackScreenProps<StaffStackParamList>
>;

export type StaffStackProps<T extends keyof StaffStackParamList> = NativeStackScreenProps<
  StaffStackParamList,
  T
>;

export type AdminTabProps<T extends keyof AdminTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, T>,
  NativeStackScreenProps<AdminStackParamList>
>;

export type AdminStackProps<T extends keyof AdminStackParamList> = NativeStackScreenProps<
  AdminStackParamList,
  T
>;

export type { BookingHistory, ActiveRentalDTO };
