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

interface GetAllRoles {
  roles: RoleInterface[];
}
