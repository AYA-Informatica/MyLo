export interface UserstableType {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  address: string | null;
  registrationNumber: number | null;
  roleId: string;
  isActive: boolean;
  profileImage?: string;
  googleId: string | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
  };
}

export interface UsersApiResponse {
  data: UserstableType[];
  message: string;
  success: boolean;
}
