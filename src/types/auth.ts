export interface User {
  id: string;
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
  user?: Omit<User, 'passwordHash'>;
}

export interface JwtPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}
