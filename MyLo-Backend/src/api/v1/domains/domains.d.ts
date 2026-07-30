import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface DomainInterface {
  id: string;
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type CreateDomainInterface = Omit<DomainInterface, 'id' | 'deletedAt'>;
type UpdateDomainInterface = Partial<Omit<DomainInterface, 'id' | 'createdAt'>>;

interface DomainRequestInterface extends IRequestUser {
  body: CreateDomainInterface;
  params: {
    id: string;
  };
}

interface UpdateDomainRequestInterface extends IRequestUser {
  body: UpdateDomainInterface;
  params: {
    id: string;
  };
}

interface GetAllDomains {
  domains: DomainInterface[];
}

export {
  DomainInterface,
  CreateDomainInterface,
  UpdateDomainInterface,
  DomainRequestInterface,
  UpdateDomainRequestInterface,
  GetAllDomains,
};
