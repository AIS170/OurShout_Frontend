export type Role = 'EMPLOYEE' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

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
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

