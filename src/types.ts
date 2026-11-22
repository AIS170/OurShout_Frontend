// SLT = Senior Leadership Team. They see the same Reports page as an admin, and nothing else of admin.
export type Role = 'EMPLOYEE' | 'SLT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
/** Who may open Reports: 'ALL' = admins and SLT (everything), 'TEAM' = a manager (their own team). */
export type ReportsAccess = 'ALL' | 'TEAM' | null;

export interface Persona {
  personaId: string;
  label: string;
  description: string;
  expected: 'OK' | 'ACCOUNT_SUSPENDED' | 'NOT_ACTIVE_EMPLOYEE' | 'GUEST_NOT_ALLOWED' | 'WRONG_TENANT';
  email: string;
  employeeId: string;
  name: string;
  roles?: string[];
}

export interface Me {
  employeeId: string;
  name: string;
  email: string;
  jobTitle: string;
  teamId: string;
  teamName: string;
  country: string;
  role: Role;
  status: UserStatus;
  points: number;
  avatarUrl?: string | null;
  reportsAccess?: ReportsAccess;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

