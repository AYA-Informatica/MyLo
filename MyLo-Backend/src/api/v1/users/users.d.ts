import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface UserInterface {
  id: string;
  name?: string;
  username?: string;
  email: string;
  address?: string;
  registrationNumber?: number;
  password: string;
  roleId: string;
  isActive: boolean;
  googleId?: string;
  provider?: 'local' | 'google';
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: null;
}

type CreateCitizenInterface = Omit<UserInterface, 'id' | 'createdAt' | 'deletedAt'>;
type CreateOrganizationInterface = Omit<
  UserInterface,
  'id' | 'username' | 'createdAt' | 'deletedAt'
>;

type UpdateCitizenInterface = Partial<CreateCitizenInterface>;
type UpdateOrganizationInterface = Partial<CreateOrganizationInterface>;
type UpdateUserInterface = Partial<Omit<UserInterface, 'id' | 'createdAt' | 'password'>>;

type UpdateCitizenInterface = Partial<CreateCitizenInterface>;
type UpdateOrganizationInterface = Partial<CreateOrganizationfaceInterface>;
interface GetAllUsers {
  users: UserInterface[];
}

interface UserRequestInterface extends IRequestUser {
  body: UpdateUserInterface;
  params: {
    id: string;
  };
}

interface UpdateUserRequestInterface extends IRequestUser {
  body: UpdateUserInterface;
  params: {
    id: string;
  };
}

export {
  UserInterface,
  CreateCitizenInterface,
  CreateOrganizationInterface,
  UpdateCitizenInterface,
  UpdateOrganizationInterface,
  UpdateUserInterface,
  GetAllUsers,
  UserRequestInterface,
  UpdateUserRequestInterface,
};
