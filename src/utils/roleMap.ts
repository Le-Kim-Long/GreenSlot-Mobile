export type BackendRole =
  | 'ROLE_ADMIN'
  | 'ROLE_MANAGER'
  | 'ROLE_LOCATION_MANAGER'
  | 'ROLE_GARDEN_STAFF'
  | 'ROLE_CUSTOMER';

export type FrontendRole =
  | 'admin'
  | 'manager'
  | 'location_manager'
  | 'garden_staff'
  | 'customer';

const ROLE_PRIORITY: BackendRole[] = [
  'ROLE_ADMIN',
  'ROLE_MANAGER',
  'ROLE_LOCATION_MANAGER',
  'ROLE_GARDEN_STAFF',
  'ROLE_CUSTOMER',
];

export function mapBackendRolesToFrontend(roles: string[] | undefined): FrontendRole {
  if (!roles?.length) return 'customer';

  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) {
      switch (role) {
        case 'ROLE_ADMIN': return 'admin';
        case 'ROLE_MANAGER': return 'manager';
        case 'ROLE_LOCATION_MANAGER': return 'location_manager';
        case 'ROLE_GARDEN_STAFF': return 'garden_staff';
        default: return 'customer';
      }
    }
  }
  return 'customer';
}

export function roleLabel(role: FrontendRole | string): string {
  const labels: Record<string, string> = {
    admin: 'Quản trị viên',
    manager: 'Quản lý kinh doanh',
    location_manager: 'Quản lý cơ sở',
    garden_staff: 'Nhân viên vườn',
    customer: 'Khách hàng',
  };
  return labels[role] || role;
}

export function isCustomerRole(role: FrontendRole): boolean {
  return role === 'customer';
}

export function isGardenStaffRole(role: FrontendRole): boolean {
  return role === 'garden_staff';
}

export function isStaffRole(role: FrontendRole): boolean {
  return role === 'manager' || role === 'location_manager' || role === 'admin';
}
