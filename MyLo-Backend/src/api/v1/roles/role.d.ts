import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface RoleInterface {
  id: string;
  name: string;
  permissions?: string[];
  createdAt: Date;
  updatedAt?: Date;
  deletedAt: null;
}

type CreateRoleInterface = Omit<RoleInterface, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
type UpdateRoleInterface = Partial<Omit<RoleInterface, 'id' | 'createdAt'>>;

interface RoleRequestInterface extends IRequestUser {
  body: CreateRoleInterface;
  params: {
    id: string;
  };
}

interface UpdateRoleRequestInterface extends IRequestUser {
  body: UpdateRoleInterface;
  params: {
    id: string;
  };
}

interface GetAllRoles {
  roles: RoleInterface[];
}

export {
  RoleInterface,
  CreateRoleInterface,
  UpdateRoleInterface,
  RoleRequestInterface,
  UpdateRoleRequestInterface,
  GetAllRoles,
};
