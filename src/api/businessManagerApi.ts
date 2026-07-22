import apiClient from './client';
import type {
  ActiveRentalDTO,
  GardenSlotDTO,
  LocationDTO,
  MessageResponseDTO,
  PillarDTO,
  RevenueAnalyticsResponseDTO,
  RevenueByLocationDTO,
  ServiceCategoryDTO,
  ServiceTypeDTO,
  TransactionDeclarationDTO,
  UserAdminDTO,
} from '../types/api';

export const businessManagerApi = {
  // Locations
  getAllLocations: (): Promise<LocationDTO[]> =>
    apiClient.get('/manager/locations').then(r => r.data),

  getLocationById: (id: number): Promise<LocationDTO> =>
    apiClient.get(`/manager/locations/${id}`).then(r => r.data),

  createLocation: (data: LocationDTO): Promise<LocationDTO> =>
    apiClient.post('/manager/locations', data).then(r => r.data),

  updateLocation: (id: number, data: LocationDTO): Promise<LocationDTO> =>
    apiClient.put(`/manager/locations/${id}`, data).then(r => r.data),

  deleteLocation: (id: number): Promise<MessageResponseDTO> =>
    apiClient.delete(`/manager/locations/${id}`).then(r => r.data),

  // Pillars
  getAllPillars: (): Promise<PillarDTO[]> =>
    apiClient.get('/manager/pillars').then(r => r.data),

  getPillarById: (id: number): Promise<PillarDTO> =>
    apiClient.get(`/manager/pillars/${id}`).then(r => r.data),

  createPillar: (data: PillarDTO): Promise<PillarDTO> =>
    apiClient.post('/manager/pillars', data).then(r => r.data),

  updatePillar: (id: number, data: PillarDTO): Promise<PillarDTO> =>
    apiClient.put(`/manager/pillars/${id}`, data).then(r => r.data),

  deletePillar: (id: number): Promise<MessageResponseDTO> =>
    apiClient.delete(`/manager/pillars/${id}`).then(r => r.data),

  // Garden Slots
  getAllSlots: (): Promise<GardenSlotDTO[]> =>
    apiClient.get('/manager/slots').then(r => r.data),

  getSlotById: (id: number): Promise<GardenSlotDTO> =>
    apiClient.get(`/manager/slots/${id}`).then(r => r.data),

  createSlot: (data: GardenSlotDTO): Promise<GardenSlotDTO> =>
    apiClient.post('/manager/slots', data).then(r => r.data),

  updateSlot: (id: number, data: GardenSlotDTO): Promise<GardenSlotDTO> =>
    apiClient.put(`/manager/slots/${id}`, data).then(r => r.data),

  deleteSlot: (id: number): Promise<MessageResponseDTO> =>
    apiClient.delete(`/manager/slots/${id}`).then(r => r.data),

  // Service Categories
  getAllCategories: (): Promise<ServiceCategoryDTO[]> =>
    apiClient.get('/manager/service-categories').then(r => r.data),

  getCategoryById: (id: number): Promise<ServiceCategoryDTO> =>
    apiClient.get(`/manager/service-categories/${id}`).then(r => r.data),

  createCategory: (data: ServiceCategoryDTO): Promise<ServiceCategoryDTO> =>
    apiClient.post('/manager/service-categories', data).then(r => r.data),

  updateCategory: (id: number, data: ServiceCategoryDTO): Promise<ServiceCategoryDTO> =>
    apiClient.put(`/manager/service-categories/${id}`, data).then(r => r.data),

  deleteCategory: (id: number): Promise<void> =>
    apiClient.delete(`/manager/service-categories/${id}`).then(r => r.data),

  // Service Types
  getAllServiceTypes: (): Promise<ServiceTypeDTO[]> =>
    apiClient.get('/manager/service-types').then(r => r.data),

  getServiceTypeById: (id: number): Promise<ServiceTypeDTO> =>
    apiClient.get(`/manager/service-types/${id}`).then(r => r.data),

  createServiceType: (data: ServiceTypeDTO): Promise<ServiceTypeDTO> =>
    apiClient.post('/manager/service-types', data).then(r => r.data),

  updateServiceType: (id: number, data: ServiceTypeDTO): Promise<ServiceTypeDTO> =>
    apiClient.put(`/manager/service-types/${id}`, data).then(r => r.data),

  deleteServiceType: (id: number): Promise<void> =>
    apiClient.delete(`/manager/service-types/${id}`).then(r => r.data),

  // Analytics & Operational
  getActiveRentals: (): Promise<ActiveRentalDTO[]> =>
    apiClient.get('/manager/active-rentals').then(r => r.data),

  getRevenueAnalytics: (startDate: string, endDate: string): Promise<RevenueAnalyticsResponseDTO> =>
    apiClient.get('/manager/analytics/revenue', { params: { startDate, endDate } }).then(r => r.data),

  getRevenueByLocation: (startDate: string, endDate: string): Promise<RevenueByLocationDTO[]> =>
    apiClient.get('/manager/analytics/revenue-by-location', { params: { startDate, endDate } }).then(r => r.data),

  getTransactionDeclarations: (startDate: string, endDate: string): Promise<TransactionDeclarationDTO[]> =>
    apiClient.get('/manager/transactions/declarations', { params: { startDate, endDate } }).then(r => r.data),

  getGardenStaffsByLocation: (locationId: number): Promise<UserAdminDTO[]> =>
    apiClient.get('/manager/staffs', { params: { locationId } }).then(r => r.data),
};
