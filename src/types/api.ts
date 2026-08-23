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

export interface PillarDetail {
  id: number;
  pillarCode: string;
  status: string;
  pillarType?: string;
  pillarTypeName?: string;
  capacityHoles?: number;
  price?: number;
  requiredArea?: number;
  defaultTreeId?: number;
  defaultTreeName?: string;
  defaultTreePrice?: number;
  defaultTreeImageUrl?: string;
  cameraStreamUrl?: string;
  cameraStatus?: string;
  locationId?: number;
  locationName?: string;
  slotId?: number;
  slotNumber?: string;
  isRented?: boolean;
  isAvailable?: boolean;
}

export type PillarInfo = PillarDetail;

export interface AvailableSlotResponseDTO {
  id: number;
  slotNumber: string;
  price: number;
  area?: number;
  maxPillars?: number;
  status: string;
  pillarCode: string;
  pillarCodes?: string[];
  pillarCount?: number;
  locationName: string;
  locationId?: number;
  locationAddress?: string;
  imageUrl?: string;
  pillars?: PillarDetail[];
  totalHoles?: number;
  calculatedPillarsPrice?: number;
  calculatedTreesPrice?: number;
}

export interface BookingRequestDTO {
  slotId: number;
  durationInMonths: number;
  startTime: string;
  treeId?: number;
  treeIds?: number[];
  pillarIds?: number[];
  smallPillarsCount?: number;
  mediumPillarsCount?: number;
  largePillarsCount?: number;
  isMobile?: boolean;
  mobileRedirectUrl?: string;
}

export interface BookingResponseDTO {
  rentalId: number;
  paymentUrl: string;
  vnpTxnRef: string;
}

export interface ExtensionRequestDTO {
  rentalId: number;
  durationInMonths: number;
  isMobile?: boolean;
  mobileRedirectUrl?: string;
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
  slotId?: number;
  slotNumber: string;
  pillarCode?: string;
  pillarCodes?: string[];
  pillars?: PillarDetail[];
  locationName?: string;
  locationAddress?: string;
  startTime: string;
  endTime: string;
  rentalStatus: string;
  treeId?: number;
  treeName?: string;
  cropStatus?: string;
  transactions: PaymentTransactionInfo[];
}

export interface HarvestHistoryItem {
  id: number;
  rentalId: number;
  locationId?: number;
  locationName?: string;
  slotId?: number;
  slotNumber?: string;
  treeId?: number;
  treeName?: string;
  customerId?: number;
  customerName?: string;
  harvestMethod: 'SELF' | 'STAFF';
  staffId?: number;
  staffName?: string;
  plantedAt?: string;
  harvestedAt: string;
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
  rejectionReason?: string;
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
  severity?: string;
  message?: string;
  description?: string;
  status: string;
  thresholdValue?: number;
  actualValue?: number;
  pillarId?: number;
  pillarCode?: string;
  gardenSlotId?: number;
  slotNumber?: string;
  treeId?: number;
  treeName?: string;
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
  equipmentName: string;
  serialNumber: string;
  description?: string;
  status: string;
  pillarId?: number;
  pillarCode?: string;
  purchaseDate?: string;
  lastMaintenanceDate?: string;
  imageUrl?: string;
}

export interface NotificationResponseDTO {
  id: number;
  userId?: number;
  title: string;
  message: string;
  type: string;
  referenceId?: number | null;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface StaffScheduleDTO {
  id?: number;
  staffId: number;
  staffName?: string;
  locationId: number;
  locationName?: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
  isActive?: boolean;
}

export interface TreeDTO {
  id?: number;
  treeName: string;
  scientificName: string;
  description?: string;
  harvestDays?: number;
  growthDurationDays?: number;
  minRentalDays?: number;
  price?: number;
  imageUrl?: string;
  soilMoistureMin?: number;
  soilMoistureMax?: number;
  lightMin?: number;
  lightMax?: number;
  phMin?: number;
  phMax?: number;
  compensationPercentage?: number;
  careInstructions?: string;
  isActive?: boolean;
}

export interface TreePlantingRequestCreateDTO {
  rentalId: number;
  newTreeId: number;
  targetPillarId?: number;
  reason: string;
  notes?: string;
}

export interface TreePlantingRequestDTO {
  id: number;
  rentalId: number;
  slotId?: number;            // alias used in older mapping
  slotNumber: string;
  targetPillarId?: number;
  targetPillarCode?: string;
  newTreeId: number;
  newTreeName: string;
  treeName?: string;          // alias for newTreeName (mobile display)
  requestedById: number;
  requestedByName: string;
  userName?: string;          // alias for requestedByName (mobile display)
  status: string;
  reason: string;
  notes?: string;
  price?: number;
  paymentUrl?: string;
  rejectReason?: string;      // populated by backend when status=REJECTED
  requestedAt: string;
  processedAt?: string;
  processedById?: number;
  processedByName?: string;
}

export interface LocationDTO {
  id?: number;
  name: string;
  address: string;
  contactPhone?: string;
  status?: string;
  area: number;
  imageUrl?: string;
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
  username?: string;
  fullName?: string;
  slotNumber: string;
  pillarCode?: string;
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
  totalTransactions?: number;
  successfulTransactions?: number;
  failedTransactions?: number;
  periodStart?: string;
  periodEnd?: string;
  transactions?: any[];
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

export interface AlertAnalyticsDTO {
  totalAlerts: number;
  pendingAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  alertsByType: Record<string, number>;
  alertsBySensorType: Record<string, number>;
  averageResolutionTimeMinutes: number;
  mostCommonAlertFrequency: number;
  mostCommonAlertType: string;
}

export interface CustomerLifetimeValue {
  userId: number;
  userName: string;
  userEmail: string;
  totalSpent: number;
  totalRentals: number;
  averageRentalValue: number;
  firstRentalDate: string | null;
  lastRentalDate: string | null;
  daysAsCustomer: number;
  monthlyAverageSpend: number;
  customerLifetimeValue: number;
}

// Backward-compatibility type aliases
export type AvailableSlotDTO = AvailableSlotResponseDTO;

export interface BookingHistory {
  id: number;
  slotId?: number;
  slotNumber: string;
  pillarCode?: string;
  pillarCodes?: string[];
  pillars?: PillarDetail[];
  locationName?: string;
  locationAddress?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  totalPrice: number;
  status: string;
  paymentStatus?: string;
  treeId?: number;
  treeName?: string;
  cropStatus?: string;
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


