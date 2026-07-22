export type UserRole = 'customer' | 'garden_staff' | 'location_manager' | 'manager' | 'admin' | 'ROLE_CUSTOMER' | 'ROLE_GARDEN_STAFF' | 'ROLE_LOCATION_MANAGER' | 'ROLE_MANAGER' | 'ROLE_ADMIN';

export interface User {
  id: string | number;
  name?: string;
  username?: string;
  fullName?: string;
  email: string;
  phone?: string;
  address?: string;
  role?: UserRole;
  roles?: string[];
  enabled?: boolean;
  createdAt?: string;
}

export interface ProfileResponseDTO {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  roles: string[];
}

export interface UserProfileUpdateDTO {
  fullName?: string;
  phone?: string;
  address?: string;
}

export interface MessageResponseDTO {
  message: string;
}

export interface JwtResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface AvailableSlotResponseDTO {
  id: number;
  slotNumber: string;
  price: number;
  status: string;
  pillarCode: string;
  locationName: string;
  imageUrl?: string;
}

export interface BookingRequestDTO {
  slotId: number;
  durationInMonths: number;
  startTime: string;
}

export interface BookingResponseDTO {
  rentalId: number;
  paymentUrl: string;
  vnpTxnRef: string;
}

export interface ExtensionRequestDTO {
  rentalId: number;
  durationInMonths: number;
}

export interface PaymentTransactionInfo {
  id: number;
  amount: number;
  vnpTxnRef: string;
  paymentDate: string;
  status: string;
}

export interface RentalHistoryDTO {
  rentalId: number;
  slotNumber: string;
  pillarCode?: string;
  locationName?: string;
  locationAddress?: string;
  startTime: string;
  endTime: string;
  rentalStatus: string;
  transactions: PaymentTransactionInfo[];
}

export interface ServiceRequestDTO {
  slotId: number;
  serviceTypeId: number;
  description?: string;
}

export interface TaskAssignmentDTO {
  taskId?: number;
  staffId: number;
  slotId?: number;
  taskType?: string;
  taskName?: string;
  description?: string;
}

export interface TaskStatusUpdateDTO {
  status: string;
  evidenceImageUrl?: string;
  note?: string;
}

export interface IssueReportRequestDTO {
  issueType: string;
  description: string;
  imageUrl?: string;
}

export interface GardeningTaskResponseDTO {
  id: number;
  taskName: string;
  description?: string;
  status: string;
  evidenceImageUrl?: string;
  taskType: string;
  assignedStaffId?: number;
  assignedStaffName?: string;
  targetSlotId?: number;
  targetSlotNumber?: string;
  createdAt: string;
}

export interface SensorReadingResponseDTO {
  id: number;
  deviceId: string;
  sensorType: string;
  sensorDescription: string;
  value: number;
  unit: string;
  recordedAt: string;
}

export interface SensorTypeInfoDTO {
  name: string;
  code: string;
  unit: string;
  description: string;
}

export interface SensorThreshold {
  id?: number;
  deviceId: string;
  sensorType: string;
  minValue: number;
  maxValue: number;
  unit?: string;
}

export interface AlertDTO {
  id: number;
  alertType: string;
  severity: string;
  message: string;
  status: string;
  pillarId?: number;
  pillarCode?: string;
  deviceId?: string;
  sensorType?: string;
  readingValue?: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface AlertProcessingRequestDTO {
  alertId: number;
  actionTaken: string;
  note?: string;
}

export interface AlertProcessingLogDTO {
  id: number;
  alertId: number;
  actionTaken: string;
  note?: string;
  processedBy: string;
  processedAt: string;
}

export interface EquipmentDTO {
  id?: number;
  name: string;
  equipmentType: string;
  status: string;
  pillarId?: number;
  pillarCode?: string;
  lastMaintenanceDate?: string;
  notes?: string;
}

export interface NotificationResponseDTO {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface StaffScheduleDTO {
  id?: number;
  staffId: number;
  staffName?: string;
  locationId: number;
  locationName?: string;
  workDate: string;
  shift: string;
  notes?: string;
}

export interface TreeDTO {
  id?: number;
  name: string;
  speciesName: string;
  description?: string;
  idealTempMin?: number;
  idealTempMax?: number;
  idealHumidityMin?: number;
  idealHumidityMax?: number;
  idealLightMin?: number;
  idealLightMax?: number;
  idealSoilMoistureMin?: number;
  idealSoilMoistureMax?: number;
  active?: boolean;
}

export interface TreePlantingRequestCreateDTO {
  slotId: number;
  treeId: number;
  notes?: string;
}

export interface TreePlantingRequestDTO {
  id: number;
  slotId: number;
  slotNumber: string;
  treeId: number;
  treeName: string;
  userName: string;
  status: string;
  notes?: string;
  rejectReason?: string;
  requestedAt: string;
  approvedAt?: string;
  completedAt?: string;
}

export interface LocationDTO {
  id?: number;
  name: string;
  address: string;
  description?: string;
  active?: boolean;
}

export interface PillarDTO {
  id?: number;
  pillarCode: string;
  locationId: number;
  locationName?: string;
  cameraStreamUrl?: string;
  active?: boolean;
}

export interface GardenSlotDTO {
  id?: number;
  slotNumber: string;
  pillarId: number;
  pillarCode?: string;
  price: number;
  status?: string;
  imageUrl?: string;
}

export interface ServiceCategoryDTO {
  id?: number;
  name: string;
  description?: string;
}

export interface ServiceTypeDTO {
  id?: number;
  name: string;
  description?: string;
  price: number;
  serviceCategoryId: number;
  serviceCategoryName?: string;
}

export interface ActiveRentalDTO {
  rentalId: number;
  slotNumber: string;
  customerName: string;
  locationName: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface DashboardMetricsDTO {
  locationId: number;
  locationName: string;
  activeRentals: number;
  pendingAlerts: number;
  activeRentalsList?: ActiveRentalDTO[];
  recentAlerts?: AlertDTO[];
}

export interface RevenueAnalyticsResponseDTO {
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  periodStart: string;
  periodEnd: string;
}

export interface RevenueByLocationDTO {
  locationId: number;
  locationName: string;
  revenue: number;
  rentalCount: number;
}

export interface TransactionDeclarationDTO {
  transactionId: number;
  vnpTxnRef: string;
  amount: number;
  paymentDate: string;
  customerName: string;
  rentalId: number;
  status: string;
}

export interface UserAdminDTO {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  roles: string[];
  enabled: boolean;
}

export interface UserAuthorityUpdateDTO {
  roles: string[];
}

export interface UserStatusUpdateDTO {
  enabled: boolean;
}

export interface AuditLogDTO {
  id: number;
  username: string;
  action: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface GlobalContentDTO {
  id?: number;
  title: string;
  content: string;
  contentType: string;
  active: boolean;
  createdAt?: string;
}

// Backward-compatibility type aliases
export type AvailableSlotDTO = AvailableSlotResponseDTO;

export interface BookingHistory {
  id: number;
  slotId?: number;
  slotNumber: string;
  pillarCode?: string;
  locationName?: string;
  locationAddress?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  totalPrice: number;
  status: string;
  paymentStatus?: string;
  transactions: PaymentTransactionInfo[];
}

export type ServiceType = ServiceTypeDTO;
export type SensorReading = SensorReadingResponseDTO;
export type SensorTypeInfo = SensorTypeInfoDTO;
export type GardeningTask = GardeningTaskResponseDTO;
export type ServiceRequest = ServiceRequestDTO;
export type BookingRequest = BookingRequestDTO;
export type BookingResponse = BookingResponseDTO;
export type ExtensionRequest = ExtensionRequestDTO;

