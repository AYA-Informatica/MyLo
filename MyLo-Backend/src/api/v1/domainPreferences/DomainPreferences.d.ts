import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface DomainPreferenceInterface {
  id: string;
  userId: string;
  domainId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type CreateDomainPreferenceInterface = Omit<DomainPreferenceInterface, 'id' | 'deletedAt'>;
type UpdateDomainPreferenceInterface = Partial<Omit<DomainPreferenceInterface, 'id' | 'createdAt'>>;

interface DomainPreferenceRequestInterface extends IRequestUser {
  body: CreateDomainPreferenceInterface;
  params: {
    id: string;
  };
}

interface UpdateDomainPreferenceRequestInterface extends IRequestUser {
  body: UpdateDomainPreferenceInterface;
  params: {
    id: string;
  };
}

interface GetAllDomainPreferences {
  preferences: DomainPreferenceInterface[];
}

export {
  DomainPreferenceInterface,
  CreateDomainPreferenceInterface,
  UpdateDomainPreferenceInterface,
  DomainPreferenceRequestInterface,
  UpdateDomainPreferenceRequestInterface,
  GetAllDomainPreferences,
};