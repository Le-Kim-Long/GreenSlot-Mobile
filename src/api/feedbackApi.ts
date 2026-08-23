import apiClient from './client';

export const feedbackApi = {
  submitCustomerFeedback: (data: unknown) => apiClient.post('/customer-feedback', data).then(r => r.data),
  getMyCustomerFeedback: () => apiClient.get('/customer-feedback/my-feedback').then(r => r.data),
  getPublicCustomerFeedback: () => apiClient.get('/customer-feedback/public').then(r => r.data),
  getCustomerFeedbackByCategory: (category: string) => apiClient.get(`/customer-feedback/category/${category}`).then(r => r.data),
  submitServiceFeedback: (data: unknown) => apiClient.post('/service-feedback', data).then(r => r.data),
  getMyServiceFeedback: () => apiClient.get('/service-feedback/my-feedback').then(r => r.data),
  getTaskFeedback: (taskId: number) => apiClient.get(`/service-feedback/task/${taskId}`).then(r => r.data),
  getTaskAverage: (taskId: number) => apiClient.get(`/service-feedback/task/${taskId}/average-rating`).then(r => r.data),
  submitStaffRating: (data: unknown) => apiClient.post('/staff-ratings', data).then(r => r.data),
  getMyStaffRatings: () => apiClient.get('/staff-ratings/my-ratings').then(r => r.data),
  getStaffRatings: (staffId: number) => apiClient.get(`/staff-ratings/staff/${staffId}`).then(r => r.data),
  getStaffAverage: (staffId: number) => apiClient.get(`/staff-ratings/staff/${staffId}/average-rating`).then(r => r.data),
};
