import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface SpecialtyInterface {
  id: string;
  firmId: string;
  domainId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type CreateSpecialtyInterface = Omit<SpecialtyInterface, 'id' | 'deletedAt'>;
type UpdateSpecialtyInterface = Partial<Omit<SpecialtyInterface, 'id' | 'createdAt'>>;

interface SpecialtyRequestInterface extends IRequestUser {
  body: CreateSpecialtyInterface;
  params: {
    id: string;
  };
}

interface UpdateSpecialtyRequestInterface extends IRequestUser {
  body: UpdateSpecialtyInterface;
  params: {
    id: string;
  };
}

interface GetAllSpecialties {
  specialties: SpecialtyInterface[];
}

export {
  SpecialtyInterface,
  CreateSpecialtyInterface,
  UpdateSpecialtyInterface,
  SpecialtyRequestInterface,
  UpdateSpecialtyRequestInterface,
  GetAllSpecialties,
};