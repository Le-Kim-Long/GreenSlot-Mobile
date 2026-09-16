import apiClient from './client';

export type PumpStatus = 'ON' | 'OFF';

export interface PumpStatusPayload {
  status: 'ON' | 'OFF';
  autoMode?: boolean;
  lastTriggerReason?: string;
  lastTriggerTime?: string;
}

export interface PillarPumpInfo {
  pillarId: number;
  pillarCode: string;
  capacityHoles?: number;
  pillarType?: string;
  pillarTypeName?: string;
  treeName?: string | null;
  pumpStatus: 'ON' | 'OFF';
  autoMode?: boolean;
  lastTriggerReason?: string;
  lastTriggerTime?: string;
}

export interface AssignedSlotPumps {
  slotId: number;
  slotNumber: string;
  area?: number;
  locationId?: number;
  locationName?: string;
  treeName?: string;
  pillars: PillarPumpInfo[];
}

export const pumpApi = {
  getStatus: () => apiClient.get('/iot/pump/status').then(r => r.data),
  setStatus: (status: PumpStatus) => apiClient.post('/iot/pump/status', { status }).then(r => r.data),
  setAutoMode: (enabled: boolean) => apiClient.put(`/iot/pump/auto-mode?enabled=${enabled}`).then(r => r.data),

  getPumpStatus: (): Promise<PumpStatusPayload> =>
    apiClient.get<PumpStatusPayload>('/iot/pump/status').then(r => r.data),

  updatePumpStatus: (data: Partial<PumpStatusPayload>): Promise<PumpStatusPayload> =>
    apiClient.post<PumpStatusPayload>('/iot/pump/status', data).then(r => r.data),

  getMyAssignedPumps: (): Promise<AssignedSlotPumps[]> =>
    apiClient.get<AssignedSlotPumps[]>('/iot/pump/my-assigned-pumps').then(r => r.data),

  setPillarPumpStatus: (pillarId: number, status: 'ON' | 'OFF'): Promise<PumpStatusPayload> =>
    apiClient.post<PumpStatusPayload>(`/iot/pump/pillars/${pillarId}/status`, { status }).then(r => r.data),

  setPillarAutoMode: (pillarId: number, enabled: boolean): Promise<PumpStatusPayload> =>
    apiClient.put<PumpStatusPayload>(`/iot/pump/pillars/${pillarId}/auto-mode?enabled=${enabled}`).then(r => r.data),

  triggerSlotAllPumps: (slotId: number): Promise<{ message: string; count: number }> =>
    apiClient.post<{ message: string; count: number }>(`/iot/pump/slots/${slotId}/trigger-all`).then(r => r.data),

  turnOffSlotAllPumps: (slotId: number): Promise<{ message: string; count: number }> =>
    apiClient.post<{ message: string; count: number }>(`/iot/pump/slots/${slotId}/turn-off-all`).then(r => r.data),
};
