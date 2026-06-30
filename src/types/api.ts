export type UserRole = 'customer' | 'garden_staff' | 'location_manager' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
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

export interface AvailableSlotDTO {
  id: number;
  slotNumber: string;
  price: number;
  status: string;
  pillarCode: string;
  locationName: string;
}

export interface BookingRequest {
  slotId: number;
  durationInMonths: number;
  startTime: string;
}

export interface BookingResponse {
  rentalId: number;
  paymentUrl: string;
  vnpTxnRef: string;
}

export interface ExtensionRequest {
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

export interface ServiceRequest {
  slotId: number;
  serviceTypeId: number;
  description?: string;
}

export interface ServiceType {
  id: number;
  name: string;
  description?: string;
  price: number;
  serviceCategoryId?: number;
}

export interface GardeningTask {
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

export interface SensorReading {
  id: number;
  deviceId: string;
  sensorType: string;
  sensorDescription: string;
  value: number;
  unit: string;
  recordedAt: string;
}

export interface SensorTypeInfo {
  name: string;
  code: string;
  unit: string;
  description: string;
}
